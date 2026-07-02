package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// GetServices returns all monitored services
func GetServices(c *gin.Context) {
	services := database.GetServiceStore().GetAll()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"count":   len(services),
		"data":    services,
	})
}

// GetService returns one service with its check history
func GetService(c *gin.Context) {
	svc, err := database.GetServiceStore().GetByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": svc})
}

// CreateService adds a monitored service
func CreateService(c *gin.Context) {
	var req models.CreateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	svc := database.GetServiceStore().Create(&req)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": svc})
}

// UpdateService edits a monitored service
func UpdateService(c *gin.Context) {
	var req models.UpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	svc, err := database.GetServiceStore().Update(c.Param("id"), &req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": svc})
}

// DeleteService removes a monitored service
func DeleteService(c *gin.Context) {
	if err := database.GetServiceStore().Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Service deleted successfully"})
}
