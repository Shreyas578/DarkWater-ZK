// =============================================================
// DarkWater ZK — Game Lobby Component
// =============================================================

import React, { useState } from 'react'

interface GameLobbyProps {
    isConnected: boolean
    onCreateGame: () => void
    onJoinGame: (code: string) => void
    onJoinById: (id: bigint) => void
    onchainRooms: { id: bigint; playerA: string; createdAt: number }[]
}

export function GameLobby({
    isConnected,
    onCreateGame,
    onJoinGame,
    onJoinById,
    onchainRooms
}: GameLobbyProps) {
    const [joinCode, setJoinCode] = useState('')
    const [mode, setMode] = useState<'choose' | 'join'>('choose')

    const handleJoin = () => {
        const trimmed = joinCode.trim().toUpperCase()
        if (trimmed.length < 1) return

        // If it's a number, it's a Game ID (cross-profile/machine join)
        if (/^\d+$/.test(trimmed)) {
            onJoinById(BigInt(trimmed))
            return
        }

        // Otherwise assume it's a 6-char Room Code (local sync)
        if (trimmed.length === 6) {
            onJoinGame(trimmed)
            return
        }

        // Fallback/Validation
        alert("Please enter a 6-character Room Code or a numeric Game ID.")
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', maxWidth: 480, width: '100%' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--teal)' }}>Dark</span>
                    <span style={{ color: 'var(--blue)' }}>Water</span>
                    <span style={{ color: 'var(--text-secondary)' }}> ZK</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Zero-Knowledge Battleship · 2 Players<br />
                    Your board is <strong style={{ color: 'var(--teal)' }}>cryptographically secret</strong>.
                </p>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge badge-teal">🔐 Poseidon2</span>
                <span className="badge badge-blue">⚡ BN254 Proofs</span>
                <span className="badge badge-teal">🌊 Noir Circuits</span>
                <span className="badge badge-blue">⭐ Soroban</span>
            </div>

            {!isConnected ? (
                <div className="card" style={{ width: '100%', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Connect your <strong style={{ color: 'var(--teal)' }}>xBull wallet</strong> to begin.
                    </p>
                </div>
            ) : mode === 'choose' ? (
                <div className="card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Enter the Ocean</h2>
                    <p className="text-muted" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                        Create a game and share the code with your opponent
                    </p>

                    <button className="btn btn-primary" onClick={onCreateGame} id="create-game-btn"
                        style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem' }}>
                        🚢 Create New Game
                    </button>

                    <button className="btn btn-secondary" onClick={() => setMode('join')} id="join-game-btn"
                        style={{ width: '100%', justifyContent: 'center' }}>
                        🎯 Join with Room Code
                    </button>

                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <div style={{ marginBottom: '0.4rem', color: 'var(--teal)', fontSize: '0.7rem', fontFamily: 'var(--font-display)' }}>HOW TO PLAY</div>
                        <ol style={{ paddingLeft: '1.2rem', lineHeight: 2, margin: 0 }}>
                            <li>Player 1: Click <em>Create Game</em> → Share the 6-char code</li>
                            <li>Player 2: Click <em>Join</em> → Enter the code</li>
                            <li>Both players place ships & generate ZK proofs</li>
                            <li>Take turns firing shots — each result is ZK-proven</li>
                            <li>First to sink all 17 ship cells wins!</li>
                        </ol>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2>🎯 Join a Game</h2>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Enter the **Room Code** (if in same browser) or **Game ID** (if in different profile).
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="Code or ID"
                            maxLength={12}
                            id="join-game-code-input"
                            style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.2rem',
                                letterSpacing: '0.1em',
                                textAlign: 'center',
                                outline: 'none',
                                textTransform: 'uppercase',
                            }}
                            onFocus={e => (e.target.style.borderColor = 'var(--teal)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleJoin}
                            disabled={joinCode.trim().length < 1}
                            id="confirm-join-btn"
                        >
                            Join Game
                        </button>
                    </div>

                    <div className="alert alert-info" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                        💡 <strong>Hint:</strong> If Room Code 404s, try entering the numeric <strong>Game ID</strong> (e.g. #2) instead.
                    </div>

                    <button className="btn btn-secondary" onClick={() => setMode('choose')}>← Back</button>
                </div>
            )}

            {/* Live Matches List */}
            {isConnected && onchainRooms.length > 0 && (
                <div className="card" style={{ width: '100%', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--teal)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        🌐 Live Matches on Stellar
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {onchainRooms.map(room => (
                            <div key={room.id.toString()} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: 8,
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Game #{room.id.toString()}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        Host: {room.playerA.slice(0, 6)}...{room.playerA.slice(-4)}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-teal"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                    onClick={() => onJoinById(room.id)}
                                >
                                    Join
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
