package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
)

// ContextServerID holds the agent's resolved server ID
const ContextServerID = "agent_server_id"

// AgentAuth authenticates an agent by its per-server secret (X-Agent-Secret
// header) and stores the resolved server ID in the context. This is separate
// from the admin JWT auth — agents are machines, not users.
func AgentAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := c.GetHeader("X-Agent-Secret")
		srv, err := database.GetStore().GetServerBySecret(secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "invalid agent secret",
			})
			return
		}
		c.Set(ContextServerID, srv.ID)
		c.Next()
	}
}
