# Server Management Scripts for Linux

This directory contains bash scripts to manage the Node.js server on Linux systems.

## Scripts Overview

### Basic Scripts

1. **`start_server.sh`** - Start the server
2. **`stop_server.sh`** - Stop the server
3. **`restart_server.sh`** - Simple restart (stop + start)
4. **`restart_server_advanced.sh`** - Advanced restart with logging

## Usage

### Make Scripts Executable

First, make the scripts executable:

```bash
chmod +x *.sh
```

### Starting the Server

```bash
./start_server.sh
```

- Checks if server is already running
- Starts the server in background
- Creates a PID file for process management
- Logs output to `server.log`

### Stopping the Server

```bash
./stop_server.sh
```

- Gracefully stops the server using PID file
- Falls back to killing by process name if needed
- Cleans up PID file

### Restarting the Server

**Simple restart:**
```bash
./restart_server.sh
```

**Advanced restart with logging:**
```bash
./restart_server_advanced.sh
```

## Features

### Process Management
- Uses PID files for reliable process tracking
- Graceful shutdown with fallback to force kill
- Prevents multiple server instances

### Logging
- Server output logged to `server.log`
- Advanced script logs to `server_restart.log`
- Timestamped log entries

### Error Handling
- Checks for Node.js installation
- Verifies `server.js` exists
- Validates server startup success

## Files Created

- `server.pid` - Contains the process ID of the running server
- `server.log` - Server output and error logs
- `server_restart.log` - Restart script activity log (advanced script only)

## Troubleshooting

### Server Won't Start
1. Check if Node.js is installed: `node --version`
2. Verify `server.js` exists in the directory
3. Check `server.log` for error messages
4. Ensure port 3000 is not already in use: `netstat -tlnp | grep :3000`

### Server Won't Stop
1. Try force stopping: `pkill -9 -f "node server.js"`
2. Remove stale PID file: `rm -f server.pid`
3. Check for zombie processes: `ps aux | grep node`

### Permission Issues
1. Make scripts executable: `chmod +x *.sh`
2. Ensure you have write permissions in the directory

## Manual Commands

If scripts don't work, you can use these manual commands:

```bash
# Start server manually
node server.js &
echo $! > server.pid

# Stop server manually
kill $(cat server.pid)
rm server.pid

# Check if server is running
ps -p $(cat server.pid) 2>/dev/null && echo "Running" || echo "Not running"
```

## Integration with System Services

For production use, consider creating a systemd service:

```bash
# Create service file
sudo nano /etc/systemd/system/mywebapp.service
```

Example service file content:
```ini
[Unit]
Description=MyWeb Node.js Application
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/your/project
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then manage with systemctl:
```bash
sudo systemctl enable mywebapp
sudo systemctl start mywebapp
sudo systemctl status mywebapp
```