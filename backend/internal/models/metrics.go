package models

import "time"

// MetricPoint is one sample of a server's live metrics.
type MetricPoint struct {
	Timestamp  time.Time `json:"timestamp"`
	CPU        float64   `json:"cpu"`
	Memory     float64   `json:"memory"`
	Disk       float64   `json:"disk"`
	NetworkIn  float64   `json:"network_in"`
	NetworkOut float64   `json:"network_out"`
}

// Probe is a geo-distributed vantage point that tests server reachability.
type Probe struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Country  string    `json:"country"`
	Region   string    `json:"region"`
	Status   string    `json:"status"` // online, offline
	LastSeen time.Time `json:"last_seen"`
}

// Reachability is one probe's latest view of one server.
type Reachability struct {
	ServerID     string    `json:"server_id"`
	ProbeID      string    `json:"probe_id"`
	ProbeCountry string    `json:"probe_country"`
	ProbeName    string    `json:"probe_name"`
	Reachable    bool      `json:"reachable"`
	LatencyMs    int       `json:"latency_ms"`
	Timestamp    time.Time `json:"timestamp"`
}

// CreateProbeRequest payload
type CreateProbeRequest struct {
	Name    string `json:"name" binding:"required"`
	Country string `json:"country" binding:"required"`
	Region  string `json:"region"`
}
