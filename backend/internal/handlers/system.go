package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// --- Audit log ---

// GetAuditLog returns admin activity, newest first
func GetAuditLog(c *gin.Context) {
	entries := database.GetSystemStore().GetAudit()
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(entries), "data": entries})
}

// --- API tokens ---

// GetAPITokens lists tokens (secrets redacted)
func GetAPITokens(c *gin.Context) {
	tokens := database.GetSystemStore().GetTokens()
	c.JSON(http.StatusOK, gin.H{"success": true, "count": len(tokens), "data": tokens})
}

// CreateAPIToken mints a token; the full secret is returned only here
func CreateAPIToken(c *gin.Context) {
	var req models.CreateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	token, err := database.GetSystemStore().CreateToken(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": token})
}

// RevokeAPIToken deletes a token
func RevokeAPIToken(c *gin.Context) {
	if err := database.GetSystemStore().RevokeToken(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Token revoked"})
}

// --- Settings ---

// GetSettings returns site settings (public — used for branding)
func GetSettings(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    database.GetSystemStore().GetSettings(),
	})
}

// UpdateSettings edits site settings (admin)
func UpdateSettings(c *gin.Context) {
	var req models.Settings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	updated := database.GetSystemStore().UpdateSettings(&req)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": updated})
}

// --- Backup & restore ---

// ExportBackup returns all configuration as a JSON document
func ExportBackup(c *gin.Context) {
	settings := database.GetSystemStore().GetSettings()
	backup := models.Backup{
		Version:    "1",
		ExportedAt: time.Now(),
		Servers:    database.GetStore().GetAllServers(),
		Chains:     database.GetChainStore().GetAllChains(),
		Services:   database.GetServiceStore().GetAll(),
		AlertRules: database.GetAlertStore().GetRules(),
		Channels:   database.GetAlertStore().GetChannels(),
		CronTasks:  database.GetCronStore().GetAll(),
		Probes:     database.GetProbeStore().GetProbes(),
		Settings:   &settings,
	}

	c.Header("Content-Disposition", `attachment; filename="xmonitor-backup.json"`)
	c.JSON(http.StatusOK, backup)
}

// ImportBackup replaces all configuration from a JSON document
func ImportBackup(c *gin.Context) {
	var backup models.Backup
	if err := c.ShouldBindJSON(&backup); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid backup file: " + err.Error()})
		return
	}
	if backup.Version == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "not an XMonitor backup (missing version)"})
		return
	}

	database.GetStore().ReplaceAll(backup.Servers)
	database.GetChainStore().ReplaceAll(backup.Chains)
	database.GetServiceStore().ReplaceAll(backup.Services)
	database.GetAlertStore().ReplaceAll(backup.AlertRules, backup.Channels)
	database.GetCronStore().ReplaceAll(backup.CronTasks)
	database.GetProbeStore().ReplaceAll(backup.Probes)
	if backup.Settings != nil {
		database.GetSystemStore().UpdateSettings(backup.Settings)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Backup restored",
		"data": gin.H{
			"servers":  len(backup.Servers),
			"chains":   len(backup.Chains),
			"services": len(backup.Services),
			"rules":    len(backup.AlertRules),
			"channels": len(backup.Channels),
			"cron":     len(backup.CronTasks),
			"probes":   len(backup.Probes),
		},
	})
}
