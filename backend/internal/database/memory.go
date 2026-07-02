package database

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// MemoryStore is an in-memory database for development
type MemoryStore struct {
	mu      sync.RWMutex
	servers map[string]*models.Server
}

var store *MemoryStore

// InitMemoryStore initializes the in-memory store
func InitMemoryStore() {
	store = &MemoryStore{
		servers: make(map[string]*models.Server),
	}

	// Add some sample data for testing
	store.seedData()
}

// GetStore returns the global store instance
func GetStore() *MemoryStore {
	return store
}

// seedData adds sample servers for testing
func (s *MemoryStore) seedData() {
	samples := []*models.Server{
		{
			ID:          uuid.New().String(),
			Name:        "CN-Entry-Shanghai",
			IP:          "116.62.100.1",
			Country:     "CN",
			CountryFlag: "🇨🇳",
			Role:        "entry",
			Status:      "online",
			CPU:         23.5,
			Memory:      45.2,
			Disk:        18.7,
			NetworkIn:   125.4,
			NetworkOut:  450.8,
			Uptime:      864000,
			LastSeen:    time.Now(),
			CreatedAt:   time.Now().Add(-30 * 24 * time.Hour),
		},
		{
			ID:          uuid.New().String(),
			Name:        "HK-Relay-Central",
			IP:          "103.45.200.2",
			Country:     "HK",
			CountryFlag: "🇭🇰",
			Role:        "relay",
			Status:      "online",
			CPU:         41.8,
			Memory:      62.3,
			Disk:        22.1,
			NetworkIn:   850.2,
			NetworkOut:  920.5,
			Uptime:      1296000,
			LastSeen:    time.Now(),
			CreatedAt:   time.Now().Add(-45 * 24 * time.Hour),
		},
		{
			ID:          uuid.New().String(),
			Name:        "SG-Main-XBoard",
			IP:          "139.180.50.3",
			Country:     "SG",
			CountryFlag: "🇸🇬",
			Role:        "main",
			Status:      "online",
			CPU:         67.2,
			Memory:      71.5,
			Disk:        45.8,
			NetworkIn:   780.3,
			NetworkOut:  850.1,
			Uptime:      2592000,
			LastSeen:    time.Now(),
			CreatedAt:   time.Now().Add(-60 * 24 * time.Hour),
		},
	}

	for _, server := range samples {
		s.servers[server.ID] = server
	}
}

// CreateServer adds a new server
func (s *MemoryStore) CreateServer(req *models.CreateServerRequest) *models.Server {
	s.mu.Lock()
	defer s.mu.Unlock()

	server := &models.Server{
		ID:          uuid.New().String(),
		Name:        req.Name,
		IP:          req.IP,
		Country:     req.Country,
		CountryFlag: getCountryFlag(req.Country),
		Role:        req.Role,
		Status:      "offline",
		CreatedAt:   time.Now(),
		LastSeen:    time.Now(),
	}

	s.servers[server.ID] = server
	return server
}

// GetAllServers returns all servers
func (s *MemoryStore) GetAllServers() []*models.Server {
	s.mu.RLock()
	defer s.mu.RUnlock()

	servers := make([]*models.Server, 0, len(s.servers))
	for _, server := range s.servers {
		servers = append(servers, server)
	}
	return servers
}

// GetServerByID returns a single server
func (s *MemoryStore) GetServerByID(id string) (*models.Server, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	server, exists := s.servers[id]
	if !exists {
		return nil, errors.New("server not found")
	}
	return server, nil
}

// DeleteServer removes a server
func (s *MemoryStore) DeleteServer(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.servers[id]; !exists {
		return errors.New("server not found")
	}
	delete(s.servers, id)
	return nil
}

// getCountryFlag returns emoji flag for a country code
func getCountryFlag(country string) string {
	flags := map[string]string{
		"US": "🇺🇸",
		"CN": "🇨🇳",
		"HK": "🇭🇰",
		"SG": "🇸🇬",
		"JP": "🇯🇵",
		"KR": "🇰🇷",
		"DE": "🇩🇪",
		"GB": "🇬🇧",
		"FR": "🇫🇷",
		"IN": "🇮🇳",
		"BD": "🇧🇩",
	}
	if flag, ok := flags[country]; ok {
		return flag
	}
	return "🌐"
}