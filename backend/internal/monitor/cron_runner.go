package monitor

import (
	"context"
	"log/slog"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// StartCronRunner fires due scheduled tasks. Commands are dispatched to
// agents on the target servers; until the agent component ships, runs are
// recorded with status "no_agent" so the schedule/history flow is real.
func StartCronRunner(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				store := database.GetCronStore()
				for _, task := range store.DueTasks() {
					slog.Info("cron task due", "task", task.Name, "schedule", task.Schedule)
					store.RecordExecution(&models.CronExecution{
						TaskID:   task.ID,
						TaskName: task.Name,
						Status:   "no_agent",
						Output:   "No agent connected on target server(s); command not executed.",
					})
				}
			}
		}
	}()
}

// TriggerNow runs a task immediately (manual trigger from the admin UI)
func TriggerNow(taskID string) (*models.CronExecution, error) {
	store := database.GetCronStore()
	task, err := store.GetByID(taskID)
	if err != nil {
		return nil, err
	}

	exec := &models.CronExecution{
		TaskID:   task.ID,
		TaskName: task.Name,
		Status:   "no_agent",
		Output:   "No agent connected on target server(s); command not executed.",
		Manual:   true,
	}
	store.RecordExecution(exec)
	return exec, nil
}
