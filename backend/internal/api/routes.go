package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/handlers"
	"github.com/sakaw/xmonitor/backend/internal/middleware"
	"github.com/sakaw/xmonitor/backend/internal/ws"
)

// SetupRouter configures all API routes
func SetupRouter() *gin.Engine {
	router := gin.Default()

	// CORS configuration — allows frontend to call backend
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check
	router.GET("/health", handlers.HealthCheck)

	// WebSocket live updates (public — mirrors the public GET APIs)
	router.GET("/ws", ws.Handler)

	// Agent bootstrap (public): install script + prebuilt binary download
	router.GET("/install.sh", handlers.ServeInstallScript)
	router.GET("/install/:platform", handlers.ServeAgentBinary)

	// Agent channel (authenticated by per-server X-Agent-Secret, not JWT)
	agentGrp := router.Group("/api/v1/agent")
	agentGrp.Use(middleware.AgentAuth())
	{
		agentGrp.POST("/register", handlers.AgentRegister)
		agentGrp.POST("/heartbeat", handlers.AgentHeartbeat)
		agentGrp.POST("/tasks/:id/result", handlers.AgentTaskResult)
	}

	// API v1 group
	v1 := router.Group("/api/v1")
	{
		// Public — read-only, no auth
		v1.GET("/servers", handlers.GetServers)
		v1.GET("/servers/:id", handlers.GetServer)
		v1.GET("/chains", handlers.GetChains)
		v1.GET("/chains/:id", handlers.GetChain)
		v1.GET("/services", handlers.GetServices)
		v1.GET("/services/:id", handlers.GetService)
		v1.GET("/servers/:id/metrics", handlers.GetServerMetrics)
		v1.GET("/servers/:id/reachability", handlers.GetServerReachability)
		v1.GET("/probes", handlers.GetProbes)
		v1.GET("/settings", handlers.GetSettings)

		// Auth endpoints
		auth := v1.Group("/auth")
		{
			auth.POST("/login", handlers.Login)

			authed := auth.Group("")
			authed.Use(middleware.AuthRequired())
			{
				authed.GET("/me", handlers.GetMe)
				authed.POST("/logout", handlers.Logout)
				authed.POST("/change-password", handlers.ChangePassword)
			}
		}

		// Admin — auth required for all management operations
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthRequired(), middleware.AdminOnly(), middleware.AuditLog())
		{
			// System: audit log, API tokens, settings, backup
			admin.GET("/audit-log", handlers.GetAuditLog)
			admin.GET("/tokens", handlers.GetAPITokens)
			admin.POST("/tokens", handlers.CreateAPIToken)
			admin.DELETE("/tokens/:id", handlers.RevokeAPIToken)
			admin.PUT("/settings", handlers.UpdateSettings)
			admin.GET("/backup", handlers.ExportBackup)
			admin.POST("/restore", handlers.ImportBackup)

			// Server CRUD
			admin.POST("/servers", handlers.CreateServer)
			admin.PUT("/servers/:id", handlers.UpdateServer)
			admin.DELETE("/servers/:id", handlers.DeleteServer)

			// Agent: install command + generic task dispatch
			admin.GET("/servers/:id/install", handlers.GetInstallCommand)
			admin.GET("/servers/:id/tasks", handlers.GetServerTasks)
			admin.POST("/servers/:id/tasks", handlers.EnqueueServerTask)

			// Chain CRUD
			admin.POST("/chains", handlers.CreateChain)
			admin.PUT("/chains/:id", handlers.UpdateChain)
			admin.DELETE("/chains/:id", handlers.DeleteChain)
			admin.POST("/chains/:id/test", handlers.TestChain)

			// Service monitors
			admin.POST("/services", handlers.CreateService)
			admin.PUT("/services/:id", handlers.UpdateService)
			admin.DELETE("/services/:id", handlers.DeleteService)

			// Alert rules & events
			admin.GET("/alerts/rules", handlers.GetAlertRules)
			admin.POST("/alerts/rules", handlers.CreateAlertRule)
			admin.PUT("/alerts/rules/:id", handlers.UpdateAlertRule)
			admin.DELETE("/alerts/rules/:id", handlers.DeleteAlertRule)
			admin.GET("/alerts/events", handlers.GetAlertEvents)

			// Notification channels
			admin.GET("/channels", handlers.GetChannels)
			admin.POST("/channels", handlers.CreateChannel)
			admin.DELETE("/channels/:id", handlers.DeleteChannel)
			admin.POST("/channels/:id/test", handlers.TestChannel)

			// Scheduled tasks
			admin.GET("/cron", handlers.GetCronTasks)
			admin.POST("/cron", handlers.CreateCronTask)
			admin.PUT("/cron/:id", handlers.UpdateCronTask)
			admin.DELETE("/cron/:id", handlers.DeleteCronTask)
			admin.POST("/cron/:id/trigger", handlers.TriggerCronTask)
			admin.GET("/cron/executions", handlers.GetCronExecutions)

			// Probe nodes
			admin.POST("/probes", handlers.CreateProbe)
			admin.DELETE("/probes/:id", handlers.DeleteProbe)

			// WebSSH & remote file manager
			admin.GET("/servers/:id/ssh", handlers.WebSSH)
			admin.GET("/servers/:id/files", handlers.ListFiles)
			admin.GET("/servers/:id/files/download", handlers.DownloadFile)
			admin.POST("/servers/:id/files/upload", handlers.UploadFile)
			admin.DELETE("/servers/:id/files", handlers.DeleteFile)
			admin.POST("/servers/:id/files/rename", handlers.RenameFile)
		}
	}

	// Root endpoint
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"name":    "XMonitor API",
			"version": "0.0.1",
			"docs":    "/api/v1",
		})
	})

	return router
}
