# DarkWater ZK - Deployment Guide

## Deploy to Render

### Prerequisites
1. GitHub account
2. Render account (free tier works)
3. Deployed Stellar contracts (see main README.md)

### Step-by-Step Deployment

#### 1. Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/darkwater-zk.git
git push -u origin main
```

#### 2. Deploy on Render

**Option A: Using render.yaml (Recommended)**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click "Apply"
6. Set environment variables:
   - `VITE_BATTLESHIP_CONTRACT_ID`: Your deployed contract ID from `.env`
   - `VITE_VERIFIER_CONTRACT_ID`: Your verifier contract ID from `.env`

**Option B: Manual Setup**

**Backend:**
1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - Name: `darkwater-backend`
   - Environment: `Node`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Instance Type: Free
5. Click "Create Web Service"
6. Copy the backend URL (e.g., `https://darkwater-backend.onrender.com`)

**Frontend:**
1. Click "New" → "Static Site"
2. Connect your GitHub repo
3. Settings:
   - Name: `darkwater-frontend`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
4. Environment Variables:
   - `VITE_API_URL`: `https://darkwater-backend.onrender.com` (your backend URL)
   - `VITE_BATTLESHIP_CONTRACT_ID`: From your `.env` file
   - `VITE_VERIFIER_CONTRACT_ID`: From your `.env` file
   - `VITE_STELLAR_RPC_URL`: `https://soroban-testnet.stellar.org`
   - `VITE_STELLAR_PASSPHRASE`: `Test SDF Network ; September 2015`
5. Click "Create Static Site"

#### 3. Access Your App

After deployment completes (5-10 minutes):
- Frontend: `https://darkwater-frontend.onrender.com`
- Backend: `https://darkwater-backend.onrender.com`

### Testing the Deployment

1. Open the frontend URL
2. Connect your xBull wallet
3. Create a game → Get room code
4. Share the room code with a friend
5. Friend opens the same URL, enters code, joins game
6. Both players can now play from different locations!

### Troubleshooting

**Backend not responding:**
- Check Render logs: Dashboard → darkwater-backend → Logs
- Verify backend URL is correct in frontend env vars

**Frontend can't connect to backend:**
- Check browser console for CORS errors
- Verify `VITE_API_URL` is set correctly
- Backend must be deployed first

**Contract calls failing:**
- Verify contract IDs are correct
- Check Stellar testnet status
- Ensure wallet has testnet XLM (use Friendbot)

### Free Tier Limitations

Render free tier:
- Backend spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month (enough for testing)

For production, upgrade to paid tier for:
- Always-on backend
- Custom domains
- Better performance

### Local Development

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Environment Variables Summary

**Backend:**
- `PORT`: Auto-set by Render
- `NODE_ENV`: production

**Frontend:**
- `VITE_API_URL`: Backend URL
- `VITE_BATTLESHIP_CONTRACT_ID`: Your contract
- `VITE_VERIFIER_CONTRACT_ID`: Your verifier
- `VITE_STELLAR_RPC_URL`: Stellar RPC endpoint
- `VITE_STELLAR_PASSPHRASE`: Network passphrase

### Next Steps

1. Test the deployment thoroughly
2. Share the URL with friends to play
3. Monitor Render logs for errors
4. Consider upgrading for production use

---

**Need Help?**
- Check Render docs: https://render.com/docs
- Stellar docs: https://soroban.stellar.org
