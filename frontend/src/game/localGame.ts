// =============================================================
// DarkWater ZK — Local 2-Player Game Engine
// Uses backend API + BroadcastChannel for coordination
// =============================================================

export type RoomRole = 'host' | 'joiner'

export type LocalMsg =
    | { type: 'ROOM_READY'; code: string; role: RoomRole }
    | { type: 'JOINER_JOINED'; code: string }
    | { type: 'GAME_ID_SET'; code: string; gameId: string }
    | { type: 'COMMITMENT'; code: string; role: RoomRole; commitmentHex: string }
    | { type: 'SHOT'; code: string; fromRole: RoomRole; row: number; col: number; shotIndex: number }
    | { type: 'HIT_PROOF'; code: string; shotIndex: number; result: 0 | 1 }
    | { type: 'GAME_OVER'; code: string; winner: RoomRole }

export interface RoomState {
    code: string
    hostCommitment: string | null
    joinerCommitment: string | null
    hostReady: boolean
    joinerReady: boolean
    shotIndex: number
    gameId?: string
}

const CHANNEL_NAME = 'darkwater-zk'
const API_URL = (import.meta.env.VITE_API_URL || 
    (typeof window !== 'undefined' && window.location.port === '5173' 
        ? 'http://localhost:3001' 
        : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'))).trim()

// ---- Room Code ----

export function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    return code
}

// ---- API Storage with localStorage fallback ----

export async function saveRoom(state: RoomState): Promise<void> {
    const url = `${API_URL}/api/rooms/${state.code}`
    console.log('🔵 Saving room to:', url)
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        })
        console.log('🔵 Save response status:', response.status)
        if (!response.ok) throw new Error('API failed')
        console.log('✅ Room saved to backend API')
    } catch (e) {
        console.warn('API save failed, using localStorage fallback:', e)
        // Fallback to localStorage
        localStorage.setItem(`darkwater-room-${state.code}`, JSON.stringify(state))
    }
}

export async function loadRoom(code: string): Promise<RoomState | null> {
    const url = `${API_URL}/api/rooms/${code}`
    console.log('🔵 Loading room from:', url)
    try {
        const res = await fetch(url)
        console.log('🔵 Load response status:', res.status)
        if (!res.ok) throw new Error('API failed')
        const data = await res.json()
        console.log('✅ Room loaded from backend API:', data.room)
        return data.room
    } catch (e) {
        console.warn('API load failed, using localStorage fallback:', e)
        // Fallback to localStorage
        const raw = localStorage.getItem(`darkwater-room-${code}`)
        if (!raw) return null
        try { return JSON.parse(raw) as RoomState } catch { return null }
    }
}

export async function deleteRoom(code: string): Promise<void> {
    try {
        await fetch(`${API_URL}/api/rooms/${code}`, { method: 'DELETE' })
    } catch (e) {
        console.warn('API delete failed, using localStorage fallback:', e)
        localStorage.removeItem(`darkwater-room-${code}`)
    }
}

// ---- Channel ----

let _channel: BroadcastChannel | null = null

export function getChannel(): BroadcastChannel {
    if (!_channel) _channel = new BroadcastChannel(CHANNEL_NAME)
    return _channel
}

export function broadcastMsg(msg: LocalMsg): void {
    getChannel().postMessage(msg)
}

export function onMsg(handler: (msg: LocalMsg) => void): () => void {
    const ch = getChannel()
    const listener = (e: MessageEvent<LocalMsg>) => handler(e.data)
    ch.addEventListener('message', listener)
    return () => ch.removeEventListener('message', listener)
}

// ---- Helpers ----

export function submitHitResult(code: string, shotIndex: number, result: 0 | 1): void {
    broadcastMsg({ type: 'HIT_PROOF', code, shotIndex, result })
}

export function announceWinner(code: string, winner: RoomRole): void {
    deleteRoom(code)
    broadcastMsg({ type: 'GAME_OVER', code, winner })
}
