#!/bin/bash
VENV_PATH="/home/jerry/workspace/venv/bin/python"
SERVER_PATH="/home/jerry/workspace/nas_tool/nas/unified_nexus.py"
LOG_PATH="/home/jerry/workspace/nas_tool/nas/nas_server.log"

# Ensure Tailscale is up
sudo tailscale up || echo "Tailscale already up or failed to start"

# Run NAS Server
nohup $VENV_PATH $SERVER_PATH > $LOG_PATH 2>&1 &
echo "NAS Server started on port 8000. Log: $LOG_PATH"
