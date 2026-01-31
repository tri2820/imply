package gdelt

import (
	"fmt"
)

// ErrorCode represents different types of API errors
type ErrorCode int

const (
	ErrorCodeOK ErrorCode = 200 + iota
	ErrorCodeBadRequest
	ErrorCodeNotFound
	ErrorCodeRateLimit
)

// Error types
type BadRequestError struct {
	Message string
	Body    string
}

func (e *BadRequestError) Error() string {
	return fmt.Sprintf("bad request: %s", e.Message)
}

type NotFoundError struct {
	Message string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("not found: %s", e.Message)
}

type RateLimitError struct {
	Message string
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("rate limit exceeded: %s", e.Message)
}

type ClientRequestError struct {
	StatusCode int
	Message    string
}

func (e *ClientRequestError) Error() string {
	return fmt.Sprintf("client error (status %d): %s", e.StatusCode, e.Message)
}

type ServerError struct {
	StatusCode int
	Message    string
}

func (e *ServerError) Error() string {
	return fmt.Sprintf("server error (status %d): %s", e.StatusCode, e.Message)
}

type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API error (status %d): %s", e.StatusCode, e.Message)
}
