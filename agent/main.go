// XMonitor agent — a lightweight binary that runs on a monitored server.
// It registers with the panel using a per-server secret, heartbeats live
// metrics, and executes generic tasks (run a command / write a file) that
// the panel dispatches. The same task channel later carries relay config
// deployment — the agent doesn't need to know the difference.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

const version = "0.1.0"

var (
	baseURL string
	secret  string
	client  = &http.Client{Timeout: 15 * time.Second}
)

type task struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Command     string `json:"command"`
	FilePath    string `json:"file_path"`
	FileContent string `json:"file_content"`
}

func main() {
	flag.StringVar(&baseURL, "url", env("XMONITOR_URL", ""), "panel base URL")
	flag.StringVar(&secret, "secret", env("XMONITOR_SECRET", ""), "per-server agent secret")
	interval := flag.Duration("interval", 3*time.Second, "heartbeat interval")
	flag.Parse()

	if baseURL == "" || secret == "" {
		log.Fatal("XMONITOR_URL and XMONITOR_SECRET are required")
	}

	log.Printf("XMonitor agent %s starting → %s", version, baseURL)
	register()

	// Prime the CPU counter so the first heartbeat has a real reading.
	_, _ = cpu.Percent(0, false)

	ticker := time.NewTicker(*interval)
	defer ticker.Stop()
	for range ticker.C {
		tasks, err := heartbeat()
		if err != nil {
			log.Printf("heartbeat failed: %v", err)
			continue
		}
		for _, t := range tasks {
			runTask(t)
		}
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func register() {
	hostname, _ := os.Hostname()
	body, _ := json.Marshal(map[string]string{
		"hostname": hostname,
		"os":       runtime.GOOS,
		"arch":     runtime.GOARCH,
		"version":  version,
	})
	if _, err := post("/api/v1/agent/register", body); err != nil {
		log.Printf("register failed (will retry via heartbeat): %v", err)
		return
	}
	log.Printf("registered as %s", hostname)
}

func heartbeat() ([]task, error) {
	body, _ := json.Marshal(collectMetrics())
	resp, err := post("/api/v1/agent/heartbeat", body)
	if err != nil {
		return nil, err
	}
	var parsed struct {
		Data struct {
			Tasks []task `json:"tasks"`
		} `json:"data"`
	}
	if err := json.Unmarshal(resp, &parsed); err != nil {
		return nil, err
	}
	return parsed.Data.Tasks, nil
}

func collectMetrics() map[string]interface{} {
	m := map[string]interface{}{}

	if pct, err := cpu.Percent(0, false); err == nil && len(pct) > 0 {
		m["cpu"] = round(pct[0])
	}
	if vm, err := mem.VirtualMemory(); err == nil {
		m["memory"] = round(vm.UsedPercent)
	}
	if du, err := disk.Usage("/"); err == nil {
		m["disk"] = round(du.UsedPercent)
	}
	if io, err := net.IOCounters(false); err == nil && len(io) > 0 {
		// Report cumulative counters as MB; the panel treats these as gauges.
		m["network_in"] = round(float64(io[0].BytesRecv) / 1e6)
		m["network_out"] = round(float64(io[0].BytesSent) / 1e6)
	}
	if up, err := host.Uptime(); err == nil {
		m["uptime"] = int64(up)
	}
	if procs, err := process.Pids(); err == nil {
		m["processes"] = len(procs)
	}
	if conns, err := net.Connections("all"); err == nil {
		m["connections"] = len(conns)
	}
	return m
}

func runTask(t task) {
	log.Printf("task %s: %s", t.ID, t.Type)
	result := map[string]interface{}{"status": "success", "exit_code": 0}

	switch t.Type {
	case "run_command":
		out, code, err := runCommand(t.Command)
		result["output"] = out
		result["exit_code"] = code
		if err != nil {
			result["status"] = "failed"
			result["error"] = err.Error()
		}
	case "write_file":
		if err := writeFile(t.FilePath, t.FileContent); err != nil {
			result["status"] = "failed"
			result["error"] = err.Error()
		} else {
			result["output"] = "wrote " + t.FilePath
		}
	default:
		result["status"] = "failed"
		result["error"] = "unknown task type: " + t.Type
	}

	body, _ := json.Marshal(result)
	if _, err := post("/api/v1/agent/tasks/"+t.ID+"/result", body); err != nil {
		log.Printf("reporting task %s failed: %v", t.ID, err)
	}
}

func runCommand(command string) (string, int, error) {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("cmd", "/C", command)
	} else {
		cmd = exec.Command("sh", "-c", command)
	}
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	code := 0
	if ee, ok := err.(*exec.ExitError); ok {
		code = ee.ExitCode()
	}
	return buf.String(), code, err
}

func writeFile(path, content string) error {
	if path == "" {
		return fmt.Errorf("empty file path")
	}
	if dir := filepath.Dir(path); dir != "" {
		_ = os.MkdirAll(dir, 0o755)
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

func post(path string, body []byte) ([]byte, error) {
	req, err := http.NewRequest("POST", baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Secret", secret)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(data))
	}
	return data, nil
}

func round(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}
