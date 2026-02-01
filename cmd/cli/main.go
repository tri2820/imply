package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"imply/server/config"
	"imply/server/database"
)

var (
	configPath = flag.String("config", config.FindConfig(), "Path to config file")
)

func main() {
	flag.Parse()

	if len(flag.Args()) == 0 {
		fmt.Println("Usage: cli <command>")
		fmt.Println("Commands:")
		fmt.Println("  drop    - Drop database schema (destructive)")
		fmt.Println("  init    - Initialize database schema")
		os.Exit(1)
	}

	command := flag.Args()[0]

	// Load configuration
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	dbClient, err := database.NewClient(database.Config{DatabaseURL: cfg.DatabaseURL})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbClient.Close()

	switch command {
	case "drop":
		if err := dbClient.DropSchema(); err != nil {
			log.Fatalf("Failed to drop schema: %v", err)
		}
		fmt.Println("Database schema dropped successfully")

	case "init":
		if err := dbClient.CreateSchema(); err != nil {
			log.Fatalf("Failed to create schema: %v", err)
		}
		fmt.Println("Database schema initialized successfully")

	default:
		log.Fatalf("Unknown command: %s", command)
	}
}
