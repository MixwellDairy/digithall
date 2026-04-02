#!/bin/bash

# DigiHall Install Script for macOS/Linux

echo "--- DigiHall Installation ---"

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Attempting to install..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if ! command -v brew &> /dev/null; then
            echo "Homebrew not found. Please install Homebrew or Node.js manually."
            exit 1
        fi
        brew install node
    else
        # Linux
        sudo apt-get update && sudo apt-get install -y nodejs npm || { echo "Failed to install Node.js automatically. Please install it manually."; exit 1; }
    fi
fi

echo "Installing backend dependencies..."
cd backend && npm install
npx tsc
npx prisma migrate deploy
node prisma/seed.js

echo "Installing frontend dependencies..."
cd ../frontend && npm install
npm run build

echo "--- Installation Complete! ---"
echo "To start the server, run: ./start.sh"
