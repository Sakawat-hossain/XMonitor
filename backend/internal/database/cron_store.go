package database

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

const maxCronHistory = 200

var cronParser = cron.NewParser(
	cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow,
)

// CronStore manages scheduled tasks. The actual scheduler lives in the
// monitor package; the store owns data and schedule validation.
type CronStore struct {
	mu         sync.RWMutex
	tasks      map[string]*models.CronTask
	executions []*models.CronExecution
}

var cronStore *CronStore

// InitCronStore initializes the cron store
func InitCronStore() {
	cronStore = &CronStore{
		tasks: make(map[string]*models.CronTask),
	}
}

// GetCronStore returns the global cron store
func GetCronStore() *CronStore {
	return cronStore
}

// ValidateSchedule parses a 5-field cron expression
func ValidateSchedule(expr string) error {
	_, err := cronParser.Parse(expr)
	return err
}

// NextRun computes the next fire time for an expression
func NextRun(expr string) time.Time {
	sched, err := cronParser.Parse(expr)
	if err != nil {
		return time.Time{}
	}
	return sched.Next(time.Now())
}

func (s *CronStore) GetAll() []*models.CronTask {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.CronTask, 0, len(s.tasks))
	for _, t := range s.tasks {
		out = append(out, t)
	}
	return out
}

func (s *CronStore) GetByID(id string) (*models.CronTask, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.tasks[id]
	if !ok {
		return nil, errors.New("task not found")
	}
	return t, nil
}

func (s *CronStore) Create(req *models.CreateCronTaskRequest) (*models.CronTask, error) {
	if err := ValidateSchedule(req.Schedule); err != nil {
		return nil, errors.New("invalid cron expression: " + err.Error())
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	task := &models.CronTask{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Command:   req.Command,
		Schedule:  req.Schedule,
		ServerIDs: req.ServerIDs,
		Enabled:   true,
		NextRun:   NextRun(req.Schedule),
		CreatedAt: time.Now(),
	}
	s.tasks[task.ID] = task
	return task, nil
}

func (s *CronStore) Update(id string, req *models.UpdateCronTaskRequest) (*models.CronTask, error) {
	if req.Schedule != nil {
		if err := ValidateSchedule(*req.Schedule); err != nil {
			return nil, errors.New("invalid cron expression: " + err.Error())
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.tasks[id]
	if !ok {
		return nil, errors.New("task not found")
	}
	if req.Name != nil {
		task.Name = *req.Name
	}
	if req.Command != nil {
		task.Command = *req.Command
	}
	if req.Schedule != nil {
		task.Schedule = *req.Schedule
		task.NextRun = NextRun(*req.Schedule)
	}
	if req.ServerIDs != nil {
		task.ServerIDs = *req.ServerIDs
	}
	if req.Enabled != nil {
		task.Enabled = *req.Enabled
	}
	return task, nil
}

func (s *CronStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.tasks[id]; !ok {
		return errors.New("task not found")
	}
	delete(s.tasks, id)
	return nil
}

// RecordExecution logs a run and updates the task's run bookkeeping
func (s *CronStore) RecordExecution(exec *models.CronExecution) {
	s.mu.Lock()
	defer s.mu.Unlock()

	exec.ID = uuid.New().String()
	exec.Timestamp = time.Now()
	s.executions = append(s.executions, exec)
	if len(s.executions) > maxCronHistory {
		s.executions = s.executions[len(s.executions)-maxCronHistory:]
	}

	if task, ok := s.tasks[exec.TaskID]; ok {
		task.LastRun = exec.Timestamp
		task.NextRun = NextRun(task.Schedule)
	}
}

// GetExecutions returns run history, newest first, optionally for one task
func (s *CronStore) GetExecutions(taskID string) []*models.CronExecution {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var out []*models.CronExecution
	for i := len(s.executions) - 1; i >= 0; i-- {
		if taskID == "" || s.executions[i].TaskID == taskID {
			out = append(out, s.executions[i])
		}
	}
	return out
}

// DueTasks returns enabled tasks whose NextRun has passed
func (s *CronStore) DueTasks() []*models.CronTask {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now()
	var due []*models.CronTask
	for _, t := range s.tasks {
		if t.Enabled && !t.NextRun.IsZero() && now.After(t.NextRun) {
			due = append(due, t)
		}
	}
	return due
}

// ReplaceAll swaps in a full task list (used by backup restore)
func (s *CronStore) ReplaceAll(tasks []*models.CronTask) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tasks = make(map[string]*models.CronTask, len(tasks))
	for _, t := range tasks {
		t.NextRun = NextRun(t.Schedule)
		s.tasks[t.ID] = t
	}
}
