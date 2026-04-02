@echo off
echo --- DigiHall Installation for Windows ---

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo Installing backend dependencies...
cd backend
call npm install
echo Building backend...
call npx tsc
call npx prisma migrate deploy
call node prisma/seed.js

echo Installing frontend dependencies...
cd ../frontend
call npm install
echo Building frontend...
call npm run build

echo --- Installation Complete! ---
echo To start the server, run: start.bat
pause
