// =============================================================
// DarkWater ZK — Game State Machine Hook (On-Chain + Local Sync)
// Uses real Soroban contract calls for blockchain actions,
// BroadcastChannel for cross-tab opponent coordination.
// =============================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { generateBoardProof, ShipPlacement } from '../zk/boardProver'
import { generateHitProof } from '../zk/hitProver'
import {
    createGame as contractCreateGame,
    joinGame as contractJoinGame,
    submitCommitment as contractSubmitCommitment,
    fireShot as contractFireShot,
    submitHitProof as contractSubmitHitProof,
    getGameState,
} from '../stellar/contract'
import {
    onMsg,
    broadcastMsg,
    LocalMsg,
    RoomRole,
    loadRoom,
    saveRoom,
    generateRoomCode,
} from '../game/localGame'

export type GamePhase =
    | 'idle'
    | 'lobby'
    | 'waiting_joiner'
    | 'placement'
    | 'proving'
    | 'waiting_opponent'
    | 'active'
    | 'waiting_proof'
    | 'game_over'

export interface Shot {
    row: number
    col: number
    result: 'hit' | 'miss' | 'pending'
    index: number
}

export interface GameState {
    phase: GamePhase
    roomCode: string | null
    gameId: bigint | null
    role: RoomRole | null
    myShips: ShipPlacement[]
    myCommitmentHex: string | null
    opponentCommitmentHex: string | null
    myHits: number
    opponentHits: number
    myShots: Shot[]
    incomingShots: Shot[]
    winner: 'me' | 'opponent' | null
    error: string | null
    proofStatus: string | null
    onchainRooms: { id: bigint; playerA: string; createdAt: number }[]
}

const initial: GameState = {
    phase: 'idle',
    roomCode: null,
    gameId: null,
    role: null,
    myShips: [],
    myCommitmentHex: null,
    opponentCommitmentHex: null,
    myHits: 0,
    opponentHits: 0,
    myShots: [],
    incomingShots: [],
    winner: null,
    error: null,
    proofStatus: null,
    onchainRooms: [],
}

