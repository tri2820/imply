package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	connect "connectrpc.com/connect"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("your-secret-key-change-in-production")

// Claims represents JWT claims
type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// AuthInterceptor creates a new authentication interceptor
func AuthInterceptor(logger *log.Logger, requireAuth bool) connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			// Skip auth if not required
			if !requireAuth {
				return next(ctx, req)
			}

			// Get Authorization header
			authHeader := req.Header().Get("Authorization")
			if authHeader == "" {
				return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("missing authorization header"))
			}

			// Check Bearer token format
			if !strings.HasPrefix(authHeader, "Bearer ") {
				return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid authorization header format"))
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			// Parse and validate token
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return jwtSecret, nil
			})

			if err != nil || !token.Valid {
				logger.Printf("Auth failed: %v", err)
				return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("invalid token"))
			}

			// Add user ID to context
			ctx = context.WithValue(ctx, "user_id", claims.UserID)

			logger.Printf("Authenticated user: %s", claims.UserID)

			return next(ctx, req)
		})
	}
	return interceptor
}

// GenerateToken generates a JWT token for a user
func GenerateToken(userID string) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			// Expires in 24 hours
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// SetJWTSecret sets the JWT secret (call this during initialization)
func SetJWTSecret(secret string) {
	jwtSecret = []byte(secret)
}
