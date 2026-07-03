// Package agent is the generic task-execution channel between the backend
// and monitored servers' agents. It is built once here and reused by every
// feature that needs to run a command or push a file to a server — service
// checks, cron, and (later) relay config deployment. No feature builds its
// own parallel deployment mechanism.
package agent

import (
	"errors"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// ErrTimeout is returned when a task doesn't complete within the wait window.
var ErrTimeout = errors.New("timed out waiting for agent to complete task")

// RunCommand enqueues a shell command for the server's agent.
func RunCommand(serverID, command, reason string) *models.Task {
	return database.GetTaskStore().Enqueue(&models.Task{
		ServerID: serverID,
		Type:     models.TaskRunCommand,
		Command:  command,
		Reason:   reason,
	})
}

// WriteFile enqueues a file-write for the server's agent.
func WriteFile(serverID, path, content, reason string) *models.Task {
	return database.GetTaskStore().Enqueue(&models.Task{
		ServerID:    serverID,
		Type:        models.TaskWriteFile,
		FilePath:    path,
		FileContent: content,
		Reason:      reason,
	})
}

// WaitForResult polls until the task reaches a terminal state or times out.
// This is what lets the deployer drive a hop synchronously ("write config,
// then restart service, then report per-hop status").
func WaitForResult(taskID string, timeout time.Duration) (*models.Task, error) {
	deadline := time.Now().Add(timeout)
	for {
		t, err := database.GetTaskStore().Get(taskID)
		if err != nil {
			return nil, err
		}
		if t.Status == models.TaskSuccess || t.Status == models.TaskFailed {
			return t, nil
		}
		if time.Now().After(deadline) {
			return t, ErrTimeout
		}
		time.Sleep(500 * time.Millisecond)
	}
}

// RunAndWait enqueues a command and blocks until it finishes (or times out).
func RunAndWait(serverID, command, reason string, timeout time.Duration) (*models.Task, error) {
	t := RunCommand(serverID, command, reason)
	return WaitForResult(t.ID, timeout)
}

// WriteFileAndWait enqueues a file-write and blocks until it finishes.
func WriteFileAndWait(serverID, path, content, reason string, timeout time.Duration) (*models.Task, error) {
	t := WriteFile(serverID, path, content, reason)
	return WaitForResult(t.ID, timeout)
}
