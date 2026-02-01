#!/usr/bin/env bash

# tmux.dev.sh - Development tmux session with server + app

# Source the library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/tmux.lib.sh"

# Configuration
SESSION_NAME="imp-dev"
PROJECT_DIR="$(tmux_get_project_dir)"

# Main script
if ! tmux has-session -t "=$SESSION_NAME" 2>/dev/null; then
  echo "Creating and attaching to new tmux session '$SESSION_NAME'."

  # Initialize session (no windows)
  tmux_session_init "$SESSION_NAME"

  # Configure session (mouse, keybindings)
  tmux_configure_session "$SESSION_NAME"

  # Create all windows
  tmux_create_window "$SESSION_NAME" "server" "$PROJECT_DIR" "go run cmd/server/main.go"
  tmux_create_window "$SESSION_NAME" "app" "$PROJECT_DIR" "cd app && bun run dev"

  # Attach to server window
  tmux_session_attach "$SESSION_NAME" "server"
else
  echo "Attaching to existing tmux session '$SESSION_NAME'."
  tmux attach-session -t "$SESSION_NAME"
fi
