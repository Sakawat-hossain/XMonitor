package models

import "time"

// CronTask is a scheduled command to run on target servers.
type CronTask struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Command   string    `json:"command"`
	Schedule  string    `json:"schedule"` // standard 5-field cron expression
	ServerIDs []string  `json:"server_ids"`
	Enabled   bool      `json:"enabled"`
	LastRun   time.Time `json:"last_run"`
	NextRun   time.Time `json:"next_run"`
	CreatedAt time.Time `json:"created_at"`
}

// CronExecution is one run of a task.
type CronExecution struct {
	ID        string    `json:"id"`
	TaskID    string    `json:"task_id"`
	TaskName  string    `json:"task_name"`
	Status    string    `json:"status"` // dispatched, no_agent, error
	Output    string    `json:"output"`
	Manual    bool      `json:"manual"`
	Timestamp time.Time `json:"timestamp"`
}

// CreateCronTaskRequest payload
type CreateCronTaskRequest struct {
	Name      string   `json:"name" binding:"required"`
	Command   string   `json:"command" binding:"required"`
	Schedule  string   `json:"schedule" binding:"required"`
	ServerIDs []string `json:"server_ids"`
}

// UpdateCronTaskRequest payload (pointer fields: nil = unchanged)
type UpdateCronTaskRequest struct {
	Name      *string   `json:"name"`
	Command   *string   `json:"command"`
	Schedule  *string   `json:"schedule"`
	ServerIDs *[]string `json:"server_ids"`
	Enabled   *bool     `json:"enabled"`
}
