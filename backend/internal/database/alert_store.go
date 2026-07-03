package database

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

const maxAlertHistory = 500

// AlertStore manages alert rules, notification channels, and fired events
type AlertStore struct {
	mu       sync.RWMutex
	rules    map[string]*models.AlertRule
	channels map[string]*models.NotificationChannel
	events   []*models.AlertEvent
}

var alertStore *AlertStore

// InitAlertStore initializes the alert store with a sample rule
func InitAlertStore() {
	alertStore = &AlertStore{
		rules:    make(map[string]*models.AlertRule),
		channels: make(map[string]*models.NotificationChannel),
	}

	rule := &models.AlertRule{
		ID:        uuid.New().String(),
		Name:      "High CPU (>90%)",
		Condition: "cpu",
		Threshold: 90,
		Cooldown:  10,
		Enabled:   true,
		CreatedAt: time.Now(),
	}
	alertStore.rules[rule.ID] = rule
}

// GetAlertStore returns the global alert store
func GetAlertStore() *AlertStore {
	return alertStore
}

// --- Rules ---

func (s *AlertStore) GetRules() []*models.AlertRule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.AlertRule, 0, len(s.rules))
	for _, r := range s.rules {
		out = append(out, r)
	}
	return out
}

func (s *AlertStore) CreateRule(req *models.CreateAlertRuleRequest) *models.AlertRule {
	s.mu.Lock()
	defer s.mu.Unlock()

	cooldown := req.Cooldown
	if cooldown <= 0 {
		cooldown = 10
	}
	rule := &models.AlertRule{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Condition: req.Condition,
		Threshold: req.Threshold,
		ServerIDs: req.ServerIDs,
		Channels:  req.Channels,
		Cooldown:  cooldown,
		Enabled:   true,
		CreatedAt: time.Now(),
	}
	s.rules[rule.ID] = rule
	return rule
}

func (s *AlertStore) UpdateRule(id string, req *models.UpdateAlertRuleRequest) (*models.AlertRule, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rule, ok := s.rules[id]
	if !ok {
		return nil, errors.New("alert rule not found")
	}
	if req.Name != nil {
		rule.Name = *req.Name
	}
	if req.Condition != nil {
		rule.Condition = *req.Condition
	}
	if req.Threshold != nil {
		rule.Threshold = *req.Threshold
	}
	if req.ServerIDs != nil {
		rule.ServerIDs = *req.ServerIDs
	}
	if req.Channels != nil {
		rule.Channels = *req.Channels
	}
	if req.Cooldown != nil && *req.Cooldown > 0 {
		rule.Cooldown = *req.Cooldown
	}
	if req.Enabled != nil {
		rule.Enabled = *req.Enabled
	}
	if req.Muted != nil {
		rule.Muted = *req.Muted
	}
	return rule, nil
}

func (s *AlertStore) DeleteRule(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.rules[id]; !ok {
		return errors.New("alert rule not found")
	}
	delete(s.rules, id)
	return nil
}

// MarkFired sets the rule's cooldown anchor
func (s *AlertStore) MarkFired(ruleID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if rule, ok := s.rules[ruleID]; ok {
		rule.LastFired = time.Now()
	}
}

// --- Channels ---

func (s *AlertStore) GetChannels() []*models.NotificationChannel {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.NotificationChannel, 0, len(s.channels))
	for _, ch := range s.channels {
		out = append(out, ch)
	}
	return out
}

func (s *AlertStore) GetChannelByID(id string) (*models.NotificationChannel, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	ch, ok := s.channels[id]
	if !ok {
		return nil, errors.New("channel not found")
	}
	return ch, nil
}

func (s *AlertStore) CreateChannel(req *models.CreateChannelRequest) *models.NotificationChannel {
	s.mu.Lock()
	defer s.mu.Unlock()

	ch := &models.NotificationChannel{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Type:      req.Type,
		Config:    req.Config,
		Enabled:   true,
		CreatedAt: time.Now(),
	}
	s.channels[ch.ID] = ch
	return ch
}

func (s *AlertStore) DeleteChannel(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.channels[id]; !ok {
		return errors.New("channel not found")
	}
	delete(s.channels, id)
	return nil
}

// --- Events ---

func (s *AlertStore) AddEvent(event *models.AlertEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	event.ID = uuid.New().String()
	event.Timestamp = time.Now()
	s.events = append(s.events, event)
	if len(s.events) > maxAlertHistory {
		s.events = s.events[len(s.events)-maxAlertHistory:]
	}
}

// GetEvents returns fired alerts, newest first
func (s *AlertStore) GetEvents() []*models.AlertEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*models.AlertEvent, len(s.events))
	for i, e := range s.events {
		out[len(s.events)-1-i] = e
	}
	return out
}

// ReplaceAll swaps in rules and channels (used by backup restore)
func (s *AlertStore) ReplaceAll(rules []*models.AlertRule, channels []*models.NotificationChannel) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.rules = make(map[string]*models.AlertRule, len(rules))
	for _, r := range rules {
		s.rules[r.ID] = r
	}
	s.channels = make(map[string]*models.NotificationChannel, len(channels))
	for _, ch := range channels {
		s.channels[ch.ID] = ch
	}
}
