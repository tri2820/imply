package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config holds the server configuration
type Config struct {
	ListenAddr   string `json:"listen_addr"`
	DatabaseURL  string `json:"database_url"`
	JWTSecret    string `json:"jwt_secret"`
	FrontendURL  string `json:"frontend_url"`
}

// LoadConfig loads the server configuration from a file
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Validate required fields
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("database_url is required")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("jwt_secret is required")
	}

	// Set defaults
	if cfg.ListenAddr == "" {
		cfg.ListenAddr = ":8080"
	}
	if cfg.FrontendURL == "" {
		cfg.FrontendURL = "http://localhost:3000"
	}

	return &cfg, nil
}

// FindConfig finds the config file, checking local directory first, then ~/.imply/
func FindConfig() string {
	// Check local directory first
	if _, err := os.Stat("server.config.json"); err == nil {
		return "server.config.json"
	}

	// Check ~/.imply/
	homeDir, err := os.UserHomeDir()
	if err == nil {
		configPath := filepath.Join(homeDir, ".imply", "server.config.json")
		if _, err := os.Stat(configPath); err == nil {
			return configPath
		}
	}

	return "server.config.json"
}
