package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/middleware"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// Login authenticates a user and returns a JWT
func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "username and password are required",
		})
		return
	}

	user, err := database.GetUserStore().VerifyPassword(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to generate token",
		})
		return
	}

	database.GetSystemStore().Audit(user.Username, "login", "", c.ClientIP())

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    models.LoginResponse{Token: token, User: user},
	})
}

// GetMe returns the currently authenticated user
func GetMe(c *gin.Context) {
	userID := c.GetString(middleware.ContextUserID)

	user, err := database.GetUserStore().GetByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "user no longer exists",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// Logout acknowledges logout. JWTs are stateless, so the client discards
// the token; this endpoint exists for audit logging later.
func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "logged out",
	})
}

// ChangePassword updates the authenticated user's password
func ChangePassword(c *gin.Context) {
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "current_password and new_password (min 8 chars) are required",
		})
		return
	}

	userID := c.GetString(middleware.ContextUserID)
	if err := database.GetUserStore().ChangePassword(userID, req.CurrentPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "password changed successfully",
	})
}