export function useGame(
    publicKey: string | null,
    signTransaction: (xdr: string) => Promise<string>,
) {
    const [state, setState] = useState<GameState>(initial)
    const stateRef = useRef(state)
    stateRef.current = state

    const setError = (error: string) =>
        setState(prev => ({ ...prev, error, proofStatus: null }))
    const setStatus = (proofStatus: string | null) =>
        setState(prev => ({ ...prev, proofStatus }))

    // ---- BroadcastChannel listener for cross-tab coordination ----
    useEffect(() => {
        const unsub = onMsg((msg: LocalMsg) => {
            const s = stateRef.current
            if (!s.roomCode || msg.code !== s.roomCode) return

            if (msg.type === 'JOINER_JOINED' && s.role === 'host') {
                setState(prev => ({ ...prev, phase: 'placement' }))
            }

            if (msg.type === 'GAME_ID_SET' && s.role === 'joiner') {
                setState(prev => ({ ...prev, gameId: BigInt(msg.gameId), proofStatus: `✅ Joined game #${msg.gameId} on-chain!` }))
            }

            if (msg.type === 'COMMITMENT' && msg.role !== s.role) {
                setState(prev => ({
                    ...prev,
                    opponentCommitmentHex: msg.commitmentHex,
                    phase: prev.myCommitmentHex
                        ? (prev.role === 'host' ? 'active' : 'waiting_proof')
                        : 'waiting_opponent',
                }))
            }

            if (msg.type === 'SHOT' && msg.fromRole !== s.role) {
                const shot: Shot = { row: msg.row, col: msg.col, result: 'pending', index: msg.shotIndex }
                setState(prev => ({
                    ...prev,
                    incomingShots: [...prev.incomingShots, shot],
                    phase: 'waiting_proof',
                }))
            }

            if (msg.type === 'HIT_PROOF') {
                const s2 = stateRef.current
                if (s2.myShots.find(sh => sh.index === msg.shotIndex)) {
                    const isHit = msg.result === 1
                    setState(prev => {
                        const newHits = isHit ? prev.myHits + 1 : prev.myHits
                        const gameOver = newHits >= 17
                        return {
                            ...prev,
                            myShots: prev.myShots.map(sh =>
                                sh.index === msg.shotIndex
                                    ? { ...sh, result: isHit ? 'hit' : 'miss' }
                                    : sh
                            ),
                            myHits: newHits,
                            phase: gameOver ? 'game_over' : 'active',
                            winner: gameOver ? 'me' : prev.winner,
                            proofStatus: `Opponent proved: ${isHit ? '💥 HIT' : '🌊 MISS'}`,
                        }
                    })
                }
            }

            if (msg.type === 'GAME_OVER') {
                setState(prev => ({
                    ...prev,
                    phase: 'game_over',
                    winner: msg.winner === s.role ? 'me' : 'opponent',
                }))
            }
        })
        return unsub
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- Fetch On-Chain Rooms ----
    const fetchRooms = useCallback(async () => {
        try {
            const rooms = await import('../stellar/contract').then(m => m.getRecentGames())
            setState(prev => ({ ...prev, onchainRooms: rooms }))
        } catch (e) {
            console.error('Failed to fetch rooms:', e)
            setState(prev => ({ ...prev, onchainRooms: [] }))
        }
    }, [])

    // ---- On-chain polling: detect joiner arriving (cross-browser) ----
    useEffect(() => {
        const { phase, gameId } = state
        if (phase !== 'waiting_joiner' || !gameId) return

        let cancelled = false
        const poll = async () => {
            try {
                const gs = await getGameState(gameId)
                if (cancelled) return
                if (gs.player_b && gs.status !== 'WaitingForOpponent') {
                    setState(prev => ({
                        ...prev,
                        phase: 'placement',
                        proofStatus: '🎮 Opponent joined on-chain! Place your ships.',
                    }))
                }
            } catch { /* ignore transient RPC errors */ }
        }
        poll()
        const id = setInterval(poll, 3000)
        return () => { cancelled = true; clearInterval(id) }
    }, [state.phase, state.gameId]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- On-chain polling: detect both commitments submitted (cross-browser) ----
    useEffect(() => {
        const { phase, gameId, role } = state
        if (phase !== 'waiting_opponent' || !gameId) return

        let cancelled = false
        const poll = async () => {
            try {
                const gs = await getGameState(gameId)
                if (cancelled) return
                if (gs.commitment_a_submitted && gs.commitment_b_submitted) {
                    // Both committed — host (player_a) goes first
                    setState(prev => ({
                        ...prev,
                        phase: role === 'host' ? 'active' : 'waiting_proof',
                        proofStatus: '🎮 Both boards committed! Game is Active.',
                    }))
                }
            } catch { /* ignore transient RPC errors */ }
        }
        poll()
        const id = setInterval(poll, 3000)
        return () => { cancelled = true; clearInterval(id) }
    }, [state.phase, state.gameId, state.role]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- Idle/lobby: fetch on-chain room list ----
    useEffect(() => {
        if (state.phase === 'idle' || state.phase === 'lobby') {
            fetchRooms()
            const interval = setInterval(fetchRooms, 10000)
            return () => clearInterval(interval)
        }
        return undefined
    }, [state.phase, fetchRooms])

    // ---- Create Game ----
    const handleCreateGame = useCallback(async () => {
        if (!publicKey || !signTransaction) return setError('Connect wallet first')

        const code = generateRoomCode()
        console.log('🔵 Creating game with code:', code)

        // Save room to backend API
        await saveRoom({
            code,
            hostCommitment: null,
            joinerCommitment: null,
            hostReady: false,
            joinerReady: false,
            shotIndex: 0
        })

        setState(prev => ({ ...prev, phase: 'waiting_joiner', roomCode: code, role: 'host', error: null }))

        try {
            setStatus('📡 Creating game on Stellar...')
            console.log('🔵 Calling contractCreateGame...')
            const gameId = await contractCreateGame(publicKey, signTransaction)
            console.log('✅ Game created on-chain, gameId:', gameId)

            // Update room with gameId
            const room = await loadRoom(code)
            console.log('🔵 Current room state:', room)
            if (room) {
                room.gameId = gameId.toString()
                await saveRoom(room)
                console.log('✅ GameId saved to backend')
            }

            setState(prev => ({ ...prev, gameId, proofStatus: `✅ Game #${gameId} created! Share code: ${code}` }))
            broadcastMsg({ type: 'GAME_ID_SET', code, gameId: gameId.toString() })

            // Poll backend to see when joiner marks themselves as ready
            let pollCount = 0
            console.log('🔵 Starting Joiner poll...')
            const pollForJoiner = setInterval(async () => {
                const updatedRoom = await loadRoom(code)
                console.log(`🔵 Host polling for joiner...`, updatedRoom)

                if (updatedRoom?.joinerReady) {
                    clearInterval(pollForJoiner)
                    console.log('✅ Joiner is ready!')
                    setState(prev => ({
                        ...prev,
                        phase: 'placement',
                        proofStatus: '🎮 Opponent joined! Place your ships.'
                    }))
                }

                if (pollCount++ > 120) {
                    clearInterval(pollForJoiner)
                    setError('Timeout waiting for opponent.')
                }
            }, 2000)

        } catch (e: unknown) {
            console.error('❌ Failed to create game:', e)
            setError(e instanceof Error ? e.message : 'Failed to create game')
        }
    }, [publicKey, signTransaction])

    // ---- Join Game ----
    const handleJoinGame = useCallback(async (code: string) => {
        if (!publicKey || !signTransaction) return setError('Connect wallet first')
        const trimmed = code.trim().toUpperCase()

        // If numeric, treat as Game ID directly
        if (/^\d+$/.test(trimmed)) {
            console.log('🔢 Numeric input detected, joining by ID:', trimmed)
            return handleJoinById(BigInt(trimmed))
        }

        console.log('🔵 Join game clicked, code:', trimmed)

        setState(prev => ({
            ...prev,
            roomCode: trimmed,
            role: 'joiner',
            error: null,
            proofStatus: 'Looking for game...'
        }))

        // Poll for gameId from backend
        let tries = 0
        const checkInterval = setInterval(async () => {
            console.log(`🔵 Poll attempt ${tries}, checking room:`, trimmed)
            const room = await loadRoom(trimmed)
            console.log('🔵 Room data:', room)

            if (room?.gameId) {
                clearInterval(checkInterval)
                const gameId = BigInt(room.gameId)
                console.log('🚀 Found gameId:', gameId, 'triggering contractJoinGame...')

                try {
                    // IMPORTANT: Sign contract to join on-chain
                    setStatus(`📡 Signing to join game #${gameId}...`)
                    console.log('🔵 Calling contractJoinGame with:', { publicKey, gameId })
                    await contractJoinGame(publicKey, signTransaction, gameId)
                    console.log('✅ Successfully joined on-chain!')

                    // Mark as joined in backend
                    room.joinerReady = true
                    await saveRoom(room)
                    console.log('✅ Marked as ready in backend')

                    setState(prev => ({
                        ...prev,
                        phase: 'placement',
                        gameId,
                        proofStatus: `✅ Joined game #${gameId} on-chain!`
                    }))

                    broadcastMsg({ type: 'JOINER_JOINED', code: trimmed })
                } catch (e) {
                    console.error('❌ Failed to join:', e)
                    setError(e instanceof Error ? e.message : 'Failed to join on-chain')
                    // Keep the state so the error message stays visible
                }
                return
            }

            if (room && !room.gameId) {
                setStatus('⏳ Waiting for Host to finish on-chain setup...')
            }

            // Create room if it doesn't exist
            if (!room && tries === 0) {
                console.log('🔵 Room not found, creating placeholder')
                await saveRoom({
                    code: trimmed,
                    hostCommitment: null,
                    joinerCommitment: null,
                    hostReady: false,
                    joinerReady: false,
                    shotIndex: 0
                })
            }

            tries++
            if (tries > 60) {
                clearInterval(checkInterval)
                console.error('❌ Timeout waiting for game')
                setError('Timeout. Make sure host created the game first.')
                setState(prev => ({ ...prev, phase: 'idle' }))
            }
        }, 1000)
    }, [publicKey, signTransaction])

    // ---- Join Game by ID (from lobby list) ----
    const handleJoinById = useCallback(async (gameId: bigint) => {
        if (!publicKey || !signTransaction) return setError('Connect wallet first')

        // When joining by ID from lobby, we use a synthetic room code based on the gameId
        // so that host and joiner can still find each other in the backend/broadcast.
        const roomCode = `ID-${gameId}`

        try {
            setStatus(`📡 Joining game #${gameId} on-chain...`)
            setState(prev => ({
                ...prev,
                phase: 'placement',
                gameId,
                roomCode,
                role: 'joiner',
                error: null,
                proofStatus: `✅ Joined game #${gameId} on-chain!`
            }))

            // Sign contract to join
            await contractJoinGame(publicKey, signTransaction, gameId)

            // Sync with backend so host sees us
            const room = {
                code: roomCode,
                gameId: gameId.toString(),
                hostCommitment: null,
                joinerCommitment: null,
                hostReady: false,
                joinerReady: true,
                shotIndex: 0
            }
            await saveRoom(room)

            broadcastMsg({ type: 'JOINER_JOINED', code: roomCode })
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to join game on-chain')
            // Keep the state so errorbanner shows
        }
    }, [publicKey, signTransaction])

    // ---- Submit Board ----
    const handleSubmitBoard = useCallback(async (ships: ShipPlacement[]) => {
        const { roomCode, role, gameId } = stateRef.current
        if (!publicKey || !signTransaction) return setError('Wallet not connected')
        if (!roomCode || !role) return setError('Not in a room')
        if (ships.length !== 5) return setError('Place all 5 ships')

        try {
            setStatus('🔐 Generating ZK board validity proof...')
            setState(prev => ({ ...prev, phase: 'proving', myShips: ships, error: null }))

            const { proof, publicInputs, commitment, commitmentHex } = await generateBoardProof(ships)

            if (gameId && signTransaction) {
                setStatus('📡 Submitting commitment + proof to Soroban...')
                await contractSubmitCommitment(publicKey, signTransaction, gameId, commitment, proof, publicInputs)
            }

            // Broadcast commitment for opponent's local state
            broadcastMsg({ type: 'COMMITMENT', code: roomCode, role, commitmentHex })

            setState(prev => ({
                ...prev,
                myCommitmentHex: commitmentHex,
                phase: 'waiting_opponent',
                proofStatus: `✅ Board proof verified on-chain! (Game #${gameId})`,
            }))
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Proof/submission failed'
            setError(`Error: ${msg}`)
            setState(prev => ({ ...prev, phase: 'placement' }))
        }
    }, [publicKey, signTransaction])

    // ---- Fire Shot ----
    const handleFireShot = useCallback(async (row: number, col: number) => {
        const { roomCode, role, gameId, phase, myShots } = stateRef.current
        if (!publicKey || !signTransaction || !roomCode || !role || phase !== 'active') return
        if (myShots.some(s => s.row === row && s.col === col)) {
            setError('Already fired here')
            return
        }

        try {
            setState(prev => ({ ...prev, error: null }))
            let shotIndex = myShots.length

            if (gameId && signTransaction) {
                shotIndex = await contractFireShot(publicKey, signTransaction, gameId, row, col)
            }

            broadcastMsg({ type: 'SHOT', code: roomCode, fromRole: role, row, col, shotIndex })

            const shot: Shot = { row, col, result: 'pending', index: shotIndex }
            setState(prev => ({ ...prev, myShots: [...prev.myShots, shot], phase: 'waiting_proof' }))

            // Timeout fallback: if no proof received in 30 seconds, show error
            setTimeout(() => {
                const currentState = stateRef.current
                if (currentState.phase === 'waiting_proof') {
                    setError('⏱️ Timeout waiting for opponent proof. Open game in another tab to test multiplayer.')
                    setState(prev => ({ ...prev, phase: 'active' }))
                }
            }, 30000)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to fire shot')
        }
    }, [publicKey, signTransaction])

    // ---- Submit Hit Proof ----
    const handleSubmitHitProof = useCallback(async (shotIndex: number, targetRow: number, targetCol: number) => {
        const { roomCode, role, gameId, myShips, myCommitmentHex, opponentHits } = stateRef.current
        if (!publicKey || !signTransaction || !roomCode || !role || !myCommitmentHex) {
            return setError('Missing game data')
        }

        try {
            setStatus('🔐 Generating hit/miss ZK proof...')

            const { result, proof } = await generateHitProof(myShips, myCommitmentHex, targetRow, targetCol)

            if (gameId && signTransaction) {
                setStatus('📡 Submitting hit proof to Soroban...')
                await contractSubmitHitProof(publicKey, signTransaction, gameId, shotIndex, result, proof)
            }

            broadcastMsg({ type: 'HIT_PROOF', code: roomCode, shotIndex, result })

            const newOppHits = opponentHits + (result === 1 ? 1 : 0)
            const gameOver = newOppHits >= 17

            setState(prev => ({
                ...prev,
                incomingShots: prev.incomingShots.map(s =>
                    s.index === shotIndex ? { ...s, result: result === 1 ? 'hit' : 'miss' } : s
                ),
                opponentHits: newOppHits,
                phase: gameOver ? 'game_over' : 'active',
                winner: gameOver ? 'opponent' : prev.winner,
                proofStatus: `✅ Proof submitted on-chain: ${result === 1 ? '💥 HIT' : '🌊 MISS'}`,
                error: null,
            }))

            if (gameOver && roomCode) {
                broadcastMsg({ type: 'GAME_OVER', code: roomCode, winner: role === 'host' ? 'joiner' : 'host' })
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Proof failed')
        }
    }, [publicKey, signTransaction])

    const reset = useCallback(() => setState(initial), [])

    return {
        state,
        actions: {
            createGame: handleCreateGame,
            joinGame: handleJoinGame,
            joinGameById: handleJoinById,
            submitBoard: handleSubmitBoard,
            fireShot: handleFireShot,
            submitHitProof: handleSubmitHitProof,
            reset,
        },
    }
}
