package main

import (
	"context"
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	gdeltv1connect "imply/server/gen/gdelt/v1/gdeltv1connect"
	"imply/server/config"
	"imply/server/database"
	servergdelt "imply/server"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

var configPath = flag.String("config", config.FindConfig(), "Path to config file")

func main() {
	flag.Parse()

	logger := log.New(os.Stdout, "[SERVER] ", log.LstdFlags|log.Lmsgprefix)

	// Load configuration
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	dbClient, err := database.NewClient(database.Config{DatabaseURL: cfg.DatabaseURL})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbClient.Close()

	logger.Println("Connected to database")

	// Create schema (idempotent)
	if err := dbClient.CreateSchema(); err != nil {
		log.Fatalf("Failed to create schema: %v", err)
	}

	logger.Println("Database schema ready")

	mux := http.NewServeMux()

	// GDELT service
	gdeltPath, gdeltHandler := gdeltv1connect.NewGdeltServiceHandler(
		servergdelt.NewService(),
	)
	mux.Handle(gdeltPath, gdeltHandler)

	// CORS middleware
	handler := withCORS(mux, cfg.FrontendURL)

	// HTTP/2 with h2c support (HTTP/2 Cleartext)
	h2s := &http2.Server{}
	handler = h2c.NewHandler(handler, h2s)

	addr := cfg.ListenAddr
	logger.Printf("Starting server on %s", addr)

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		logger.Fatalf("Failed to listen: %v", err)
	}

	srv := &http.Server{
		Handler:      handler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		logger.Println("Shutting down server...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(ctx)
	}()

	if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
		logger.Fatalf("Server failed: %v", err)
	}

	logger.Println("Server stopped")
}

// withCORS adds CORS headers to all responses
func withCORS(next http.Handler, frontendURL string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", frontendURL)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Connect-Protocol-Version")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Type, Connect-Protocol-Version")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Check for Connect protocol header
		if r.Header.Get("Connect-Protocol-Version") == "" {
			// This is not a Connect RPC request, return 404
			http.NotFound(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

