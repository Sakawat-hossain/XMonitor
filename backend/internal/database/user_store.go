package database

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// UserStore is an in-memory store for admin panel users
type UserStore struct {
	mu    sync.RWMutex
	users map[string]*models.User // keyed by ID
}

var userStore *UserStore

// InitUserStore initializes the user store and seeds the default admin
func InitUserStore() {
	userStore = &UserStore{
		users: make(map[string]*models.User),
	}
	userStore.seedDefaultAdmin()
}

// GetUserStore returns the global user store instance
func GetUserStore() *UserStore {
	return userStore
}

// seedDefaultAdmin creates admin/admin123 with a forced password change
func (s *UserStore) seedDefaultAdmin() {
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		// bcrypt only fails on invalid cost; unreachable with DefaultCost
		panic("failed to hash default admin password: " + err.Error())
	}

	admin := &models.User{
		ID:                 uuid.New().String(),
		Username:           "admin",
		PasswordHash:       string(hash),
		Role:               "admin",
		MustChangePassword: true,
		CreatedAt:          time.Now(),
	}
	s.users[admin.ID] = admin
}

// GetByUsername returns a user by username
func (s *UserStore) GetByUsername(username string) (*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, u := range s.users {
		if u.Username == username {
			return u, nil
		}
	}
	return nil, errors.New("user not found")
}

// GetByID returns a user by ID
func (s *UserStore) GetByID(id string) (*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.users[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	return u, nil
}

// VerifyPassword checks credentials and returns the user on success.
// Updates LastLoginAt on successful verification.
func (s *UserStore) VerifyPassword(username, password string) (*models.User, error) {
	u, err := s.GetByUsername(username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return nil, errors.New("invalid username or password")
	}

	s.mu.Lock()
	u.LastLoginAt = time.Now()
	s.mu.Unlock()

	return u, nil
}

// ChangePassword verifies the current password and sets a new one
func (s *UserStore) ChangePassword(id, currentPassword, newPassword string) error {
	u, err := s.GetByID(id)
	if err != nil {
		return err
	}

	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(currentPassword)) != nil {
		return errors.New("current password is incorrect")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	u.PasswordHash = string(hash)
	u.MustChangePassword = false
	return nil
}
