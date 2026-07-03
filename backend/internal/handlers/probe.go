package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// GetProbes returns all probe nodes (public)
func GetProbes(c *gin.Context) {
	probes := database.GetProbeStore().GetProbes()
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(probes), "data": probes})
}

// CreateProbe registers a probe node (admin)
func CreateProbe(c *gin.Context) {
	var req models.CreateProbeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	probe := database.GetProbeStore().CreateProbe(&req)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": probe})
}

// DeleteProbe removes a probe node (admin)
func DeleteProbe(c *gin.Context) {
	if err := database.GetProbeStore().DeleteProbe(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Probe deleted"})
}

// GetServerReachability returns the probe matrix row + blocked countries (public)
func GetServerReachability(c *gin.Context) {
	id := c.Param("id")
	if _, err := database.GetStore().GetServerByID(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	store := database.GetProbeStore()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"reachability":      store.GetReachability(id),
			"blocked_countries": store.BlockedCountries(id),
		},
	})
}

// GetServerMetrics returns the metric history ring buffer (public)
func GetServerMetrics(c *gin.Context) {
	id := c.Param("id")
	if _, err := database.GetStore().GetServerByID(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	points := database.GetMetricsStore().Get(id)
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(points), "data": points})
}
