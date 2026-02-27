# Supabase Setup Guide for DarkWater ZK

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project credentials

## 2. Run Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to create the tables

## 3. Get Your Credentials

From your Supabase project settings:

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Service Role Key** (secret key, starts with `eyJ...`)

## 4. Configure Environment Variables

### For Local Development (backend/.env)

Create `backend/.env` file:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

### For Vercel Deployment

Add these environment variables in Vercel dashboard:

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add:
   - `SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGc...your-service-role-key`

## 5. Test the Connection

### Local Test:
```bash
cd backend
npm install
npm start
```

Then visit: `http://localhost:3001/api/health`

You should see:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "storage": "supabase",
  "rooms": "N/A"
}
```

### Vercel Test:
After deploying, visit: `https://your-app.vercel.app/api/health`

## 6. Database Structure

The `rooms` table stores game room data:

- `code` (TEXT, PRIMARY KEY): 6-character room code (e.g., "8PLW35")
- `data` (JSONB): Complete room state including:
  - `hostCommitment`: Host's board commitment hash
  - `joinerCommitment`: Joiner's board commitment hash
  - `hostReady`: Boolean flag
  - `joinerReady`: Boolean flag
  - `gameId`: On-chain game ID
  - `shotIndex`: Current shot counter
- `created_at`: Timestamp when room was created
- `updated_at`: Timestamp of last update

## 7. Automatic Cleanup

Rooms older than 2 hours are automatically cleaned up. You can manually run cleanup:

```sql
SELECT delete_old_rooms();
```

## Troubleshooting

### "Supabase not configured" error
- Make sure environment variables are set correctly
- Restart your server after adding env vars
- Check that the service role key (not anon key) is used

### "relation 'rooms' does not exist"
- Run the schema SQL in Supabase SQL Editor
- Make sure the table was created successfully

### Connection timeout
- Check your Supabase project is active
- Verify the URL is correct (no trailing slash)
- Check your internet connection
