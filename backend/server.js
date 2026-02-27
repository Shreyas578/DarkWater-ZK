// =============================================================
// DarkWater ZK — Backend API Server
// Provides room management for multi-user coordination
// Supports both in-memory (local dev) and Supabase (production)
// =============================================================

import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

// In-memory room storage for local development
const rooms = new Map()

// Check if Supabase is configured
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
let supabase = null

if (USE_SUPABASE) {
    try {
        const { createClient } = await import('@supabase/supabase-js')
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        )
        console.log('✅ Supabase connected')
    } catch (e) {
        console.warn('⚠️  Supabase module not found, using in-memory storage')
    }
}

if (!USE_SUPABASE) {
    console.log('📦 Using in-memory storage for local development')
}

// Clean up old rooms (in-memory only)
const cleanupOldRooms = () => {
    if (USE_SUPABASE) return
    const now = Date.now()
    for (const [code, room] of rooms.entries()) {
        if (now - room.createdAt > 2 * 60 * 60 * 1000) {
            rooms.delete(code)
        }
    }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        storage: USE_SUPABASE ? 'supabase' : 'memory',
        rooms: USE_SUPABASE ? 'N/A' : rooms.size
    })
})

// Get room by code
app.get('/api/rooms/:code', async (req, res) => {
    const { code } = req.params
    
    try {
        if (USE_SUPABASE && supabase) {
            const { data, error } = await supabase
                .from('rooms')
                .select('data')
                .eq('code', code)
                .maybeSingle()
            
            if (error) throw error
            if (!data || !data.data) {
                return res.status(404).json({ error: 'Room not found' })
            }
            return res.json({ room: data.data })
        } else {
            // In-memory fallback
            cleanupOldRooms()
            const room = rooms.get(code)
            if (!room) {
                return res.status(404).json({ error: 'Room not found' })
            }
            return res.json({ room })
        }
    } catch (e) {
        console.error('Error fetching room:', e)
        return res.status(500).json({ error: e.message })
    }
})

// Create or update room
app.post('/api/rooms/:code', async (req, res) => {
    const { code } = req.params
    const roomData = req.body
    const now = Date.now()
    
    try {
        if (USE_SUPABASE && supabase) {
            const room = {
                ...roomData,
                code,
                createdAt: roomData.createdAt ?? now,
                updatedAt: now
            }
            
            const { error } = await supabase
                .from('rooms')
                .upsert(
                    { code, data: room },
                    { onConflict: 'code' }
                )
            
            if (error) throw error
            return res.json({ success: true, room })
        } else {
            // In-memory fallback
            cleanupOldRooms()
            const existing = rooms.get(code)
            const room = {
                ...existing,
                ...roomData,
                code,
                createdAt: existing?.createdAt || now,
                updatedAt: now
            }
            rooms.set(code, room)
            return res.json({ success: true, room })
        }
    } catch (e) {
        console.error('Error saving room:', e)
        return res.status(500).json({ error: e.message })
    }
})

// Delete room
app.delete('/api/rooms/:code', async (req, res) => {
    const { code } = req.params
    
    try {
        if (USE_SUPABASE && supabase) {
            const { error } = await supabase
                .from('rooms')
                .delete()
                .eq('code', code)
            
            if (error) throw error
            return res.json({ success: true })
        } else {
            // In-memory fallback
            rooms.delete(code)
            return res.json({ success: true })
        }
    } catch (e) {
        console.error('Error deleting room:', e)
        return res.status(500).json({ error: e.message })
    }
})

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001
    app.listen(PORT, () => {
        console.log(`🌊 DarkWater ZK Backend running on http://localhost:${PORT}`)
        console.log(`📦 Storage: ${USE_SUPABASE ? 'Supabase' : 'In-Memory (local dev)'}`)
    })
}

// Export for Vercel serverless
export default app
