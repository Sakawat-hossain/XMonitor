package database

import (
	"errors"
	"strings"
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
		SSHPort:     req.SSHPort,
		SSHUser:     req.SSHUser,
		SSHPassword: req.SSHPassword,
		AgentSecret: strings.ReplaceAll(uuid.New().String(), "-", ""),
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

// UpdateServer edits a server; empty request fields are left unchanged
func (s *MemoryStore) UpdateServer(id string, req *models.UpdateServerRequest) (*models.Server, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	server, exists := s.servers[id]
	if !exists {
		return nil, errors.New("server not found")
	}

	if req.Name != "" {
		server.Name = req.Name
	}
	if req.IP != "" {
		server.IP = req.IP
	}
	if req.Country != "" {
		server.Country = req.Country
		server.CountryFlag = getCountryFlag(req.Country)
	}
	if req.Role != "" {
		server.Role = req.Role
	}
	if req.SSHPort != 0 {
		server.SSHPort = req.SSHPort
	}
	if req.SSHUser != "" {
		server.SSHUser = req.SSHUser
	}
	if req.SSHPassword != "" {
		server.SSHPassword = req.SSHPassword
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

// GetServerBySecret resolves the server bound to an agent secret.
func (s *MemoryStore) GetServerBySecret(secret string) (*models.Server, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if secret == "" {
		return nil, errors.New("missing agent secret")
	}
	for _, srv := range s.servers {
		if srv.AgentSecret == secret {
			return srv, nil
		}
	}
	return nil, errors.New("invalid agent secret")
}

// RegisterAgent records agent identity on first contact and marks it online.
func (s *MemoryStore) RegisterAgent(id string, req *models.AgentRegisterRequest) {
	s.mu.Lock()
	defer s.mu.Unlock()

	srv, ok := s.servers[id]
	if !ok {
		return
	}
	if req.OS != "" {
		srv.OS = req.OS
	}
	if req.Arch != "" {
		srv.Arch = req.Arch
	}
	if req.Version != "" {
		srv.AgentVersion = req.Version
	}
	srv.AgentConnected = true
	srv.Status = "online"
	srv.LastAgentSeen = time.Now()
	srv.LastSeen = srv.LastAgentSeen
}

// ApplyHeartbeat updates a server's live metrics from an agent heartbeat.
func (s *MemoryStore) ApplyHeartbeat(id string, hb *models.AgentHeartbeat) {
	s.mu.Lock()
	defer s.mu.Unlock()

	srv, ok := s.servers[id]
	if !ok {
		return
	}
	srv.CPU = hb.CPU
	srv.Memory = hb.Memory
	srv.Disk = hb.Disk
	srv.NetworkIn = hb.NetworkIn
	srv.NetworkOut = hb.NetworkOut
	srv.Uptime = hb.Uptime
	srv.Processes = hb.Processes
	srv.Connections = hb.Connections
	srv.AgentConnected = true
	srv.Status = "online"
	srv.LastAgentSeen = time.Now()
	srv.LastSeen = srv.LastAgentSeen
}

// ReapStaleAgents marks agents offline if they haven't been seen recently.
func (s *MemoryStore) ReapStaleAgents(timeout time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for _, srv := range s.servers {
		if srv.AgentConnected && now.Sub(srv.LastAgentSeen) > timeout {
			srv.AgentConnected = false
			srv.Status = "offline"
		}
	}
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
// ReplaceAll swaps in a full server list (used by backup restore)
func (s *MemoryStore) ReplaceAll(servers []*models.Server) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.servers = make(map[string]*models.Server, len(servers))
	for _, srv := range servers {
		s.servers[srv.ID] = srv
	}
}
