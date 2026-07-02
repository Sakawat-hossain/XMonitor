package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/sakaw/xmonitor/backend/internal/database"
	"github.com/sakaw/xmonitor/backend/internal/models"
)

// GetChains returns all relay chains
func GetChains(c *gin.Context) {
	store := database.GetChainStore()
	chains := store.GetAllChains()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"count":   len(chains),
		"data":    chains,
	})
}

// GetChain returns a single chain by ID
func GetChain(c *gin.Context) {
	id := c.Param("id")
	store := database.GetChainStore()

	chain, err := store.GetChainByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    chain,
	})
}

// CreateChain adds a new chain
func CreateChain(c *gin.Context) {
	var req models.CreateChainRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	store := database.GetChainStore()
	chain, err := store.CreateChain(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    chain,
	})
}

// UpdateChain edits an existing chain
func UpdateChain(c *gin.Context) {
	var req models.UpdateChainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	chain, err := database.GetChainStore().UpdateChain(c.Param("id"), &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "chain not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    chain,
	})
}

// TestChain pings each hop and returns the refreshed chain
func TestChain(c *gin.Context) {
	chain, err := database.GetChainStore().TestChain(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    chain,
	})
}

// DeleteChain removes a chain
func DeleteChain(c *gin.Context) {
	id := c.Param("id")
	store := database.GetChainStore()

	if err := store.DeleteChain(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Chain deleted successfully",
	})
}
