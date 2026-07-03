package monitor

import (
	"context"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/database"
)

// agentTimeout is how long without a heartbeat before an agent is considered
// offline. Agents heartbeat every ~3s, so 20s tolerates transient hiccups.
const agentTimeout = 20 * time.Second

// StartAgentReaper marks agents offline once their heartbeats stop.
func StartAgentReaper(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				database.GetStore().ReapStaleAgents(agentTimeout)
			}
		}
	}()
}
