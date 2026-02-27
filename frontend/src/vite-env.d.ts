/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BATTLESHIP_CONTRACT_ID: string
    readonly VITE_VERIFIER_CONTRACT_ID: string
    readonly VITE_GAME_HUB_CONTRACT_ID: string
    readonly VITE_STELLAR_RPC_URL: string
    readonly VITE_STELLAR_NETWORK: string
    readonly VITE_STELLAR_PASSPHRASE: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
