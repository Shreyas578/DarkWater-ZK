# Quick Deploy to Vercel - RIGHT NOW

## Step 1: Run Supabase Schema (2 minutes)

1. Go to: https://nymfoextymctdartqnpp.supabase.co
2. Click **SQL Editor** in left sidebar
3. Copy this SQL and paste it:

```sql
CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_updated_at ON rooms(updated_at);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON rooms
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

4. Click **Run** button
5. You should see "Success. No rows returned"

## Step 2: Push to GitHub (1 minute)

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push
```

## Step 3: Deploy on Vercel (3 minutes)

1. Go to: https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `darkwater-zk` repository
4. Click "Deploy" (don't change any settings)
5. Wait for build to complete (~2 minutes)

## Step 4: Add Environment Variables (2 minutes)

1. In Vercel dashboard, go to your project
2. Click **Settings** → **Environment Variables**
3. Add these (copy-paste):

```
VITE_BATTLESHIP_CONTRACT_ID=CBDKFNUFXKRAYCW5Y23ISS5EYMMWTREB55ZLBLGQHPALMCIMYUEBHNAQ
VITE_VERIFIER_CONTRACT_ID=CAMF2KHBHF5NU5K7KQBWVKUUMZBB22I5S2GULBGDQ5FGXOLSITGYZPLT
VITE_GAME_HUB_CONTRACT_ID=CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_PASSPHRASE=Test SDF Network ; September 2015
SUPABASE_URL=https://nymfoextymctdartqnpp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bWZvZXh0eW1jdGRhcnRxbnBwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg0ODA4NSwiZXhwIjoyMDg3NDI0MDg1fQ.jQTxXbTylbNjSq9Q1-rGpSSBaKM_9dtwcI6fsaDxigw
```

4. Click **Save**

## Step 5: Redeploy (1 minute)

1. Go to **Deployments** tab
2. Click **...** menu on the latest deployment
3. Click **Redeploy**
4. Wait ~2 minutes

## Step 6: Test Your Live App!

Your app will be at: `https://your-project-name.vercel.app`

1. Open the URL
2. Connect xBull wallet
3. Create a game
4. Share the link + room code with a friend
5. They can join and play!

---

**Total Time: ~10 minutes**

The local testing has some contract issues, but deploying to production with Supabase will work better!
