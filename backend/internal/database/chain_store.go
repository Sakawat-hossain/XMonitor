package database

import (
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// ChainStore manages relay chains
type ChainStore struct {
	mu     sync.RWMutex
	chains map[string]*models.RelayChain
}

var chainStore *ChainStore

// InitChainStore initializes the chain store
func InitChainStore() {
	chainStore = &ChainStore{
		chains: make(map[string]*models.RelayChain),
	}
	chainStore.seedChains()
}

// GetChainStore returns the global chain store
func GetChainStore() *ChainStore {
	return chainStore
}

// seedChains adds sample chains for testing
func (s *ChainStore) seedChains() {
	// Get existing servers to build a chain
	serverStore := GetStore()
	servers := serverStore.GetAllServers()

	if len(servers) < 3 {
		return
	}

	// Find CN, HK, SG servers
	var cnServer, hkServer, sgServer *models.Server
	for _, srv := range servers {
		switch srv.Country {
		case "CN":
			cnServer = srv
		case "HK":
			hkServer = srv
		case "SG":
			sgServer = srv
		}
	}

	if cnServer == nil || hkServer == nil || sgServer == nil {
		return
	}

	chain := &models.RelayChain{
		ID:          uuid.New().String(),
		Name:        "China-SG-Premium",
		Description: "Optimized route for China users via HK relay to SG main node",
		Status:      "healthy",
		TotalLatency: 115,
		CreatedAt:   time.Now().Add(-7 * 24 * time.Hour),
		Hops: []models.Hop{
			{
				Order:       1,
				ServerID:    cnServer.ID,
				ServerName:  cnServer.Name,
				Country:     cnServer.Country,
				CountryFlag: cnServer.CountryFlag,
				IP:          cnServer.IP,
				Role:        "entry",
				Latency:     35,
				Status:      "online",
				IsHidden:    false,
				PacketLoss:  0.1,
			},
			{
				Order:       2,
				ServerID:    hkServer.ID,
				ServerName:  hkServer.Name,
				Country:     hkServer.Country,
				CountryFlag: hkServer.CountryFlag,
				IP:          hkServer.IP,
				Role:        "relay",
				Latency:     50,
				Status:      "online",
				IsHidden:    true,
				PacketLoss:  0.2,
			},
			{
				Order:       3,
				ServerID:    sgServer.ID,
				ServerName:  sgServer.Name,
				Country:     sgServer.Country,
				CountryFlag: sgServer.CountryFlag,
				IP:          sgServer.IP,
				Role:        "main",
				Latency:     30,
				Status:      "online",
				IsHidden:    true,
				PacketLoss:  0.05,
			},
		},
	}

	s.chains[chain.ID] = chain
}

// GetAllChains returns all chains
func (s *ChainStore) GetAllChains() []*models.RelayChain {
	s.mu.RLock()
	defer s.mu.RUnlock()

	chains := make([]*models.RelayChain, 0, len(s.chains))
	for _, chain := range s.chains {
		chains = append(chains, chain)
	}
	return chains
}

// GetChainByID returns a single chain
func (s *ChainStore) GetChainByID(id string) (*models.RelayChain, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	chain, exists := s.chains[id]
	if !exists {
		return nil, errors.New("chain not found")
	}
	return chain, nil
}

// CreateChain adds a new chain
func (s *ChainStore) CreateChain(req *models.CreateChainRequest) (*models.RelayChain, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	serverStore := GetStore()
	hops := make([]models.Hop, 0, len(req.ServerIDs))

	for i, srvID := range req.ServerIDs {
		srv, err := serverStore.GetServerByID(srvID)
		if err != nil {
			return nil, errors.New("server not found: " + srvID)
		}

		role := "relay"
		isHidden := true
		if i == 0 {
			role = "entry"
			isHidden = false
		} else if i == len(req.ServerIDs)-1 {
			role = "main"
		}

		hops = append(hops, models.Hop{
			Order:       i + 1,
			ServerID:    srv.ID,
			ServerName:  srv.Name,
			Country:     srv.Country,
			CountryFlag: srv.CountryFlag,
			IP:          srv.IP,
			Role:        role,
			Latency:     40 + i*20, // dummy latency
			Status:      srv.Status,
			IsHidden:    isHidden,
			PacketLoss:  0.1,
		})
	}

	totalLatency := 0
	for _, h := range hops {
		totalLatency += h.Latency
	}

	chain := &models.RelayChain{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Description:  req.Description,
		Status:       "healthy",
		TotalLatency: totalLatency,
		CreatedAt:    time.Now(),
		Hops:         hops,
	}

	s.chains[chain.ID] = chain
	return chain, nil
}

// DeleteChain removes a chain
func (s *ChainStore) DeleteChain(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.chains[id]; !exists {
		return errors.New("chain not found")
	}
	delete(s.chains, id)
	return nil
}