package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// GetServers returns all servers
func GetServers(c *gin.Context) {
	store := database.GetStore()
	servers := store.GetAllServers()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"count":   len(servers),
		"data":    servers,
	})
}

// GetServer returns a single server by ID
func GetServer(c *gin.Context) {
	id := c.Param("id")
	store := database.GetStore()

	server, err := store.GetServerByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    server,
	})
}

// CreateServer adds a new server
func CreateServer(c *gin.Context) {
	var req models.CreateServerRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	store := database.GetStore()
	server := store.CreateServer(&req)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    server,
	})
}

// UpdateServer edits an existing server
func UpdateServer(c *gin.Context) {
	var req models.UpdateServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	server, err := database.GetStore().UpdateServer(c.Param("id"), &req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    server,
	})
}

// DeleteServer removes a server
func DeleteServer(c *gin.Context) {
	id := c.Param("id")
	store := database.GetStore()

	if err := store.DeleteServer(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Server deleted successfully",
	})
}

// HealthCheck returns service health
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "xmonitor-backend",
		"version": "0.0.1",
	})
}