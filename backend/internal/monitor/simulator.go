package monitor

import (
	"context"
	"math/rand"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// StartSimulator drives live-looking metrics until real agents report in.
// Every 5s it random-walks each server's CPU/memory/network, appends to the
// metrics history, and refreshes the probe reachability matrix (~every 30s).
func StartSimulator(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		reachCounter := 0
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				tickMetrics()
				reachCounter++
				if reachCounter%6 == 0 { // every ~30s
					tickReachability()
				}
			}
		}
	}()
}

// walk nudges v by ±step, clamped to [min, max]
func walk(v, step, min, max float64) float64 {
	v += (rand.Float64()*2 - 1) * step
	if v < min {
		v = min
	}
	if v > max {
		v = max
	}
	return v
}

func tickMetrics() {
	store := database.GetStore()
	metrics := database.GetMetricsStore()
	now := time.Now()

	for _, srv := range store.GetAllServers() {
		if srv.Status == "offline" {
			continue
		}
		// Real agents report their own metrics; don't overwrite them.
		if srv.AgentConnected {
			continue
		}
		srv.CPU = walk(srv.CPU, 6, 2, 99)
		srv.Memory = walk(srv.Memory, 3, 5, 97)
		srv.Disk = walk(srv.Disk, 0.2, 1, 99)
		srv.NetworkIn = walk(srv.NetworkIn, 60, 1, 2000)
		srv.NetworkOut = walk(srv.NetworkOut, 60, 1, 2000)
		srv.Uptime += 5
		srv.LastSeen = now

		metrics.Append(srv.ID, models.MetricPoint{
			Timestamp:  now,
			CPU:        srv.CPU,
			Memory:     srv.Memory,
			Disk:       srv.Disk,
			NetworkIn:  srv.NetworkIn,
			NetworkOut: srv.NetworkOut,
		})
	}
}

func tickReachability() {
	probes := database.GetProbeStore()
	servers := database.GetStore().GetAllServers()
	now := time.Now()

	for _, srv := range servers {
		for _, probe := range probes.GetProbes() {
			// Simulated geopolitics: the CN probe intermittently can't reach
			// exposed main/standalone nodes — the exact scenario the geo-aware
			// feature exists to surface. Entry nodes stay reachable.
			reachable := true
			latency := 30 + rand.Intn(180)
			if probe.Country == "CN" && (srv.Role == "main" || srv.Role == "standalone") {
				reachable = rand.Float64() > 0.5
			}
			if !reachable {
				latency = 0
			}

			probes.Record(&models.Reachability{
				ServerID:     srv.ID,
				ProbeID:      probe.ID,
				ProbeCountry: probe.Country,
				ProbeName:    probe.Name,
				Reachable:    reachable,
				LatencyMs:    latency,
				Timestamp:    now,
			})
		}
	}
}
