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

// buildHops resolves server IDs into ordered chain hops.
// First hop is the entry (publicly visible), last is the main node.
func buildHops(serverIDs []string) ([]models.Hop, error) {
	serverStore := GetStore()
	hops := make([]models.Hop, 0, len(serverIDs))

	for i, srvID := range serverIDs {
		srv, err := serverStore.GetServerByID(srvID)
		if err != nil {
			return nil, errors.New("server not found: " + srvID)
		}

		role := "relay"
		isHidden := true
		if i == 0 {
			role = "entry"
			isHidden = false
		} else if i == len(serverIDs)-1 {
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
	return hops, nil
}

func totalLatencyOf(hops []models.Hop) int {
	total := 0
	for _, h := range hops {
		total += h.Latency
	}
	return total
}

// CreateChain adds a new chain
func (s *ChainStore) CreateChain(req *models.CreateChainRequest) (*models.RelayChain, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	hops, err := buildHops(req.ServerIDs)
	if err != nil {
		return nil, err
	}
	totalLatency := totalLatencyOf(hops)

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

// UpdateChain edits a chain; empty request fields are left unchanged.
// If ServerIDs is provided, the hops are rebuilt in the new order.
func (s *ChainStore) UpdateChain(id string, req *models.UpdateChainRequest) (*models.RelayChain, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	chain, exists := s.chains[id]
	if !exists {
		return nil, errors.New("chain not found")
	}

	if req.Name != "" {
		chain.Name = req.Name
	}
	if req.Description != "" {
		chain.Description = req.Description
	}
	if req.ServerIDs != nil {
		if len(req.ServerIDs) < 2 {
			return nil, errors.New("a chain needs at least 2 servers")
		}
		hops, err := buildHops(req.ServerIDs)
		if err != nil {
			return nil, err
		}
		chain.Hops = hops
		chain.TotalLatency = totalLatencyOf(hops)
	}
	return chain, nil
}

// TestChain simulates pinging each hop and refreshes hop latencies.
// Real ICMP probing arrives with the agent; until then this jitters the
// stored values so the UI flow can be exercised end to end.
func (s *ChainStore) TestChain(id string) (*models.RelayChain, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	chain, exists := s.chains[id]
	if !exists {
		return nil, errors.New("chain not found")
	}

	total := 0
	for i := range chain.Hops {
		base := 25 + i*15
		jitter := int(time.Now().UnixNano()/1e6) % 20
		chain.Hops[i].Latency = base + jitter
		chain.Hops[i].PacketLoss = float64(jitter) / 100
		total += chain.Hops[i].Latency
	}
	chain.TotalLatency = total
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