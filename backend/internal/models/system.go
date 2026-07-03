package models

import "time"

// AuditEntry records one admin action.
type AuditEntry struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Action    string    `json:"action"` // e.g. "POST /api/v1/admin/servers", "login"
	Detail    string    `json:"detail,omitempty"`
	IP        string    `json:"ip"`
	Timestamp time.Time `json:"timestamp"`
}

// APIToken grants programmatic access without a JWT.
type APIToken struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Token     string    `json:"token,omitempty"` // full value only returned at creation
	Prefix    string    `json:"prefix"`          // first 12 chars for identification
	Scope     string    `json:"scope"`           // read, full
	CreatedAt time.Time `json:"created_at"`
	LastUsed  time.Time `json:"last_used"`
}

// CreateTokenRequest payload
type CreateTokenRequest struct {
	Name  string `json:"name" binding:"required"`
	Scope string `json:"scope" binding:"required,oneof=read full"`
}

// Settings holds site-wide configuration.
type Settings struct {
	SiteName      string `json:"site_name"`
	LogoURL       string `json:"logo_url"`
	DefaultTheme  string `json:"default_theme"`  // light, dark, system
	DefaultLocale string `json:"default_locale"` // en, zh, bn, ja
}

// Backup is a full JSON export of all stores.
type Backup struct {
	Version    string                 `json:"version"`
	ExportedAt time.Time              `json:"exported_at"`
	Servers    []*Server              `json:"servers"`
	Chains     []*RelayChain          `json:"chains"`
	Services   []*Service             `json:"services"`
	AlertRules []*AlertRule           `json:"alert_rules"`
	Channels   []*NotificationChannel `json:"channels"`
	CronTasks  []*CronTask            `json:"cron_tasks"`
	Probes     []*Probe               `json:"probes"`
	Settings   *Settings              `json:"settings"`
}
