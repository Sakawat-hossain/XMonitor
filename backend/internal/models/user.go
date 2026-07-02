package models

import "time"

// User represents an admin panel account.
// PasswordHash is never serialized to JSON.
type User struct {
	ID                 string    `json:"id"`
	Username           string    `json:"username"`
	PasswordHash       string    `json:"-"`
	Role               string    `json:"role"` // "admin"
	MustChangePassword bool      `json:"must_change_password"`
	CreatedAt          time.Time `json:"created_at"`
	LastLoginAt        time.Time `json:"last_login_at"`
}

// LoginRequest is the payload for POST /api/v1/auth/login
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse is returned on successful login
type LoginResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

// ChangePasswordRequest is the payload for POST /api/v1/auth/change-password
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}
