package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
)

// AuditLog records mutating admin requests after they complete successfully.
// Runs after AuthRequired, so the caller identity is in the context.
func AuditLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Only log writes that succeeded
		if c.Request.Method == "GET" || c.Writer.Status() >= 400 {
			return
		}

		username := "unknown"
		if id := c.GetString(ContextUserID); id != "" {
			if u, err := database.GetUserStore().GetByID(id); err == nil {
				username = u.Username
			} else {
				username = id // API tokens carry "token:<name>"
			}
		}

		database.GetSystemStore().Audit(
			username,
			c.Request.Method+" "+c.FullPath(),
			"",
			c.ClientIP(),
		)
	}
}
