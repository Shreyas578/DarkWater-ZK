#!/bin/bash
# Start both backend and frontend locally

echo "🌊 Starting DarkWater ZK locally..."

# Start backend
cd backend
npm install
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend
npm install
VITE_API_URL=http://localhost:3001 npm run dev &
FRONTEND_PID=$!

echo "✅ Backend running on http://localhost:3001"
echo "✅ Frontend running on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
