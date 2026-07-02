package models

import "time"

// Service is a monitored endpoint: an HTTP(S) URL, a TCP host:port, or a ping target.
type Service struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Type         string        `json:"type"`   // http, tcp, ping
	Target       string        `json:"target"` // URL for http, host:port for tcp, host for ping
	IntervalSecs int           `json:"interval_secs"`
	Status       string        `json:"status"`           // up, down, pending
	ResponseTime int           `json:"response_time_ms"` // last check
	LastCheck    time.Time     `json:"last_check"`
	LastError    string        `json:"last_error,omitempty"`
	UptimePct    float64       `json:"uptime_pct"` // over stored history
	History      []CheckResult `json:"history"`
	CreatedAt    time.Time     `json:"created_at"`
}

// CheckResult is one probe of a service.
type CheckResult struct {
	Timestamp    time.Time `json:"timestamp"`
	Up           bool      `json:"up"`
	ResponseTime int       `json:"response_time_ms"`
	StatusCode   int       `json:"status_code,omitempty"` // http only
	Error        string    `json:"error,omitempty"`
}

// CreateServiceRequest payload
type CreateServiceRequest struct {
	Name         string `json:"name" binding:"required"`
	Type         string `json:"type" binding:"required,oneof=http tcp ping"`
	Target       string `json:"target" binding:"required"`
	IntervalSecs int    `json:"interval_secs"`
}

// UpdateServiceRequest payload; zero values are left unchanged
type UpdateServiceRequest struct {
	Name         string `json:"name"`
	Type         string `json:"type" binding:"omitempty,oneof=http tcp ping"`
	Target       string `json:"target"`
	IntervalSecs int    `json:"interval_secs"`
}
