#!/bin/bash

# DigiHall Export Script

if [ ! -f "backend/prisma/dev.db" ]; then
  echo "Error: Database file not found in backend/prisma/dev.db"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

cp "backend/prisma/dev.db" "$BACKUP_DIR/digithall_backup_$TIMESTAMP.db"

echo "Database exported successfully to $BACKUP_DIR/digithall_backup_$TIMESTAMP.db"
