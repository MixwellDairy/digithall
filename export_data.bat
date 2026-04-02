@echo off
setlocal

if not exist "backend\prisma\dev.db" (
  echo Error: Database file not found in backend\prisma\dev.db
  exit /b 1
)

set TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

copy "backend\prisma\dev.db" "%BACKUP_DIR%\digithall_backup_%TIMESTAMP%.db"

echo Database exported successfully to %BACKUP_DIR%\digithall_backup_%TIMESTAMP%.db
pause
