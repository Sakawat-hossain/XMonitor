package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
	"github.com/sakaw/xmonitor/backend/internal/monitor"
)

func GetCronTasks(c *gin.Context) {
	tasks := database.GetCronStore().GetAll()
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(tasks), "data": tasks})
}

func CreateCronTask(c *gin.Context) {
	var req models.CreateCronTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	task, err := database.GetCronStore().Create(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": task})
}

func UpdateCronTask(c *gin.Context) {
	var req models.UpdateCronTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	task, err := database.GetCronStore().Update(c.Param("id"), &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "task not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": task})
}

func DeleteCronTask(c *gin.Context) {
	if err := database.GetCronStore().Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Task deleted"})
}

// TriggerCronTask runs a task immediately
func TriggerCronTask(c *gin.Context) {
	exec, err := monitor.TriggerNow(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": exec})
}

// GetCronExecutions returns run history (optionally ?task_id=)
func GetCronExecutions(c *gin.Context) {
	execs := database.GetCronStore().GetExecutions(c.Query("task_id"))
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(execs), "data": execs})
}
