# DarkWater ZK - Complete Setup Instructions

## Current Status ✅

1. ✅ Contracts deployed to Stellar Testnet
   - Battleship: `CBDKFNUFXKRAYCW5Y23ISS5EYMMWTREB55ZLBLGQHPALMCIMYUEBHNAQ`
   - Verifier: `CAMF2KHBHF5NU5K7KQBWVKUUMZBB22I5S2GULBGDQ5FGXOLSITGYZPLT`
2. ✅ Contract initialized
3. ✅ Frontend configured
4. ✅ Backend API ready (supports both in-memory and Supabase)
5. ✅ Vercel deployment files ready

## What You Need to Do Now

### Option 1: Test Locally (Quick Test)

For testing on localhost with two browser profiles:

1. **Start the backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend runs on `http://localhost:3001`

2. **Start the frontend (in another terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

3. **Test with two browsers:**
   - Open Chrome with Profile A → `http://localhost:5173`
   - Open Chrome with Profile B (or different browser) → `http://localhost:5173`
   - Profile A: Create game → Get room code
   - Profile B: Join game with code
   - Both players place ships and play!

**Note:** Local testing uses in-memory storage, so it only works while the backend is running.

---

### Option 2: Deploy to Production (Recommended)

For real multi-user deployment where anyone can play:

#### Step 1: Set Up Supabase (Required!)

1. Go to https://supabase.com
2. Create a new project (free tier is fine)
3. Wait for project to be ready (~2 minutes)
4. Go to **SQL Editor** in Supabase dashboard
5. Copy the contents of `supabase-schema.sql` file
6. Paste and click **Run** to create the database table
7. Go to **Settings** → **API** and copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (the secret one, starts with `eyJ...`)

See `SUPABASE_SETUP.md` for detailed instructions.

#### Step 2: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect the configuration
6. Click "Deploy"

#### Step 3: Add Environment Variables in Vercel

1. In Vercel dashboard, go to your project
2. Click **Settings** → **Environment Variables**
3. Add these variables:

   ```
   VITE_BATTLESHIP_CONTRACT_ID = CBDKFNUFXKRAYCW5Y23ISS5EYMMWTREB55ZLBLGQHPALMCIMYUEBHNAQ
   VITE_VERIFIER_CONTRACT_ID = CAMF2KHBHF5NU5K7KQBWVKUUMZBB22I5S2GULBGDQ5FGXOLSITGYZPLT
   VITE_STELLAR_RPC_URL = https://soroban-testnet.stellar.org
   VITE_STELLAR_PASSPHRASE = Test SDF Network ; September 2015
   SUPABASE_URL = https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...your-service-role-key
   ```

4. Click **Save**
5. Go to **Deployments** tab
6. Click the **...** menu on latest deployment
7. Click **Redeploy** to apply the environment variables

#### Step 4: Test Your Live App!

Your app will be at: `https://your-project-name.vercel.app`

1. Open the URL
2. Connect your xBull wallet
3. Click "Create Game"
4. Share the room code with a friend
5. Friend opens the same URL and joins with the code
6. Both players place ships and play!

---

## Files Reference

- `supabase-schema.sql` - Database schema to run in Supabase
- `SUPABASE_SETUP.md` - Detailed Supabase setup guide
- `VERCEL_DEPLOYMENT.md` - Detailed Vercel deployment guide
- `DEPLOY_CHECKLIST.md` - Pre-deployment checklist
- `start-dev.bat` - Windows script to start both servers locally

---

## Troubleshooting

### "Contract is NOT INITIALIZED" error
✅ Already fixed! Contract was initialized successfully.

### "Room not found" error
- Make sure backend is running (local) or Supabase is configured (production)
- Check that both players are using the same deployment (both local or both production)

### Join button does nothing
- Check browser console for errors
- Make sure wallet is connected
- Verify the room code is correct
- Ensure host created the game first

### "Bad union switch: 4" error
- This is a known issue with the contract's GameStatus enum
- The app now handles this gracefully
- Game functionality works despite this warning

---

## Next Steps

Choose one:
- **Quick Test:** Follow "Option 1: Test Locally" above
- **Production Deploy:** Follow "Option 2: Deploy to Production" above

Both options will work! Local is faster for testing, production is better for sharing with others.
