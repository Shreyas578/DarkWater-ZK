// =============================================================
// DarkWater ZK — App Root (2-Player Local)
// =============================================================

import React from 'react'
import { useXBull } from './hooks/useXBull'
import { useGame } from './hooks/useGame'
import { WalletConnect } from './components/WalletConnect'
import { GameLobby } from './components/GameLobby'
import { ShipPlacer } from './components/ShipPlacer'
import { GameBoard } from './components/GameBoard'
import { TurnManager } from './components/TurnManager'
import { GameResult } from './components/GameResult'

export default function App() {
    const wallet = useXBull()
    const { state, actions } = useGame(wallet.publicKey, wallet.signTransaction)

    const isMyTurn = state.phase === 'active'
    const isProving = state.phase === 'proving'

    // The pending incoming shot we need to prove hit/miss for
    const pendingIncomingShot = state.incomingShots.find(s => s.result === 'pending') ?? null

    return (
        <div className="app">
            {/* ── Header ── */}
            <header className="header">
                <div className="logo">
                    Dark<span>Water</span>{' '}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}>ZK</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>⭐ Stellar Testnet</span>
                    <WalletConnect
                        publicKey={wallet.publicKey}
                        network={wallet.network}
                        isConnected={wallet.isConnected}
                        isConnecting={wallet.isConnecting}
                        error={wallet.error}
                        onConnect={wallet.connect}
                        onDisconnect={wallet.disconnect}
                    />
                </div>
            </header>

            {/* ── Main ── */}
            <main className="main">

                {/* LOBBY */}
                {(state.phase === 'idle' || state.phase === 'lobby') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
                        <GameLobby
                            isConnected={wallet.isConnected}
                            onCreateGame={actions.createGame}
                            onJoinGame={actions.joinGame}
                            onJoinById={actions.joinGameById}
                            onchainRooms={state.onchainRooms}
                        />
                        {state.error && <div className="error-banner" style={{ maxWidth: 480, width: '100%' }}>⚠️ {state.error}</div>}
                    </div>
                )}

                {/* WAITING FOR JOINER — show room code */}
                {state.phase === 'waiting_joiner' && state.roomCode && (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '2.5rem' }}>🚢</div>
                        <h2>Game Created!</h2>
                        <p className="text-muted">Share this code with your opponent in another tab:</p>

                        {/* Big room code display */}
                        <div style={{
                            background: 'rgba(0,201,177,0.08)',
                            border: '2px solid var(--teal)',
                            borderRadius: 16,
                            padding: '1.5rem 3rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>ROOM CODE</div>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '3.5rem',
                                fontWeight: 700,
                                color: 'var(--teal)',
                                letterSpacing: '0.3em',
                            }}>
                                {state.roomCode}
                            </div>
                            {state.gameId !== null && (
                                <div style={{
                                    fontSize: '1rem',
                                    color: 'var(--blue)',
                                    fontWeight: 600,
                                    background: 'rgba(52,152,219,0.1)',
                                    padding: '0.4rem 1rem',
                                    borderRadius: 20
                                }}>
                                    Game ID: #{state.gameId.toString()}
                                </div>
                            )}
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={() => navigator.clipboard.writeText(state.roomCode!)}
                            style={{ gap: '0.5rem' }}
                        >
                            📋 Copy Code
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <div className="spinner" style={{ width: 16, height: 16 }} />
                            Waiting for opponent to join…
                        </div>

                        {state.error && <div className="error-banner">{state.error}</div>}
                    </div>
                )}

                {/* SHIP PLACEMENT */}
                {(state.phase === 'placement' || state.phase === 'proving') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        {state.roomCode && (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <span className="badge badge-teal">Room {state.roomCode}</span>
                                <span className="badge badge-blue">{state.role === 'host' ? 'Player A (Host)' : 'Player B (Joiner)'}</span>
                            </div>
                        )}
                        <ShipPlacer
                            onConfirm={actions.submitBoard}
                            isProving={isProving}
                            proofStatus={state.proofStatus}
                        />
                        {state.error && <div className="error-banner">⚠️ {state.error}</div>}
                    </div>
                )}

                {/* WAITING FOR OPPONENT'S BOARD PROOF */}
                {state.phase === 'waiting_opponent' && (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '3rem' }}>⏳</div>
                        <h2>Waiting for Opponent</h2>
                        <p className="text-muted">Your ZK proof is done! Waiting for the other player to place their ships and generate their proof…</p>
                        {state.proofStatus && <div className="proof-banner">{state.proofStatus}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <div className="spinner" style={{ width: 16, height: 16 }} />
                            Waiting…
                        </div>
                        {state.error && <div className="error-banner">{state.error}</div>}
                    </div>
                )}

                {/* ACTIVE GAME */}
                {(state.phase === 'active' || state.phase === 'waiting_proof') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', width: '100%' }}>
                        <TurnManager
                            phase={state.phase}
                            isMyTurn={isMyTurn}
                            myHits={state.myHits}
                            opponentHits={state.opponentHits}
                            proofStatus={state.proofStatus}
                            error={state.error}
                            gameId={null}
                            pendingShot={pendingIncomingShot}
                            onSubmitHitProof={actions.submitHitProof}
                            isProving={isProving}
                        />
                        <GameBoard
                            myShips={state.myShips}
                            myShots={state.myShots}
                            incomingShots={state.incomingShots}
                            isMyTurn={isMyTurn}
                            onFire={actions.fireShot}
                            disabled={state.phase !== 'active'}
                        />
                    </div>
                )}

                {/* GAME OVER */}
                {state.phase === 'game_over' && (
                    <GameResult
                        won={state.winner === 'me'}
                        roomCode={state.roomCode}
                        myHits={state.myHits}
                        opponentHits={state.opponentHits}
                        onPlayAgain={actions.reset}
                    />
                )}
            </main>

            {/* ── Footer ── */}
            <footer style={{
                textAlign: 'center',
                padding: '1rem',
                borderTop: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
            }}>
                DarkWater ZK · Noir Circuits · BN254 Proofs · Local 2-Player Mode
            </footer>
        </div>
    )
}
