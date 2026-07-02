package monitor

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
	"github.com/sakaw/xmonitor/backend/internal/notify"
)

// StartEvaluator launches the alert-rule evaluation loop (every 30s).
func StartEvaluator(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				evaluateRules()
			}
		}
	}()
}

func evaluateRules() {
	alerts := database.GetAlertStore()
	servers := database.GetStore().GetAllServers()

	for _, rule := range alerts.GetRules() {
		if !rule.Enabled || rule.Muted {
			continue
		}
		if !rule.LastFired.IsZero() &&
			time.Since(rule.LastFired) < time.Duration(rule.Cooldown)*time.Minute {
			continue
		}

		targets := servers
		if len(rule.ServerIDs) > 0 {
			idSet := make(map[string]bool, len(rule.ServerIDs))
			for _, id := range rule.ServerIDs {
				idSet[id] = true
			}
			targets = nil
			for _, s := range servers {
				if idSet[s.ID] {
					targets = append(targets, s)
				}
			}
		}

		for _, srv := range targets {
			value, breached := checkCondition(rule, srv)
			if !breached {
				continue
			}

			message := fmt.Sprintf("Server %s (%s): %s = %.1f, threshold %.1f",
				srv.Name, srv.IP, rule.Condition, value, rule.Threshold)
			slog.Warn("alert fired", "rule", rule.Name, "server", srv.Name, "value", value)

			alerts.AddEvent(&models.AlertEvent{
				RuleID:   rule.ID,
				RuleName: rule.Name,
				ServerID: srv.ID,
				Message:  message,
				Value:    value,
			})
			alerts.MarkFired(rule.ID)

			var channels []*models.NotificationChannel
			for _, chID := range rule.Channels {
				if ch, err := alerts.GetChannelByID(chID); err == nil {
					channels = append(channels, ch)
				}
			}
			notify.SendAll(channels, "🚨 XMonitor: "+rule.Name, message)
			break // one event per rule per pass; cooldown gates the next
		}
	}

	// service_down rules look at services rather than servers
	evaluateServiceRules()
}

func checkCondition(rule *models.AlertRule, srv *models.Server) (float64, bool) {
	switch rule.Condition {
	case "cpu":
		return srv.CPU, srv.CPU > rule.Threshold
	case "memory":
		return srv.Memory, srv.Memory > rule.Threshold
	case "disk":
		return srv.Disk, srv.Disk > rule.Threshold
	case "offline_minutes":
		mins := time.Since(srv.LastSeen).Minutes()
		return mins, srv.Status == "offline" && mins > rule.Threshold
	default:
		return 0, false
	}
}

func evaluateServiceRules() {
	alerts := database.GetAlertStore()
	services := database.GetServiceStore().GetAll()

	for _, rule := range alerts.GetRules() {
		if !rule.Enabled || rule.Muted || rule.Condition != "service_down" {
			continue
		}
		if !rule.LastFired.IsZero() &&
			time.Since(rule.LastFired) < time.Duration(rule.Cooldown)*time.Minute {
			continue
		}

		for _, svc := range services {
			if svc.Status != "down" {
				continue
			}

			message := fmt.Sprintf("Service %s (%s %s) is DOWN: %s",
				svc.Name, svc.Type, svc.Target, svc.LastError)
			alerts.AddEvent(&models.AlertEvent{
				RuleID:   rule.ID,
				RuleName: rule.Name,
				ServerID: svc.ID,
				Message:  message,
			})
			alerts.MarkFired(rule.ID)

			var channels []*models.NotificationChannel
			for _, chID := range rule.Channels {
				if ch, err := alerts.GetChannelByID(chID); err == nil {
					channels = append(channels, ch)
				}
			}
			notify.SendAll(channels, "🚨 XMonitor: "+rule.Name, message)
			break
		}
	}
}
