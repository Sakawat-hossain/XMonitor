package database

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

const maxServiceHistory = 120 // ~1h at 30s intervals

// ServiceStore manages monitored services and their check history
type ServiceStore struct {
	mu       sync.RWMutex
	services map[string]*models.Service
}

var serviceStore *ServiceStore

// InitServiceStore initializes the service store with sample targets
func InitServiceStore() {
	serviceStore = &ServiceStore{
		services: make(map[string]*models.Service),
	}
	serviceStore.seed()
}

// GetServiceStore returns the global service store
func GetServiceStore() *ServiceStore {
	return serviceStore
}

func (s *ServiceStore) seed() {
	samples := []*models.Service{
		{Name: "Cloudflare DNS (TCP)", Type: "tcp", Target: "1.1.1.1:53", IntervalSecs: 60},
		{Name: "Google HTTPS", Type: "http", Target: "https://www.google.com", IntervalSecs: 60},
		{Name: "Cloudflare Ping", Type: "ping", Target: "1.1.1.1", IntervalSecs: 60},
	}
	for _, svc := range samples {
		svc.ID = uuid.New().String()
		svc.Status = "pending"
		svc.CreatedAt = time.Now()
		svc.History = []models.CheckResult{}
		s.services[svc.ID] = svc
	}
}

// GetAll returns all services
func (s *ServiceStore) GetAll() []*models.Service {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*models.Service, 0, len(s.services))
	for _, svc := range s.services {
		out = append(out, svc)
	}
	return out
}

// GetByID returns a single service
func (s *ServiceStore) GetByID(id string) (*models.Service, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	svc, ok := s.services[id]
	if !ok {
		return nil, errors.New("service not found")
	}
	return svc, nil
}

// Create adds a service
func (s *ServiceStore) Create(req *models.CreateServiceRequest) *models.Service {
	s.mu.Lock()
	defer s.mu.Unlock()

	interval := req.IntervalSecs
	if interval < 30 {
		interval = 60
	}
	svc := &models.Service{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Type:         req.Type,
		Target:       req.Target,
		IntervalSecs: interval,
		Status:       "pending",
		History:      []models.CheckResult{},
		CreatedAt:    time.Now(),
	}
	s.services[svc.ID] = svc
	return svc
}

// Update edits a service; zero request fields are left unchanged
func (s *ServiceStore) Update(id string, req *models.UpdateServiceRequest) (*models.Service, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	svc, ok := s.services[id]
	if !ok {
		return nil, errors.New("service not found")
	}
	if req.Name != "" {
		svc.Name = req.Name
	}
	if req.Type != "" {
		svc.Type = req.Type
	}
	if req.Target != "" {
		svc.Target = req.Target
		svc.Status = "pending"
		svc.History = []models.CheckResult{}
	}
	if req.IntervalSecs >= 30 {
		svc.IntervalSecs = req.IntervalSecs
	}
	return svc, nil
}

// Delete removes a service
func (s *ServiceStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.services[id]; !ok {
		return errors.New("service not found")
	}
	delete(s.services, id)
	return nil
}

// RecordResult appends a check result and refreshes derived fields
func (s *ServiceStore) RecordResult(id string, result models.CheckResult) {
	s.mu.Lock()
	defer s.mu.Unlock()

	svc, ok := s.services[id]
	if !ok {
		return
	}

	svc.History = append(svc.History, result)
	if len(svc.History) > maxServiceHistory {
		svc.History = svc.History[len(svc.History)-maxServiceHistory:]
	}

	svc.LastCheck = result.Timestamp
	svc.ResponseTime = result.ResponseTime
	svc.LastError = result.Error
	if result.Up {
		svc.Status = "up"
	} else {
		svc.Status = "down"
	}

	up := 0
	for _, r := range svc.History {
		if r.Up {
			up++
		}
	}
	svc.UptimePct = float64(up) / float64(len(svc.History)) * 100
}

// DueServices returns services whose interval has elapsed since last check
func (s *ServiceStore) DueServices() []*models.Service {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now()
	var due []*models.Service
	for _, svc := range s.services {
		if svc.LastCheck.IsZero() ||
			now.Sub(svc.LastCheck) >= time.Duration(svc.IntervalSecs)*time.Second {
			due = append(due, svc)
		}
	}
	return due
}
