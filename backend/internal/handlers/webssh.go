package handlers

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/sshutil"
	"golang.org/x/crypto/ssh"
)

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000" || origin == "http://localhost:3001" || origin == ""
	},
}

// WebSSH bridges a browser WebSocket to an SSH shell on the target server.
// Text messages are keystrokes; binary messages of the form "resize:cols:rows"
// are handled client-side before sending as JSON control frames.
func WebSSH(c *gin.Context) {
	srv, err := database.GetStore().GetServerByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	sshClient, err := sshutil.Dial(srv)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mSSH connection failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}
	defer sshClient.Close()

	session, err := sshClient.NewSession()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mSSH session failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}
	defer session.Close()

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	if err := session.RequestPty("xterm-256color", 30, 120, modes); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mPTY request failed\x1b[0m\r\n"))
		return
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		return
	}
	stdout, err := session.StdoutPipe()
	if err != nil {
		return
	}
	session.Stderr = session.Stdout // interleave into the same stream

	if err := session.Shell(); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mShell start failed\x1b[0m\r\n"))
		return
	}

	// SSH → browser
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 4096)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				if werr := conn.WriteMessage(websocket.TextMessage, buf[:n]); werr != nil {
					return
				}
			}
			if err != nil {
				return
			}
		}
	}()

	// Browser → SSH
	for {
		select {
		case <-done:
			return
		default:
		}
		_, msg, err := conn.ReadMessage()
		if err != nil {
			slog.Debug("webssh websocket closed", "server", srv.Name)
			return
		}
		if _, err := stdin.Write(msg); err != nil {
			return
		}
	}
}
