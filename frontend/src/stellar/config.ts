// =============================================================
// DarkWater ZK — Stellar Network Configuration
// =============================================================

export const STELLAR_CONFIG = {
    network: 'testnet' as const,
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
} as const

// Contract addresses — filled after deploy.sh runs.
// Override via VITE_BATTLESHIP_CONTRACT_ID env var for CI.
export const CONTRACT_IDS = {
    battleship: import.meta.env.VITE_BATTLESHIP_CONTRACT_ID ?? '',
    verifier: import.meta.env.VITE_VERIFIER_CONTRACT_ID ?? '',
    gameHub: 'CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG',
} as const

export const BOARD_SIZE = 10
export const TOTAL_SHIP_CELLS = 17
export const SHIP_SIZES = [5, 4, 3, 3, 2] as const
export const SHIP_NAMES = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'] as const
