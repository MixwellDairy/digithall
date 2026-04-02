@echo off
echo --- Starting DigiHall ---

ipconfig | findstr IPv4

echo Access the app at: http://localhost:3000

cd backend
start node dist/index.js

cd ../frontend
start npm run preview -- --host 0.0.0.0 --port 3000

echo --- DigiHall is running! ---
pause
