#!/bin/bash
VENV_PATH="/home/jerry/workspace/venv/bin/python"
SERVER_PATH="/home/jerry/workspace/finance_server_new.py"
LOG_PATH="/home/jerry/workspace/finance_server.log"
export PORT=5000

# Run Finance Server
nohup $VENV_PATH $SERVER_PATH > $LOG_PATH 2>&1 &

# Start Ngrok tunnel for port 5000
# Note: ngrok needs to be installed and authenticated
nohup ngrok http 5000 > /home/jerry/workspace/ngrok.log 2>&1 &

echo "Finance Server started on port 5000. Ngrok tunnel initiated. Log: $LOG_PATH"
