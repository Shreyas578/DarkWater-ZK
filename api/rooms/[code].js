// Vercel Serverless Function for room management backed by Supabase Postgres
// This avoids in-memory state and lets host/joiner share persistent room data.

import { createClient } from '@supabase/supabase-js'

// Prefer server-side URL + service role key
const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[API] Supabase env vars are not fully configured')
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    })
    : null

export default async function handler(req, res) {
    const { code } = req.query

    console.log(`[API] ${req.method} room: ${code}`)

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured on server' })
    }

    try {
        if (req.method === 'POST') {
            const roomData = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
            const now = Date.now()

            // We store the whole room object in a JSONB column `data` keyed by `code`
            const room = {
                ...roomData,
                code,
                createdAt: roomData.createdAt ?? now,
                updatedAt: now,
            }

            const { error } = await supabase
                .from('rooms')
                .upsert(
                    { code, data: room },
                    { onConflict: 'code' },
                )

            if (error) {
                console.error('[API] Supabase upsert error:', error)
                return res.status(500).json({ error: error.message })
            }

            return res.json({ success: true, room })
        }

        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('rooms')
                .select('data')
                .eq('code', code)
                .maybeSingle()

            if (error) {
                console.error('[API] Supabase select error:', error)
                return res.status(500).json({ error: error.message })
            }

            if (!data || !data.data) {
                return res.status(404).json({ error: 'Room not found' })
            }

            return res.json({ room: data.data })
        }

        if (req.method === 'DELETE') {
            const { error } = await supabase
                .from('rooms')
                .delete()
                .eq('code', code)

            if (error) {
                console.error('[API] Supabase delete error:', error)
                return res.status(500).json({ error: error.message })
            }

            return res.json({ success: true })
        }

        return res.status(405).json({ error: 'Method not allowed' })
    } catch (e) {
        console.error('[API] Room handler error:', e)
        return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal server error' })
    }
}
