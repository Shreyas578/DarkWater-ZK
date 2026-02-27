// =============================================================
// DarkWater ZK — Game Result Component
// Win/Loss screen with stats
// =============================================================

import React from 'react'

interface GameResultProps {
    won: boolean
    roomCode: string | null
    myHits: number
    opponentHits: number
    onPlayAgain: () => void
}

export function GameResult({ won, roomCode, myHits, opponentHits, onPlayAgain }: GameResultProps) {
    return (
        <div className="game-over">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {won ? '🏆' : '🌊'}
            </div>
            <h1 style={{
                background: won
                    ? 'linear-gradient(135deg, var(--teal), var(--blue))'
                    : 'linear-gradient(135deg, var(--red), #ff6b6b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.5rem',
            }}>
                {won ? 'Victory!' : 'Defeat'}
            </h1>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
                {won
                    ? 'You sunk the enemy fleet! All moves ZK-verified locally.'
                    : 'The enemy found your ships. Better luck next time.'}
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div className="card" style={{ minWidth: 140 }}>
                    <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--teal)' }}>{myHits}</div>
                    <div className="text-muted">Hits Landed</div>
                </div>
                <div className="card" style={{ minWidth: 140 }}>
                    <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--red)' }}>{opponentHits}</div>
                    <div className="text-muted">Enemy Hits</div>
                </div>
                {roomCode && (
                    <div className="card" style={{ minWidth: 140 }}>
                        <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', color: 'var(--blue)' }}>{roomCode}</div>
                        <div className="text-muted">Room Code</div>
                    </div>
                )}
            </div>

            {/* ZK proof badge */}
            <div className="proof-banner" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
                ⚡ All {myHits + opponentHits} moves verified with BN254 ZK proofs on Stellar Soroban
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={onPlayAgain} id="play-again-btn">
                    ⚓ Play Again
                </button>
                <button className="btn btn-secondary" onClick={() => window.open('https://stellar.expert/explorer/testnet', '_blank')}>
                    📋 Stellar Explorer
                </button>
            </div>
        </div>
    )
}
