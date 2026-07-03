package main

import (
	"context"
	"fmt"
	"log"

	"github.com/sakaw/xmonitor/backend/internal/api"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/monitor"
	"github.com/sakaw/xmonitor/backend/internal/ws"
)

func main() {
	fmt.Println("=====================================")
	fmt.Println("  XMonitor Backend Server")
	fmt.Println("  Version: 0.0.1")
	fmt.Println("=====================================")

	// Initialize in-memory store
	database.InitMemoryStore()
	fmt.Println("✓ Database initialized")

	database.InitChainStore()
	fmt.Println("✓ Chain store initialized")

	database.InitUserStore()
	fmt.Println("✓ User store initialized (default admin: admin/admin123)")

	database.InitServiceStore()
	database.InitAlertStore()
	database.InitCronStore()
	database.InitMetricsStore()
	database.InitProbeStore()
	fmt.Println("✓ Service, alert, cron, metrics & probe stores initialized")

	// Background engines
	ctx := context.Background()
	monitor.StartChecker(ctx)
	monitor.StartEvaluator(ctx)
	monitor.StartCronRunner(ctx)
	monitor.StartSimulator(ctx)
	ws.StartBroadcaster(ctx)
	fmt.Println("✓ Monitoring engines started")

	// Setup router
	router := api.SetupRouter()
	fmt.Println("✓ Routes configured")

	port := ":8080"
	fmt.Printf("\n🚀 Server starting on http://localhost%s\n", port)
	fmt.Printf("📊 Health: http://localhost%s/health\n", port)
	fmt.Printf("📡 API: http://localhost%s/api/v1/servers\n", port)
	fmt.Println("\nPress Ctrl+C to stop\n")

	if err := router.Run(port); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
