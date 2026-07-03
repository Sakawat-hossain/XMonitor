package database

import (
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

const maxTasksPerServer = 100

// TaskStore is the in-memory queue backing the generic agent task channel.
type TaskStore struct {
	mu    sync.RWMutex
	tasks map[string]*models.Task // keyed by task ID
}

var taskStore *TaskStore

// InitTaskStore initializes the task store
func InitTaskStore() {
	taskStore = &TaskStore{tasks: make(map[string]*models.Task)}
}

// GetTaskStore returns the global task store
func GetTaskStore() *TaskStore {
	return taskStore
}

// Enqueue adds a pending task for a server and returns it
func (s *TaskStore) Enqueue(t *models.Task) *models.Task {
	s.mu.Lock()
	defer s.mu.Unlock()

	t.ID = uuid.New().String()
	t.Status = models.TaskPending
	t.CreatedAt = time.Now()
	t.UpdatedAt = t.CreatedAt
	s.tasks[t.ID] = t

	s.pruneLocked(t.ServerID)
	return t
}

// ClaimPending returns pending tasks for a server, marking them dispatched.
func (s *TaskStore) ClaimPending(serverID string) []models.Task {
	s.mu.Lock()
	defer s.mu.Unlock()

	var claimed []models.Task
	for _, t := range s.tasks {
		if t.ServerID == serverID && t.Status == models.TaskPending {
			t.Status = models.TaskDispatched
			t.UpdatedAt = time.Now()
			claimed = append(claimed, *t)
		}
	}
	sort.Slice(claimed, func(i, j int) bool {
		return claimed[i].CreatedAt.Before(claimed[j].CreatedAt)
	})
	return claimed
}

// SetResult records the outcome reported by the agent.
func (s *TaskStore) SetResult(id string, req *models.TaskResultRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.tasks[id]
	if !ok {
		return errors.New("task not found")
	}
	if req.Status == models.TaskSuccess {
		t.Status = models.TaskSuccess
	} else {
		t.Status = models.TaskFailed
	}
	t.Output = req.Output
	t.ExitCode = req.ExitCode
	t.Error = req.Error
	t.UpdatedAt = time.Now()
	return nil
}

// Get returns a task by ID
func (s *TaskStore) Get(id string) (*models.Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.tasks[id]
	if !ok {
		return nil, errors.New("task not found")
	}
	cp := *t
	return &cp, nil
}

// ListForServer returns a server's tasks, newest first.
func (s *TaskStore) ListForServer(serverID string) []*models.Task {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var out []*models.Task
	for _, t := range s.tasks {
		if t.ServerID == serverID {
			cp := *t
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out
}

// pruneLocked caps stored tasks per server (oldest completed dropped first).
func (s *TaskStore) pruneLocked(serverID string) {
	var ids []*models.Task
	for _, t := range s.tasks {
		if t.ServerID == serverID {
			ids = append(ids, t)
		}
	}
	if len(ids) <= maxTasksPerServer {
		return
	}
	sort.Slice(ids, func(i, j int) bool {
		return ids[i].CreatedAt.Before(ids[j].CreatedAt)
	})
	for _, t := range ids[:len(ids)-maxTasksPerServer] {
		if t.Status == models.TaskSuccess || t.Status == models.TaskFailed {
			delete(s.tasks, t.ID)
		}
	}
}
