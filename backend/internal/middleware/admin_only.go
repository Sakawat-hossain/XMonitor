package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminOnly requires the authenticated user to have the admin role.
// Must run after AuthRequired.
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if role, _ := c.Get(ContextUserRole); role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "admin access required",
			})
			return
		}
		c.Next()
	}
}
