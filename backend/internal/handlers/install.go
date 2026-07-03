package handlers

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// installScript is the agent bootstrap. It downloads the prebuilt agent
// binary from the panel, installs a systemd service carrying the secret,
// and starts it. Reads XMONITOR_URL and XMONITOR_SECRET from the env the
// one-line command sets.
const installScript = `#!/usr/bin/env bash
set -euo pipefail

: "${XMONITOR_URL:?set XMONITOR_URL}"
: "${XMONITOR_SECRET:?set XMONITOR_SECRET}"

ARCH="$(uname -m)"; case "$ARCH" in
  x86_64) ARCH=amd64;; aarch64|arm64) ARCH=arm64;; *) echo "unsupported arch $ARCH"; exit 1;; esac

echo "Downloading XMonitor agent (linux/${ARCH})..."
sudo mkdir -p /opt/xmonitor
sudo curl -fsSL "${XMONITOR_URL}/install/agent-linux-${ARCH}" -o /opt/xmonitor/xmonitor-agent
sudo chmod +x /opt/xmonitor/xmonitor-agent

echo "Installing systemd service..."
sudo tee /etc/systemd/system/xmonitor-agent.service >/dev/null <<EOF
[Unit]
Description=XMonitor Agent
After=network.target

[Service]
Environment=XMONITOR_URL=${XMONITOR_URL}
Environment=XMONITOR_SECRET=${XMONITOR_SECRET}
ExecStart=/opt/xmonitor/xmonitor-agent
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now xmonitor-agent
echo "XMonitor agent installed and started."
`

// ServeInstallScript returns the agent bootstrap script.
func ServeInstallScript(c *gin.Context) {
	c.Header("Content-Type", "text/x-shellscript; charset=utf-8")
	c.String(http.StatusOK, installScript)
}

// ServeAgentBinary serves a prebuilt agent binary for a platform if present
// under agent/bin/ (e.g. agent-linux-amd64). Returns 404 with guidance if the
// binary hasn't been built/published yet.
func ServeAgentBinary(c *gin.Context) {
	platform := filepath.Base(c.Param("platform")) // guard against path traversal
	path := filepath.Join("..", "agent", "bin", platform)
	if _, err := os.Stat(path); err != nil {
		// Also allow an env-configured directory for deployments.
		if dir := os.Getenv("XMONITOR_AGENT_DIR"); dir != "" {
			path = filepath.Join(dir, platform)
		}
	}
	if _, err := os.Stat(path); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "agent binary not published for " + platform + " — build agent/ and place it under agent/bin/",
		})
		return
	}
	c.File(path)
}
