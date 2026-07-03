package database

import (
	"sync"

	"github.com/sakaw/xmonitor/backend/internal/models"
)

const maxMetricPoints = 60 // ring buffer per server

// MetricsStore keeps a short in-memory history of metrics per server.
type MetricsStore struct {
	mu     sync.RWMutex
	points map[string][]models.MetricPoint // keyed by server ID
}

var metricsStore *MetricsStore

// InitMetricsStore initializes the metrics store
func InitMetricsStore() {
	metricsStore = &MetricsStore{
		points: make(map[string][]models.MetricPoint),
	}
}

// GetMetricsStore returns the global metrics store
func GetMetricsStore() *MetricsStore {
	return metricsStore
}

// Append records a metric sample for a server
func (s *MetricsStore) Append(serverID string, p models.MetricPoint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	pts := append(s.points[serverID], p)
	if len(pts) > maxMetricPoints {
		pts = pts[len(pts)-maxMetricPoints:]
	}
	s.points[serverID] = pts
}

// Get returns the stored history for a server (oldest first)
func (s *MetricsStore) Get(serverID string) []models.MetricPoint {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pts := s.points[serverID]
	out := make([]models.MetricPoint, len(pts))
	copy(out, pts)
	return out
}

// Drop removes history for a deleted server
func (s *MetricsStore) Drop(serverID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.points, serverID)
}
