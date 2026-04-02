#!/bin/bash

# DigiHall Uninstall Script

echo "--- DigiHall Uninstall ---"
echo "This will remove all application data and settings. Are you sure? (y/n)"
read CONFIRM

if [ "$CONFIRM" == "y" ]; then
    echo "Killing running processes..."
    kill $(lsof -t -i :3000) 2>/dev/null || true
    kill $(lsof -t -i :3001) 2>/dev/null || true

    echo "Removing project files..."
    rm -rf backend/node_modules
    rm -rf backend/dist
    rm -rf frontend/node_modules
    rm -rf frontend/dist

    echo "Do you also want to delete the database and backups? (y/n)"
    read DELETE_DATA
    if [ "$DELETE_DATA" == "y" ]; then
        rm -rf backend/prisma/*.db
        rm -rf backend/prisma/*.db-journal
        rm -rf backups/
        echo "Data and backups deleted."
    fi

    echo "--- Uninstall Complete ---"
else
    echo "Uninstall cancelled."
fi
