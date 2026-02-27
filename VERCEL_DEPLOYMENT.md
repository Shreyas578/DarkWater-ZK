# DarkWater ZK - Vercel Deployment Guide

## 🚀 Deploy to Vercel (Recommended)

Vercel is perfect for this project - it's fast, free, and handles both frontend and backend automatically!

### Prerequisites
1. GitHub account
2. Vercel account (free tier) - Sign up at https://vercel.com
3. Supabase account (free tier) - Sign up at https://supabase.com
4. Deployed Stellar contracts (contract IDs from `.env`)

---

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Ready for Vercel deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/darkwater-zk.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

#### Option A: One-Click Deploy (Easiest)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `darkwater-zk` repository
4. Vercel auto-detects the configuration
5. Click "Deploy"

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: darkwater-zk
# - Directory: ./ (root)
# - Override settings? No

# Deploy to production
vercel --prod
```

### Step 3: Set Up Supabase Database

**IMPORTANT:** You must set up Supabase before the app will work!

1. Go to https://supabase.com and create a new project
2. In Supabase dashboard, go to **SQL Editor**
3. Copy contents of `supabase-schema.sql` and run it
4. Go to **Settings** → **API** and copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Service Role Key (starts with `eyJ...`)

See `SUPABASE_SETUP.md` for detailed instructions.

### Step 4: Set Environment Variables

After deployment, add your credentials:

1. Go to your project dashboard on Vercel
2. Click "Settings" → "Environment Variables"
3. Add these variables:

```
VITE_BATTLESHIP_CONTRACT_ID = CBDKFNUFXKRAYCW5Y23ISS5EYMMWTREB55ZLBLGQHPALMCIMYUEBHNAQ
VITE_VERIFIER_CONTRACT_ID = CAMF2KHBHF5NU5K7KQBWVKUUMZBB22I5S2GULBGDQ5FGXOLSITGYZPLT
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...your-service-role-key
```

4. Click "Save"
5. Go to "Deployments" → Click "..." on latest → "Redeploy"

### Step 5: Test Your Deployment

Your app will be live at: `https://darkwater-zk.vercel.app` (or your custom domain)

**Test it:**
1. Open the URL
2. Connect xBull wallet
3. Click "Create Game" → Get room code
4. Share code with a friend
5. Friend opens same URL, enters code, joins
6. Play!

---

## Project Structure for Vercel

```
darkwater-zk/
├── backend/
│   ├── server.js          # API routes (serverless functions)
│   └── package.json
├── frontend/
│   ├── src/
│   ├── dist/              # Built files (auto-generated)
│   └── package.json
├── vercel.json            # Vercel configuration
└── package.json           # Root package.json
```

---

## How It Works

Vercel automatically:
- ✅ Builds the frontend (Vite)
- ✅ Deploys backend as serverless functions
- ✅ Handles routing (`/api/*` → backend, `/*` → frontend)
- ✅ Provides HTTPS
- ✅ Global CDN
- ✅ Auto-deploys on git push

---

## Environment Variables

Set these in Vercel dashboard:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_BATTLESHIP_CONTRACT_ID` | Your contract ID | ✅ Yes |
| `VITE_VERIFIER_CONTRACT_ID` | Your verifier ID | ✅ Yes |
| `VITE_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | Auto-set |
| `VITE_STELLAR_PASSPHRASE` | `Test SDF Network ; September 2015` | Auto-set |

---

## Local Development

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

---

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally first

### API Not Working
- Check `/api/health` endpoint
- Verify `vercel.json` routes are correct
- Check Vercel function logs

### Contract Calls Failing
- Verify contract IDs in environment variables
- Check Stellar testnet status
- Ensure wallet has testnet XLM

### Room Not Found Error
- Backend might be cold-starting (first request)
- Wait 5 seconds and try again
- Check browser console for API errors

---

## Custom Domain (Optional)

1. Go to Vercel project → "Settings" → "Domains"
2. Add your domain (e.g., `darkwater.yourdomain.com`)
3. Follow DNS configuration instructions
4. Done! Your game is now at your custom domain

---

## Vercel Free Tier Limits

Perfect for this project:
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Serverless functions (100 GB-hours)
- ✅ Automatic HTTPS
- ✅ Global CDN

---

## Production Optimizations

For heavy usage, consider:

1. **Vercel KV** (Redis) for room storage:
```bash
vercel kv create darkwater-rooms
```

2. **Analytics**:
```bash
vercel analytics enable
```

3. **Edge Functions** for lower latency

---

## Continuous Deployment

Vercel auto-deploys on every push:

```bash
git add .
git commit -m "Update game logic"
git push

# Vercel automatically:
# 1. Detects push
# 2. Builds project
# 3. Deploys to production
# 4. Updates live site
```

---

## Monitoring

View logs and metrics:
1. Go to Vercel dashboard
2. Select your project
3. Click "Logs" or "Analytics"
4. Monitor API calls, errors, performance

---

## Support

- Vercel Docs: https://vercel.com/docs
- Stellar Docs: https://soroban.stellar.org
- GitHub Issues: Create an issue in your repo

---

## Summary

✅ **Deployed!** Your ZK Battleship game is now live and accessible worldwide.

Share your URL with friends and start playing! 🌊🚢

**Your deployment URL:** `https://darkwater-zk.vercel.app`
