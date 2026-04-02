@echo off
setlocal

echo --- DigiHall Uninstall for Windows ---
set /p CONFIRM="This will remove all application data and settings. Are you sure? (y/n) "

if /i "%CONFIRM%"=="y" (
    echo Killing running processes...
    taskkill /F /IM node.exe 2>nul || true

    echo Removing project files...
    rmdir /s /q backend\node_modules 2>nul
    rmdir /s /q backend\dist 2>nul
    rmdir /s /q frontend\node_modules 2>nul
    rmdir /s /q frontend\dist 2>nul

    set /p DELETE_DATA="Do you also want to delete the database and backups? (y/n) "
    if /i "%DELETE_DATA%"=="y" (
        del /q backend\prisma\*.db 2>nul
        del /q backend\prisma\*.db-journal 2>nul
        rmdir /s /q backups 2>nul
        echo Data and backups deleted.
    )

    echo --- Uninstall Complete ---
    pause
) else (
    echo Uninstall cancelled.
)
