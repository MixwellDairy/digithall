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

# Restore prompt
echo "Do you want to restore from an existing backup? (y/n)"
read RESTORE
if [ "$RESTORE" == "y" ]; then
    echo "Enter the path to your backup .db file:"
    read BACKUP_PATH
    if [ -f "$BACKUP_PATH" ]; then
        mkdir -p backend/prisma
        cp "$BACKUP_PATH" backend/prisma/dev.db
        echo "Database restored from $BACKUP_PATH"
    else
        echo "Error: Backup file not found at $BACKUP_PATH"
        exit 1
    fi
fi

echo "Installing backend dependencies..."
cd backend && npm install

# Generate .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Generating environment configuration..."
  echo "DATABASE_URL=\"file:./dev.db\"" > .env
  echo "JWT_SECRET=\"$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")\"" >> .env
  echo "PORT=3001" >> .env
fi

npx tsc
npx prisma migrate deploy

if [ "$RESTORE" != "y" ]; then
    node prisma/seed.js
fi

echo "Installing frontend dependencies..."
cd ../frontend && npm install
npm run build

echo "--- Installation Complete! ---"
echo "To start the server, run: ./start.sh"
