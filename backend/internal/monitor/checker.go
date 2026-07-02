// Package monitor runs the background probes for monitored services.
package monitor

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"strconv"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

const checkTimeout = 10 * time.Second

var httpClient = &http.Client{
	Timeout: checkTimeout,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

// StartChecker launches the service-check loop. It scans every 10s for
// services whose interval has elapsed and probes them concurrently.
func StartChecker(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		runChecks() // immediate first pass so the UI isn't empty for a minute
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runChecks()
			}
		}
	}()
}

func runChecks() {
	store := database.GetServiceStore()
	for _, svc := range store.DueServices() {
		go func(id, svcType, target string) {
			result := probe(svcType, target)
			store.RecordResult(id, result)
			if !result.Up {
				slog.Warn("service check failed", "target", target, "error", result.Error)
			}
		}(svc.ID, svc.Type, svc.Target)
	}
}

func probe(svcType, target string) models.CheckResult {
	start := time.Now()
	result := models.CheckResult{Timestamp: start}

	switch svcType {
	case "http":
		resp, err := httpClient.Get(target)
		result.ResponseTime = int(time.Since(start).Milliseconds())
		if err != nil {
			result.Error = err.Error()
			return result
		}
		defer resp.Body.Close()
		result.StatusCode = resp.StatusCode
		result.Up = resp.StatusCode < 400

	case "tcp":
		conn, err := net.DialTimeout("tcp", target, checkTimeout)
		result.ResponseTime = int(time.Since(start).Milliseconds())
		if err != nil {
			result.Error = err.Error()
			return result
		}
		conn.Close()
		result.Up = true

	case "ping":
		// System ping keeps this cross-platform without raw-socket privileges.
		result = systemPing(target)

	default:
		result.Error = "unknown service type: " + svcType
	}
	return result
}

func systemPing(host string) models.CheckResult {
	start := time.Now()
	result := models.CheckResult{Timestamp: start}

	ctx, cancel := context.WithTimeout(context.Background(), checkTimeout)
	defer cancel()

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctx, "ping", "-n", "1", "-w",
			strconv.Itoa(int(checkTimeout.Milliseconds())), host)
	} else {
		cmd = exec.CommandContext(ctx, "ping", "-c", "1", "-W",
			strconv.Itoa(int(checkTimeout.Seconds())), host)
	}

	err := cmd.Run()
	result.ResponseTime = int(time.Since(start).Milliseconds())
	if err != nil {
		result.Error = "host unreachable"
		return result
	}
	result.Up = true
	return result
}
