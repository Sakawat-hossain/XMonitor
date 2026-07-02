package models

import (
	"time"
)

// Server represents a monitored server
type Server struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	IP          string    `json:"ip"`
	Country     string    `json:"country"`        // ISO code: US, JP, CN, SG, HK
	CountryFlag string    `json:"country_flag"`   // Emoji flag
	Role        string    `json:"role"`           // entry, relay, main, standalone
	Status      string    `json:"status"`         // online, offline, warning
	CPU         float64   `json:"cpu"`            // 0-100
	Memory      float64   `json:"memory"`         // 0-100
	Disk        float64   `json:"disk"`           // 0-100
	NetworkIn   float64   `json:"network_in"`     // Mbps
	NetworkOut  float64   `json:"network_out"`    // Mbps
	Uptime      int64     `json:"uptime"`         // seconds
	LastSeen    time.Time `json:"last_seen"`
	CreatedAt   time.Time `json:"created_at"`
}

// CreateServerRequest is the payload to add a new server
type CreateServerRequest struct {
	Name    string `json:"name" binding:"required"`
	IP      string `json:"ip" binding:"required"`
	Country string `json:"country" binding:"required"`
	Role    string `json:"role" binding:"required"`
}