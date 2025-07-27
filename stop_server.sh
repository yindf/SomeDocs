#!/bin/bash

# Stop Server Script for Linux
# This script stops the Node.js server gracefully

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/server.pid"

echo "Stopping server..."

# Try to stop using PID file first
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Stopping server with PID: $PID"
        kill "$PID"
        
        # Wait for graceful shutdown
        count=0
        while ps -p "$PID" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            echo "Waiting for server to stop..."
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Force stopping server..."
            kill -9 "$PID"
        fi
        
        echo "Server stopped successfully"
    else
        echo "Server with PID $PID is not running"
    fi
    rm -f "$PID_FILE"
else
    echo "No PID file found, trying to kill by process name..."
fi

# Kill any remaining node server.js processes
if pkill -f "node server.js" 2>/dev/null; then
    echo "Stopped additional server processes"
else
    echo "No additional server processes found"
fi

echo "Server stop completed!"