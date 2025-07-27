#!/bin/bash

# Start Server Script for Linux
# This script starts the Node.js server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/server.pid"

# Function to check if server is already running
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

echo "Starting server..."

# Check if server is already running
if check_server; then
    echo "Server is already running with PID: $(cat "$PID_FILE")"
    echo "Server is available at http://localhost:3000"
    echo "To restart the server, use: ./restart_server.sh"
    echo "To stop the server, use: ./stop_server.sh"
    exit 0
fi

# Change to script directory
cd "$SCRIPT_DIR"

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found in $SCRIPT_DIR"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

echo "Starting Node.js server..."

# Start server in background
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!

# Save PID
echo "$SERVER_PID" > "$PID_FILE"

# Wait a moment and check if server started successfully
sleep 3
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo "Server started successfully!"
    echo "PID: $SERVER_PID"
    echo "Server is running at http://localhost:3000"
    echo "Logs are being written to server.log"
    echo ""
    echo "To stop the server: ./stop_server.sh"
    echo "To restart the server: ./restart_server.sh"
    echo "To view logs: tail -f server.log"
else
    echo "ERROR: Server failed to start"
    echo "Check server.log for error details"
    rm -f "$PID_FILE"
    exit 1
fi