package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
	"github.com/sakaw/xmonitor/backend/internal/notify"
)

// --- Alert rules ---

func GetAlertRules(c *gin.Context) {
	rules := database.GetAlertStore().GetRules()
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(rules), "data": rules})
}

func CreateAlertRule(c *gin.Context) {
	var req models.CreateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	rule := database.GetAlertStore().CreateRule(&req)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": rule})
}

func UpdateAlertRule(c *gin.Context) {
	var req models.UpdateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	rule, err := database.GetAlertStore().UpdateRule(c.Param("id"), &req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rule})
}

func DeleteAlertRule(c *gin.Context) {
	if err := database.GetAlertStore().DeleteRule(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Rule deleted"})
}

// GetAlertEvents returns fired alerts, newest first
func GetAlertEvents(c *gin.Context) {
	events := database.GetAlertStore().GetEvents()
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(events), "data": events})
}

// --- Notification channels ---

func GetChannels(c *gin.Context) {
	channels := database.GetAlertStore().GetChannels()
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(channels), "data": channels})
}

func CreateChannel(c *gin.Context) {
	var req models.CreateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	ch := database.GetAlertStore().CreateChannel(&req)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": ch})
}

func DeleteChannel(c *gin.Context) {
	if err := database.GetAlertStore().DeleteChannel(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Channel deleted"})
}

// TestChannel sends a test message through a channel and reports the result
func TestChannel(c *gin.Context) {
	ch, err := database.GetAlertStore().GetChannelByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := notify.Send(ch, "XMonitor test", "This is a test notification from XMonitor."); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Test notification sent"})
}
