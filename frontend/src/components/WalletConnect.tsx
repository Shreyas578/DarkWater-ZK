// =============================================================
// DarkWater ZK — Wallet Connect Component
// =============================================================

import React from 'react'

interface WalletConnectProps {
    publicKey: string | null
    network: string | null
    isConnected: boolean
    isConnecting: boolean
    error: string | null
    onConnect: () => void
    onDisconnect: () => void
}

export function WalletConnect({
    publicKey,
    isConnected,
    isConnecting,
    error,
    onConnect,
    onDisconnect,
}: WalletConnectProps) {
    const shortKey = publicKey
        ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
        : null

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {error && (
                <div className="error-banner" style={{ fontSize: '0.75rem', maxWidth: '300px' }}>
                    ⚠️ {error}
                </div>
            )}

            {isConnected && publicKey ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="badge badge-teal">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c9b1', display: 'inline-block' }} />
                        {shortKey}
                    </div>
                    <button className="btn btn-secondary" onClick={onDisconnect} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                        Disconnect
                    </button>
                </div>
            ) : (
                <button
                    className="btn btn-primary"
                    onClick={onConnect}
                    disabled={isConnecting}
                    id="connect-wallet-btn"
                >
                    {isConnecting ? (
                        <>
                            <div className="spinner" style={{ width: 16, height: 16 }} />
                            Connecting...
                        </>
                    ) : (
                        <>⚓ Connect xBull</>
                    )}
                </button>
            )}
        </div>
    )
}
