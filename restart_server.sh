#!/bin/bash

# Restart Server Script for Linux
# This script stops the existing Node.js server and starts it again

echo "Restarting server..."

# Find and kill existing Node.js server processes
echo "Stopping existing server processes..."
pkill -f "node server.js" || echo "No existing server process found"

# Wait a moment for processes to fully terminate
sleep 2

# Start the server
echo "Starting server..."
node server.js &

# Get the process ID
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Optional: Save PID to file for future reference
echo $SERVER_PID > server.pid

echo "Server restart completed!"
echo "Server is running at http://localhost:3000"
echo "To stop the server, run: kill $SERVER_PID"
echo "Or use: pkill -f 'node server.js'"