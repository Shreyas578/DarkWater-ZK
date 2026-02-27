// =============================================================
// DarkWater ZK — Turn Manager Component
// Shows whose turn it is and pending proof submission
// =============================================================

import React from 'react'
import { GamePhase } from '../hooks/useGame'

interface TurnManagerProps {
    phase: GamePhase
    isMyTurn: boolean
    myHits: number
    opponentHits: number
    proofStatus: string | null
    error: string | null
    gameId: string | null
    pendingShot: { row: number; col: number; index: number } | null
    onSubmitHitProof: (shotIndex: number, row: number, col: number) => void
    isProving: boolean
}

export function TurnManager({
    phase,
    isMyTurn,
    myHits,
    opponentHits,
    proofStatus,
    error,
    gameId,
    pendingShot,
    onSubmitHitProof,
    isProving,
}: TurnManagerProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 640 }}>
            {/* Game ID */}
            {gameId && (
                <div style={{ textAlign: 'center' }}>
                    <span className="badge badge-blue">Room {gameId}</span>
                </div>
            )}

            {/* Score */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--teal)' }}>
                        {myHits}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>My Hits</div>
                </div>
                <div style={{ color: 'var(--text-muted)', alignSelf: 'center', fontSize: '1.5rem' }}>⚔️</div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--red)' }}>
                        {opponentHits}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Opponent Hits</div>
                </div>
            </div>

            {/* Turn Indicator */}
            <div className={`turn-indicator ${isMyTurn ? 'your-turn' : ''}`}>
                <div style={{ fontSize: '1.5rem' }}>
                    {phase === 'waiting_proof' ? '⏳' : isMyTurn ? '🎯' : '🛡️'}
                </div>
                <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700 }}>
                        {phase === 'waiting_proof'
                            ? 'Waiting for opponent\'s ZK proof...'
                            : phase === 'waiting_opponent'
                                ? 'Waiting for opponent to join + commit board...'
                                : isMyTurn
                                    ? '🎯 YOUR TURN — Fire a shot!'
                                    : 'Opponent\'s Turn'}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {isMyTurn
                            ? 'Click any cell on the enemy board to attack'
                            : 'Each move is verified with a ZK proof on-chain'}
                    </div>
                </div>
            </div>

            {/* Pending hit proof submission (defender) */}
            {pendingShot && !isMyTurn && (
                <div className="card" style={{ border: '1px solid var(--teal)', textAlign: 'center' }}>
                    <div style={{ marginBottom: '0.75rem', fontFamily: 'var(--font-display)', fontSize: '0.875rem' }}>
                        Opponent shot at cell ({pendingShot.row + 1}, {String.fromCharCode(65 + pendingShot.col)})
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                        You must submit a ZK proof revealing hit/miss without exposing your board.
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => onSubmitHitProof(pendingShot.index, pendingShot.row, pendingShot.col)}
                        disabled={isProving}
                        id="submit-hit-proof-btn"
                    >
                        {isProving ? (
                            <><div className="spinner" style={{ width: 16, height: 16 }} /> Generating ZK Proof...</>
                        ) : (
                            '🔐 Submit Hit/Miss Proof'
                        )}
                    </button>
                </div>
            )}

            {/* Proof status */}
            {proofStatus && (
                <div className="proof-banner">{proofStatus}</div>
            )}

            {/* Error */}
            {error && (
                <div className="error-banner">⚠️ {error}</div>
            )}
        </div>
    )
}
