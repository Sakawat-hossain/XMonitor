// Package sshutil dials SSH connections to monitored servers.
package sshutil

import (
	"errors"
	"fmt"
	"time"

	"github.com/sakaw/xmonitor/backend/internal/models"
	"golang.org/x/crypto/ssh"
)

// Dial opens an SSH connection to a server using its stored credentials.
func Dial(srv *models.Server) (*ssh.Client, error) {
	if srv.SSHUser == "" || srv.SSHPassword == "" {
		return nil, errors.New("server has no SSH credentials configured — set them in server settings")
	}
	port := srv.SSHPort
	if port == 0 {
		port = 22
	}

	config := &ssh.ClientConfig{
		User: srv.SSHUser,
		Auth: []ssh.AuthMethod{ssh.Password(srv.SSHPassword)},
		// Monitored servers are added by the admin; TOFU-style host key
		// pinning is planned alongside the agent.
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	return ssh.Dial("tcp", fmt.Sprintf("%s:%d", srv.IP, port), config)
}
