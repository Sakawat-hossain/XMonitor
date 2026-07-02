package models

import "time"

// AlertRule fires when a metric crosses a threshold on any targeted server.
type AlertRule struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Condition string    `json:"condition"` // cpu, memory, disk, offline_minutes, service_down
	Threshold float64   `json:"threshold"`
	ServerIDs []string  `json:"server_ids"` // empty = all servers
	Channels  []string  `json:"channel_ids"`
	Cooldown  int       `json:"cooldown_minutes"`
	Enabled   bool      `json:"enabled"`
	Muted     bool      `json:"muted"`
	LastFired time.Time `json:"last_fired"`
	CreatedAt time.Time `json:"created_at"`
}

// AlertEvent is one firing of a rule.
type AlertEvent struct {
	ID        string    `json:"id"`
	RuleID    string    `json:"rule_id"`
	RuleName  string    `json:"rule_name"`
	ServerID  string    `json:"server_id"`
	Message   string    `json:"message"`
	Value     float64   `json:"value"`
	Timestamp time.Time `json:"timestamp"`
}

// NotificationChannel is a delivery target for alerts.
// Config keys depend on Type:
//
//	telegram: bot_token, chat_id
//	discord/slack/webhook: url
//	ntfy: url (server incl. topic)
//	gotify: url, token
//	bark: url (incl. device key)
//	email: host, port, username, password, from, to
type NotificationChannel struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Type      string            `json:"type"`
	Config    map[string]string `json:"config"`
	Enabled   bool              `json:"enabled"`
	CreatedAt time.Time         `json:"created_at"`
}

// CreateAlertRuleRequest payload
type CreateAlertRuleRequest struct {
	Name      string   `json:"name" binding:"required"`
	Condition string   `json:"condition" binding:"required,oneof=cpu memory disk offline_minutes service_down"`
	Threshold float64  `json:"threshold" binding:"required"`
	ServerIDs []string `json:"server_ids"`
	Channels  []string `json:"channel_ids"`
	Cooldown  int      `json:"cooldown_minutes"`
}

// UpdateAlertRuleRequest payload (pointer fields: nil = unchanged)
type UpdateAlertRuleRequest struct {
	Name      *string   `json:"name"`
	Condition *string   `json:"condition"`
	Threshold *float64  `json:"threshold"`
	ServerIDs *[]string `json:"server_ids"`
	Channels  *[]string `json:"channel_ids"`
	Cooldown  *int      `json:"cooldown_minutes"`
	Enabled   *bool     `json:"enabled"`
	Muted     *bool     `json:"muted"`
}

// CreateChannelRequest payload
type CreateChannelRequest struct {
	Name   string            `json:"name" binding:"required"`
	Type   string            `json:"type" binding:"required,oneof=telegram discord slack webhook ntfy gotify bark email"`
	Config map[string]string `json:"config" binding:"required"`
}
