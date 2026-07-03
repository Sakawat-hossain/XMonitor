package models

import "time"

// Task is a unit of work dispatched to an agent. It is deliberately generic:
// the same channel carries monitoring commands, cron jobs, and (later) relay
// config deployment — a single mechanism, per the build spec.
type Task struct {
	ID          string    `json:"id"`
	ServerID    string    `json:"server_id"`
	Type        string    `json:"type"` // run_command | write_file
	Command     string    `json:"command,omitempty"`
	FilePath    string    `json:"file_path,omitempty"`
	FileContent string    `json:"file_content,omitempty"`
	Status      string    `json:"status"` // pending | dispatched | success | failed
	Output      string    `json:"output,omitempty"`
	ExitCode    int       `json:"exit_code"`
	Error       string    `json:"error,omitempty"`
	Reason      string    `json:"reason,omitempty"` // human label, e.g. "relay deploy"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Task type + status constants
const (
	TaskRunCommand = "run_command"
	TaskWriteFile  = "write_file"

	TaskPending    = "pending"
	TaskDispatched = "dispatched"
	TaskSuccess    = "success"
	TaskFailed     = "failed"
)

// AgentRegisterRequest is sent once when an agent starts up.
type AgentRegisterRequest struct {
	Hostname string `json:"hostname"`
	OS       string `json:"os"`
	Arch     string `json:"arch"`
	Version  string `json:"version"`
}

// AgentHeartbeat is posted on every agent poll with live metrics.
type AgentHeartbeat struct {
	CPU         float64 `json:"cpu"`
	Memory      float64 `json:"memory"`
	Disk        float64 `json:"disk"`
	NetworkIn   float64 `json:"network_in"`
	NetworkOut  float64 `json:"network_out"`
	Uptime      int64   `json:"uptime"`
	Processes   int     `json:"processes"`
	Connections int     `json:"connections"`
}

// AgentHeartbeatResponse returns any tasks the agent should execute now.
type AgentHeartbeatResponse struct {
	Tasks []Task `json:"tasks"`
}

// TaskResultRequest is posted by the agent after executing a task.
type TaskResultRequest struct {
	Status   string `json:"status"` // success | failed
	Output   string `json:"output"`
	ExitCode int    `json:"exit_code"`
	Error    string `json:"error"`
}

// EnqueueTaskRequest is the admin payload to dispatch a task to a server.
type EnqueueTaskRequest struct {
	Type        string `json:"type" binding:"required,oneof=run_command write_file"`
	Command     string `json:"command"`
	FilePath    string `json:"file_path"`
	FileContent string `json:"file_content"`
	Reason      string `json:"reason"`
}
