@echo off
echo Starting DarkWater ZK Development Servers...
echo.

REM Start backend in new window
start "Backend API" cmd /k "cd backend && npm install && npm start"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak

REM Start frontend in new window
start "Frontend" cmd /k "cd frontend && set VITE_API_URL=http://localhost:3001 && npm run dev"

echo.
echo ✅ Both servers starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop all servers...
pause
taskkill /FI "WindowTitle eq Backend API*" /T /F
taskkill /FI "WindowTitle eq Frontend*" /T /F
