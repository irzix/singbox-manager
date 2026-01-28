#!/bin/sh
set -e

CONFIG_FILE="/etc/sing-box/config.json"
STATE_FILE="/var/lib/singbox-manager/state.json"

# Generate config if not exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Generating initial configuration..."
    node dist/index.js init --host "${SERVER_HOST:-0.0.0.0}" --port "${SERVER_PORT:-443}"
fi

# Start sing-box in background
echo "Starting sing-box..."
sing-box run -c "$CONFIG_FILE" &
SINGBOX_PID=$!

# Start web API
echo "Starting management API on port 3000..."
node dist/server.js &
API_PID=$!

# Handle shutdown
trap "kill $SINGBOX_PID $API_PID 2>/dev/null" EXIT

# Wait for processes
wait $SINGBOX_PID $API_PID
