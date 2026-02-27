# 🚀 Vercel Deployment Checklist

## Before You Deploy

- [ ] Contracts deployed to Stellar Testnet
- [ ] Contract IDs saved from `.env` file:
  - `BATTLESHIP_CONTRACT_ID`: `CBDKFNUFXKRAYCW5Y23ISS5EYMMWTREB55ZLBLGQHPALMCIMYUEBHNAQ`
  - `VERIFIER_CONTRACT_ID`: `CAMF2KHBHF5NU5K7KQBWVKUUMZBB22I5S2GULBGDQ5FGXOLSITGYZPLT`
- [ ] GitHub account created
- [ ] Vercel account created (free)

## Deployment Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/YOUR_USERNAME/darkwater-zk.git
git push -u origin main
```
- [ ] Code pushed to GitHub

### 2. Deploy on Vercel

**Option A: Web Interface**
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Click "Deploy"

**Option B: CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

- [ ] Deployment started

### 3. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
VITE_BATTLESHIP_CONTRACT_ID = CBDKFNUFXKRAYCW5Y23ISS5EYMMWTREB55ZLBLGQHPALMCIMYUEBHNAQ
VITE_VERIFIER_CONTRACT_ID = CAMF2KHBHF5NU5K7KQBWVKUUMZBB22I5S2GULBGDQ5FGXOLSITGYZPLT
```

- [ ] Environment variables added
- [ ] Redeployed after adding variables

### 4. Test Deployment

- [ ] Open your Vercel URL
- [ ] Connect xBull wallet
- [ ] Create a game
- [ ] Copy room code
- [ ] Open in incognito/another browser
- [ ] Join with room code
- [ ] Verify both players can see each other

## Post-Deployment

- [ ] Share URL with friends
- [ ] Test on mobile devices
- [ ] Monitor Vercel logs for errors
- [ ] Set up custom domain (optional)

## Your Deployment Info

**Vercel URL:** `https://darkwater-zk.vercel.app`

**Contract IDs:**
- Battleship: `CBDKFNUFXKRAYCW5Y23ISS5EYMMWTREB55ZLBLGQHPALMCIMYUEBHNAQ`
- Verifier: `CAMF2KHBHF5NU5K7KQBWVKUUMZBB22I5S2GULBGDQ5FGXOLSITGYZPLT`

## Troubleshooting

**Build fails?**
- Check Vercel build logs
- Run `npm run build` locally first

**API not working?**
- Check `/api/health` endpoint
- Verify environment variables

**Can't join room?**
- Wait 5 seconds (cold start)
- Check browser console
- Verify both players on same deployment URL

---

✅ **Done!** Your ZK Battleship is live!
