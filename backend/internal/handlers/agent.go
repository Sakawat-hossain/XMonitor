package handlers

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/middleware"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// --- Agent-facing endpoints (authenticated by X-Agent-Secret) ---

// AgentRegister records agent identity and marks the server online.
func AgentRegister(c *gin.Context) {
	serverID := c.GetString(middleware.ContextServerID)

	var req models.AgentRegisterRequest
	_ = c.ShouldBindJSON(&req)
	database.GetStore().RegisterAgent(serverID, &req)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"server_id": serverID},
	})
}

// AgentHeartbeat ingests live metrics and returns any pending tasks.
func AgentHeartbeat(c *gin.Context) {
	serverID := c.GetString(middleware.ContextServerID)

	var hb models.AgentHeartbeat
	if err := c.ShouldBindJSON(&hb); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	database.GetStore().ApplyHeartbeat(serverID, &hb)
	if srv, err := database.GetStore().GetServerByID(serverID); err == nil {
		database.GetMetricsStore().Append(serverID, models.MetricPoint{
			Timestamp:  srv.LastAgentSeen,
			CPU:        srv.CPU,
			Memory:     srv.Memory,
			Disk:       srv.Disk,
			NetworkIn:  srv.NetworkIn,
			NetworkOut: srv.NetworkOut,
		})
	}

	tasks := database.GetTaskStore().ClaimPending(serverID)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    models.AgentHeartbeatResponse{Tasks: tasks},
	})
}

// AgentTaskResult records the outcome of a dispatched task.
func AgentTaskResult(c *gin.Context) {
	var req models.TaskResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := database.GetTaskStore().SetResult(c.Param("id"), &req); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// --- Admin-facing endpoints (JWT) ---

// EnqueueServerTask dispatches a generic task to a server's agent.
func EnqueueServerTask(c *gin.Context) {
	id := c.Param("id")
	if _, err := database.GetStore().GetServerByID(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	var req models.EnqueueTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	task := database.GetTaskStore().Enqueue(&models.Task{
		ServerID:    id,
		Type:        req.Type,
		Command:     req.Command,
		FilePath:    req.FilePath,
		FileContent: req.FileContent,
		Reason:      req.Reason,
	})
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": task})
}

// GetServerTasks lists a server's task history.
func GetServerTasks(c *gin.Context) {
	tasks := database.GetTaskStore().ListForServer(c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(tasks), "data": tasks})
}

// GetInstallCommand returns the copy-paste one-line agent install command.
func GetInstallCommand(c *gin.Context) {
	srv, err := database.GetStore().GetServerByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	// The backend URL the agent should call. Overridable so the command works
	// when the panel is reached via a public hostname rather than localhost.
	base := os.Getenv("XMONITOR_PUBLIC_URL")
	if base == "" {
		base = "http://" + c.Request.Host
	}

	command := fmt.Sprintf(
		"curl -fsSL %s/install.sh | XMONITOR_URL=%s XMONITOR_SECRET=%s bash",
		base, base, srv.AgentSecret,
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"command": command,
			"url":     base,
			"secret":  srv.AgentSecret,
		},
	})
}
