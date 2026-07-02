package handlers

import (
	"io"
	"net/http"
	"path"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/pkg/sftp"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
	"github.com/sakaw/xmonitor/backend/internal/sshutil"
)

type fileEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"is_dir"`
	Mode    string `json:"mode"`
	ModTime string `json:"mod_time"`
}

// withSFTP resolves the server, opens an SFTP session, runs fn, and cleans up.
func withSFTP(c *gin.Context, fn func(*sftp.Client, *models.Server)) {
	srv, err := database.GetStore().GetServerByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	sshClient, err := sshutil.Dial(srv)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer sshClient.Close()

	client, err := sftp.NewClient(sshClient)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "error": "SFTP failed: " + err.Error()})
		return
	}
	defer client.Close()

	fn(client, srv)
}

// cleanRemotePath normalizes a user-supplied path to an absolute one
func cleanRemotePath(p string) string {
	if p == "" {
		p = "/"
	}
	return path.Clean("/" + p)
}

// ListFiles returns a directory listing (?path=/var/log)
func ListFiles(c *gin.Context) {
	withSFTP(c, func(client *sftp.Client, _ *models.Server) {
		dir := cleanRemotePath(c.Query("path"))
		entries, err := client.ReadDir(dir)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}

		files := make([]fileEntry, 0, len(entries))
		for _, e := range entries {
			files = append(files, fileEntry{
				Name:    e.Name(),
				Path:    path.Join(dir, e.Name()),
				Size:    e.Size(),
				IsDir:   e.IsDir(),
				Mode:    e.Mode().String(),
				ModTime: e.ModTime().Format("2006-01-02 15:04"),
			})
		}
		sort.Slice(files, func(i, j int) bool {
			if files[i].IsDir != files[j].IsDir {
				return files[i].IsDir
			}
			return files[i].Name < files[j].Name
		})
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"path": dir, "files": files}})
	})
}

// DownloadFile streams a remote file (?path=/etc/hosts)
func DownloadFile(c *gin.Context) {
	withSFTP(c, func(client *sftp.Client, _ *models.Server) {
		p := cleanRemotePath(c.Query("path"))
		f, err := client.Open(p)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		defer f.Close()

		c.Header("Content-Disposition", `attachment; filename="`+path.Base(p)+`"`)
		c.Header("Content-Type", "application/octet-stream")
		io.Copy(c.Writer, f)
	})
}

// UploadFile writes an uploaded multipart file into ?path=<dir>
func UploadFile(c *gin.Context) {
	withSFTP(c, func(client *sftp.Client, _ *models.Server) {
		dir := cleanRemotePath(c.Query("path"))
		fileHeader, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "no file provided"})
			return
		}

		src, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		defer src.Close()

		dst, err := client.Create(path.Join(dir, path.Base(fileHeader.Filename)))
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"success": false, "error": err.Error()})
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, src); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Uploaded " + fileHeader.Filename})
	})
}

// DeleteFile removes a remote file or empty directory (?path=)
func DeleteFile(c *gin.Context) {
	withSFTP(c, func(client *sftp.Client, _ *models.Server) {
		p := cleanRemotePath(c.Query("path"))
		info, err := client.Stat(p)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		if info.IsDir() {
			err = client.RemoveDirectory(p)
		} else {
			err = client.Remove(p)
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Deleted"})
	})
}

// RenameFile moves a remote file: JSON body {from, to}
func RenameFile(c *gin.Context) {
	var req struct {
		From string `json:"from" binding:"required"`
		To   string `json:"to" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	withSFTP(c, func(client *sftp.Client, _ *models.Server) {
		if err := client.Rename(cleanRemotePath(req.From), cleanRemotePath(req.To)); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Renamed"})
	})
}
