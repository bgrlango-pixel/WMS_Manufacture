#!/bin/bash

# Start Node.js service in background
cd /app/node
node server.js &

# Start Python service
cd /app
python -m uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8080}