// Package notify delivers alert messages to configured notification channels.
package notify

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/smtp"
	"net/url"
	"strings"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/models"
)

var httpClient = &http.Client{Timeout: 15 * time.Second}

// Send delivers a message through one channel. Errors are returned so the
// caller can decide whether to log or surface them (e.g. a "test channel" API).
func Send(ch *models.NotificationChannel, title, message string) error {
	if !ch.Enabled {
		return nil
	}

	switch ch.Type {
	case "telegram":
		api := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", ch.Config["bot_token"])
		return postJSON(api, map[string]string{
			"chat_id": ch.Config["chat_id"],
			"text":    title + "\n" + message,
		})

	case "discord":
		return postJSON(ch.Config["url"], map[string]string{
			"content": "**" + title + "**\n" + message,
		})

	case "slack":
		return postJSON(ch.Config["url"], map[string]string{
			"text": "*" + title + "*\n" + message,
		})

	case "webhook":
		return postJSON(ch.Config["url"], map[string]string{
			"title":   title,
			"message": message,
		})

	case "ntfy":
		req, err := http.NewRequest("POST", ch.Config["url"], strings.NewReader(message))
		if err != nil {
			return err
		}
		req.Header.Set("Title", title)
		return doRequest(req)

	case "gotify":
		endpoint := strings.TrimRight(ch.Config["url"], "/") + "/message?token=" + url.QueryEscape(ch.Config["token"])
		return postJSON(endpoint, map[string]interface{}{
			"title":    title,
			"message":  message,
			"priority": 5,
		})

	case "bark":
		endpoint := strings.TrimRight(ch.Config["url"], "/") + "/" +
			url.PathEscape(title) + "/" + url.PathEscape(message)
		req, err := http.NewRequest("GET", endpoint, nil)
		if err != nil {
			return err
		}
		return doRequest(req)

	case "email":
		return sendEmail(ch.Config, title, message)

	default:
		return errors.New("unknown channel type: " + ch.Type)
	}
}

// SendAll fans a message out to the given channels, logging failures.
func SendAll(channels []*models.NotificationChannel, title, message string) {
	for _, ch := range channels {
		go func(ch *models.NotificationChannel) {
			if err := Send(ch, title, message); err != nil {
				slog.Error("notification failed", "channel", ch.Name, "type", ch.Type, "error", err)
			}
		}(ch)
	}
}

func postJSON(endpoint string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	return doRequest(req)
}

func doRequest(req *http.Request) error {
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("channel responded with HTTP %d", resp.StatusCode)
	}
	return nil
}

func sendEmail(cfg map[string]string, title, message string) error {
	addr := cfg["host"] + ":" + cfg["port"]
	msg := []byte("From: " + cfg["from"] + "\r\n" +
		"To: " + cfg["to"] + "\r\n" +
		"Subject: " + title + "\r\n" +
		"\r\n" + message + "\r\n")

	var auth smtp.Auth
	if cfg["username"] != "" {
		auth = smtp.PlainAuth("", cfg["username"], cfg["password"], cfg["host"])
	}
	return smtp.SendMail(addr, auth, cfg["from"], strings.Split(cfg["to"], ","), msg)
}
