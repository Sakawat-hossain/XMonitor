package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/handlers"
	"github.com/sakaw/xmonitor/backend/internal/middleware"
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

	// API v1 group
	v1 := router.Group("/api/v1")
	{
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

		// Server endpoints
		servers := v1.Group("/servers")
		{
			servers.GET("", handlers.GetServers)
			servers.GET("/:id", handlers.GetServer)
			servers.POST("", handlers.CreateServer)
			servers.DELETE("/:id", handlers.DeleteServer)
		}

		// Chain endpoints
		chains := v1.Group("/chains")
		{
			chains.GET("", handlers.GetChains)
			chains.GET("/:id", handlers.GetChain)
			chains.POST("", handlers.CreateChain)
			chains.DELETE("/:id", handlers.DeleteChain)
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
