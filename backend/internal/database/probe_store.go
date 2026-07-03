package database

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// ProbeStore manages probe nodes and the server×probe reachability matrix.
type ProbeStore struct {
	mu     sync.RWMutex
	probes map[string]*models.Probe
	// reach[serverID][probeID] = latest result
	reach map[string]map[string]*models.Reachability
}

var probeStore *ProbeStore

// InitProbeStore initializes the probe store with seeded vantage points
func InitProbeStore() {
	probeStore = &ProbeStore{
		probes: make(map[string]*models.Probe),
		reach:  make(map[string]map[string]*models.Reachability),
	}

	seeds := []struct{ name, country, region string }{
		{"US-West Probe", "US", "Los Angeles"},
		{"Japan Probe", "JP", "Tokyo"},
		{"China Probe", "CN", "Beijing"},
		{"Hong Kong Probe", "HK", "Central"},
		{"Singapore Probe", "SG", "Jurong"},
		{"Germany Probe", "DE", "Frankfurt"},
	}
	for _, s := range seeds {
		p := &models.Probe{
			ID:       uuid.New().String(),
			Name:     s.name,
			Country:  s.country,
			Region:   s.region,
			Status:   "online",
			LastSeen: time.Now(),
		}
		probeStore.probes[p.ID] = p
	}
}

// GetProbeStore returns the global probe store
func GetProbeStore() *ProbeStore {
	return probeStore
}

// GetProbes returns all probe nodes
func (s *ProbeStore) GetProbes() []*models.Probe {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.Probe, 0, len(s.probes))
	for _, p := range s.probes {
		out = append(out, p)
	}
	return out
}

// CreateProbe registers a probe node
func (s *ProbeStore) CreateProbe(req *models.CreateProbeRequest) *models.Probe {
	s.mu.Lock()
	defer s.mu.Unlock()

	p := &models.Probe{
		ID:       uuid.New().String(),
		Name:     req.Name,
		Country:  req.Country,
		Region:   req.Region,
		Status:   "online",
		LastSeen: time.Now(),
	}
	s.probes[p.ID] = p
	return p
}

// DeleteProbe removes a probe and its reachability records
func (s *ProbeStore) DeleteProbe(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.probes[id]; !ok {
		return errors.New("probe not found")
	}
	delete(s.probes, id)
	for _, m := range s.reach {
		delete(m, id)
	}
	return nil
}

// Record stores a reachability result
func (s *ProbeStore) Record(r *models.Reachability) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.reach[r.ServerID]; !ok {
		s.reach[r.ServerID] = make(map[string]*models.Reachability)
	}
	s.reach[r.ServerID][r.ProbeID] = r
	if p, ok := s.probes[r.ProbeID]; ok {
		p.LastSeen = r.Timestamp
	}
}

// GetReachability returns the latest matrix row for a server
func (s *ProbeStore) GetReachability(serverID string) []*models.Reachability {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*models.Reachability, 0)
	for _, r := range s.reach[serverID] {
		out = append(out, r)
	}
	return out
}

// BlockedCountries returns countries whose probes cannot reach the server
func (s *ProbeStore) BlockedCountries(serverID string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var blocked []string
	for _, r := range s.reach[serverID] {
		if !r.Reachable {
			blocked = append(blocked, r.ProbeCountry)
		}
	}
	return blocked
}
