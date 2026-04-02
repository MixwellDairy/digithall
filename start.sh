#!/bin/bash

# DigiHall Start Script

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
  IP_ADDR=$(ipconfig getifaddr en0)
else
  IP_ADDR=$(hostname -I | awk '{print $1}')
fi

echo "--- Starting DigiHall ---"
echo "Host computer IP: $IP_ADDR"
echo "Access the app at: http://$IP_ADDR:3000"

# Kill existing processes on 3000 and 3001
kill $(lsof -t -i :3000) 2>/dev/null || true
kill $(lsof -t -i :3001) 2>/dev/null || true

# Run backend
cd backend && node dist/index.js &

# Run frontend (preview mode for production-like local hosting)
cd ../frontend && npm run preview -- --host 0.0.0.0 --port 3000 &

wait
