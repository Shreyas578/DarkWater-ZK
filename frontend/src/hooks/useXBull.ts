// =============================================================
// DarkWater ZK — xBull Wallet Hook
// Uses @creit.tech/xbull-wallet-connect SDK (popup-based)
// =============================================================

import { useState, useCallback, useRef } from 'react'
import { xBullWalletConnect } from '@creit.tech/xbull-wallet-connect'

export interface XBullState {
    publicKey: string | null
    network: string | null
    isConnected: boolean
    isConnecting: boolean
    error: string | null
}

export interface XBullActions {
    connect: () => Promise<void>
    disconnect: () => void
    signTransaction: (xdr: string) => Promise<string>
}

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

export function useXBull(): XBullState & XBullActions {
    const [state, setState] = useState<XBullState>({
        publicKey: null,
        network: null,
        isConnected: false,
        isConnecting: false,
        error: null,
    })

    // Keep a single SDK instance across calls
    const sdkRef = useRef<xBullWalletConnect | null>(null)

    const getSDK = () => {
        if (!sdkRef.current) {
            sdkRef.current = new xBullWalletConnect({
                // 'extension' will try the xBull browser extension first
                preferredTarget: 'extension',
            })
        }
        return sdkRef.current
    }

    const connect = useCallback(async () => {
        setState(prev => ({ ...prev, isConnecting: true, error: null }))

        try {
            const sdk = getSDK()

            // connect() returns the publicKey string directly
            const publicKey = await sdk.connect({
                canRequestPublicKey: true,
                canRequestSign: true,
            })

            setState({
                publicKey,
                network: 'testnet',
                isConnected: true,
                isConnecting: false,
                error: null,
            })
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to connect xBull wallet'
            setState(prev => ({
                ...prev,
                isConnecting: false,
                error: message,
            }))
        }
    }, [])

    const disconnect = useCallback(() => {
        // Clean up the SDK instance on disconnect
        if (sdkRef.current) {
            try { sdkRef.current.closeConnections() } catch { /* ignore */ }
            sdkRef.current = null
        }
        setState({
            publicKey: null,
            network: null,
            isConnected: false,
            isConnecting: false,
            error: null,
        })
    }, [])

    const signTransaction = useCallback(
        async (xdr: string): Promise<string> => {
            if (!state.publicKey) throw new Error('Wallet not connected')

            const sdk = getSDK()

            // sign() returns the signed XDR string
            const signedXdr = await sdk.sign({
                xdr,
                publicKey: state.publicKey,
                network: TESTNET_PASSPHRASE,
            })

            return signedXdr
        },
        [state.publicKey],
    )

    return {
        ...state,
        connect,
        disconnect,
        signTransaction,
    }
}
