package middleware

import (
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sakaw/xmonitor/backend/internal/database"
)

const (
	issuer      = "xmonitor"
	tokenExpiry = 24 * time.Hour

	// ContextUserID is the gin context key holding the authenticated user's ID
	ContextUserID = "user_id"
	// ContextUserRole is the gin context key holding the authenticated user's role
	ContextUserRole = "user_role"
)

// jwtSecret returns the signing secret from env, with a dev fallback
func jwtSecret() []byte {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return []byte(s)
	}
	return []byte("xmonitor-dev-secret-change-in-production")
}

// GenerateToken creates a signed JWT for the given user
func GenerateToken(userID, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":  userID,
		"role": role,
		"iss":  issuer,
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(tokenExpiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

// parseToken validates a JWT string and returns (userID, role)
func parseToken(tokenString string) (string, string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret(), nil
	}, jwt.WithIssuer(issuer), jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return "", "", errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid token claims")
	}

	sub, _ := claims["sub"].(string)
	role, _ := claims["role"].(string)
	if sub == "" {
		return "", "", errors.New("invalid token subject")
	}
	return sub, role, nil
}

// AuthRequired validates the Bearer token and stores user info in context
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		var raw string
		if header := c.GetHeader("Authorization"); strings.HasPrefix(header, "Bearer ") {
			raw = strings.TrimPrefix(header, "Bearer ")
		} else if q := c.Query("token"); q != "" {
			// WebSocket clients can't set headers; they pass ?token= instead
			raw = q
		}
		if raw == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "authorization required",
			})
			return
		}

		// API tokens (xmt_…) are validated against the token store rather
		// than parsed as JWTs. Read-scope tokens may only perform GETs.
		if strings.HasPrefix(raw, "xmt_") {
			name, scope, err := database.GetSystemStore().ValidateToken(raw)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"error":   err.Error(),
				})
				return
			}
			if scope == "read" && c.Request.Method != http.MethodGet {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"success": false,
					"error":   "this API token is read-only",
				})
				return
			}
			c.Set(ContextUserID, "token:"+name)
			c.Set(ContextUserRole, "admin")
			c.Next()
			return
		}

		userID, role, err := parseToken(raw)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		c.Set(ContextUserID, userID)
		c.Set(ContextUserRole, role)
		c.Next()
	}
}
