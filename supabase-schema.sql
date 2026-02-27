-- =============================================================
-- DarkWater ZK — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================================

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rooms_updated_at ON rooms(updated_at);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since we're using service role key)
CREATE POLICY "Allow all operations" ON rooms
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to auto-delete old rooms (older than 2 hours)
CREATE OR REPLACE FUNCTION delete_old_rooms()
RETURNS void AS $$
BEGIN
    DELETE FROM rooms
    WHERE updated_at < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a cron job to run cleanup every hour
-- (Requires Supabase Pro plan with pg_cron extension)
-- SELECT cron.schedule('delete-old-rooms', '0 * * * *', 'SELECT delete_old_rooms()');
