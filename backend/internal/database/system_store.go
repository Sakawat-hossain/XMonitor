package database

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

const maxAuditEntries = 1000

// SystemStore holds audit log, API tokens, and site settings.
type SystemStore struct {
	mu       sync.RWMutex
	audit    []*models.AuditEntry
	tokens   map[string]*models.APIToken // keyed by token value
	settings models.Settings
}

var systemStore *SystemStore

// InitSystemStore initializes audit/token/settings storage
func InitSystemStore() {
	systemStore = &SystemStore{
		tokens: make(map[string]*models.APIToken),
		settings: models.Settings{
			SiteName:      "XMonitor",
			DefaultTheme:  "system",
			DefaultLocale: "en",
		},
	}
}

// GetSystemStore returns the global system store
func GetSystemStore() *SystemStore {
	return systemStore
}

// --- Audit log ---

// Audit appends an entry to the audit log
func (s *SystemStore) Audit(username, action, detail, ip string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.audit = append(s.audit, &models.AuditEntry{
		ID:        uuid.New().String(),
		Username:  username,
		Action:    action,
		Detail:    detail,
		IP:        ip,
		Timestamp: time.Now(),
	})
	if len(s.audit) > maxAuditEntries {
		s.audit = s.audit[len(s.audit)-maxAuditEntries:]
	}
}

// GetAudit returns entries newest first
func (s *SystemStore) GetAudit() []*models.AuditEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*models.AuditEntry, len(s.audit))
	for i, e := range s.audit {
		out[len(s.audit)-1-i] = e
	}
	return out
}

// --- API tokens ---

// CreateToken mints a new API token; the full value is only returned once.
func (s *SystemStore) CreateToken(req *models.CreateTokenRequest) (*models.APIToken, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	value := "xmt_" + hex.EncodeToString(raw)

	token := &models.APIToken{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Token:     value,
		Prefix:    value[:12],
		Scope:     req.Scope,
		CreatedAt: time.Now(),
	}

	s.mu.Lock()
	s.tokens[value] = token
	s.mu.Unlock()
	return token, nil
}

// GetTokens lists tokens without their secret values
func (s *SystemStore) GetTokens() []*models.APIToken {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*models.APIToken, 0, len(s.tokens))
	for _, t := range s.tokens {
		copy := *t
		copy.Token = "" // never re-expose the secret
		out = append(out, &copy)
	}
	return out
}

// ValidateToken checks an API token value and returns (name, scope)
func (s *SystemStore) ValidateToken(value string) (string, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.tokens[value]
	if !ok {
		return "", "", errors.New("invalid API token")
	}
	t.LastUsed = time.Now()
	return t.Name, t.Scope, nil
}

// RevokeToken deletes a token by ID
func (s *SystemStore) RevokeToken(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for value, t := range s.tokens {
		if t.ID == id {
			delete(s.tokens, value)
			return nil
		}
	}
	return errors.New("token not found")
}

// --- Settings ---

// GetSettings returns the current site settings
func (s *SystemStore) GetSettings() models.Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.settings
}

// UpdateSettings replaces non-empty fields
func (s *SystemStore) UpdateSettings(in *models.Settings) models.Settings {
	s.mu.Lock()
	defer s.mu.Unlock()

	if in.SiteName != "" {
		s.settings.SiteName = in.SiteName
	}
	s.settings.LogoURL = in.LogoURL // allow clearing
	if in.DefaultTheme != "" {
		s.settings.DefaultTheme = in.DefaultTheme
	}
	if in.DefaultLocale != "" {
		s.settings.DefaultLocale = in.DefaultLocale
	}
	return s.settings
}
