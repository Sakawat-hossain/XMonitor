// Package ws implements the WebSocket hub that pushes live updates
// to connected dashboard clients.
package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/sakaw/xmonitor/backend/internal/database"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000" || origin == "http://localhost:3001" || origin == ""
	},
}

// Hub tracks connected clients and broadcasts messages to them.
type Hub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]chan []byte
}

var hub = &Hub{clients: make(map[*websocket.Conn]chan []byte)}

// GetHub returns the global hub
func GetHub() *Hub {
	return hub
}

// Broadcast queues a message for every connected client
func (h *Hub) Broadcast(msgType string, data interface{}) {
	payload, err := json.Marshal(map[string]interface{}{
		"type": msgType,
		"data": data,
	})
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, ch := range h.clients {
		select {
		case ch <- payload:
		default: // drop for slow clients rather than blocking the hub
		}
	}
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) add(conn *websocket.Conn) chan []byte {
	ch := make(chan []byte, 16)
	h.mu.Lock()
	h.clients[conn] = ch
	h.mu.Unlock()
	return ch
}

func (h *Hub) remove(conn *websocket.Conn) {
	h.mu.Lock()
	if ch, ok := h.clients[conn]; ok {
		close(ch)
		delete(h.clients, conn)
	}
	h.mu.Unlock()
	conn.Close()
}

// Handler upgrades the connection and streams broadcasts until it closes.
// Public endpoint: it carries the same data as the public GET APIs.
func Handler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	ch := hub.add(conn)
	slog.Debug("ws client connected", "total", hub.ClientCount())

	// Writer: forward broadcasts
	go func() {
		for payload := range ch {
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
				hub.remove(conn)
				return
			}
		}
	}()

	// Reader: detect close (we don't expect client messages)
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			hub.remove(conn)
			return
		}
	}
}

// StartBroadcaster pushes a server snapshot to all clients every 5s.
func StartBroadcaster(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if hub.ClientCount() == 0 {
					continue
				}
				hub.Broadcast("server_update", database.GetStore().GetAllServers())
			}
		}
	}()
}
