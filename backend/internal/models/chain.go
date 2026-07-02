package models

import "time"

// RelayChain represents a multi-hop proxy chain
type RelayChain struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Hops        []Hop     `json:"hops"`
	Status      string    `json:"status"`      // healthy, degraded, down
	TotalLatency int      `json:"total_latency"` // ms
	CreatedAt   time.Time `json:"created_at"`
}

// Hop represents a single node in the chain
type Hop struct {
	Order       int     `json:"order"`        // 1, 2, 3...
	ServerID    string  `json:"server_id"`
	ServerName  string  `json:"server_name"`
	Country     string  `json:"country"`
	CountryFlag string  `json:"country_flag"`
	IP          string  `json:"ip"`
	Role        string  `json:"role"`         // entry, relay, main
	Latency     int     `json:"latency"`      // ms to next hop
	Status      string  `json:"status"`       // online, offline
	IsHidden    bool    `json:"is_hidden"`    // hidden from public
	PacketLoss  float64 `json:"packet_loss"`  // 0-100
}

// CreateChainRequest payload
type CreateChainRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	ServerIDs   []string `json:"server_ids" binding:"required,min=2"`
}