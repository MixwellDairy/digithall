@echo off
echo --- DigiHall Installation for Windows ---

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found. Please install Node.js from https://nodejs.org/
    exit /b 1
)

set /p RESTORE="Do you want to restore from an existing backup? (y/n) "
if /i "%RESTORE%"=="y" (
    set /p BACKUP_PATH="Enter the path to your backup .db file: "
    if exist "%BACKUP_PATH%" (
        if not exist backend\prisma mkdir backend\prisma
        copy "%BACKUP_PATH%" backend\prisma\dev.db
        echo Database restored from %BACKUP_PATH%
    ) else (
        echo Error: Backup file not found at %BACKUP_PATH%
        exit /b 1
    )
)

echo Installing backend dependencies...
cd backend
call npm install

if not exist .env (
    echo Generating environment configuration...
    echo DATABASE_URL="file:./dev.db" > .env
    echo JWT_SECRET="super-secret-key-change-me" >> .env
    echo PORT=3001 >> .env
)

echo Building backend...
call npx tsc
call npx prisma migrate deploy

if /i not "%RESTORE%"=="y" (
    call node prisma/seed.js
)

echo Installing frontend dependencies...
cd ../frontend
call npm install
echo Building frontend...
call npm run build

echo --- Installation Complete! ---
echo To start the server, run: start.bat
pause
