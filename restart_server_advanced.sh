#!/bin/bash

# Advanced Server Restart Script for Linux
# This script provides better error handling and logging

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/server_restart.log"
PID_FILE="$SCRIPT_DIR/server.pid"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if server is running
check_server() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Server is running
        else
            rm -f "$PID_FILE"  # Remove stale PID file
            return 1  # Server is not running
        fi
    else
        return 1  # No PID file, server not running
    fi
}

# Function to stop server
stop_server() {
    log_message "Stopping server..."
    
    # Try to stop using PID file first
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid"
            log_message "Sent TERM signal to process $pid"
            
            # Wait for graceful shutdown
            local count=0
            while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid"
                log_message "Force killed process $pid"
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Kill any remaining node server.js processes
    pkill -f "node server.js" 2>/dev/null || true
    log_message "Cleaned up any remaining server processes"
}

# Function to start server
start_server() {
    log_message "Starting server..."
    
    # Change to script directory
    cd "$SCRIPT_DIR"
    
    # Check if server.js exists
    if [ ! -f "server.js" ]; then
        log_message "ERROR: server.js not found in $SCRIPT_DIR"
        exit 1
    fi
    
    # Start server in background
    nohup node server.js > server.log 2>&1 &
    local server_pid=$!
    
    # Save PID
    echo "$server_pid" > "$PID_FILE"
    
    # Wait a moment and check if server started successfully
    sleep 3
    if ps -p "$server_pid" > /dev/null 2>&1; then
        log_message "Server started successfully with PID: $server_pid"
        log_message "Server is running at http://localhost:3000"
        log_message "Logs are being written to server.log"
    else
        log_message "ERROR: Server failed to start"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Main script execution
log_message "=== Server Restart Script Started ==="

# Check current server status
if check_server; then
    log_message "Server is currently running"
    stop_server
else
    log_message "No server currently running"
fi

# Wait a moment before starting
sleep 2

# Start the server
start_server

log_message "=== Server Restart Script Completed ==="

# Display status
echo ""
echo "Server restart completed!"
echo "Check server_restart.log for detailed logs"
echo "Server output is in server.log"
echo ""
echo "To stop the server manually:"
echo "  ./stop_server.sh (if available)"
echo "  or kill \$(cat server.pid)"
echo "  or pkill -f 'node server.js'"