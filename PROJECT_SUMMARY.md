# DarkWater ZK - Zero-Knowledge Battleship on Stellar

## Innovation Domain
**Primary:** GameFi, ZK (Zero-Knowledge Proofs)  
**Secondary:** Privacy, Crypto Adoption

## Network
**Stellar (Layer 1)** - Independent blockchain with native smart contract platform (Soroban)

## 256-Character Vision
Zero-knowledge battleship on Stellar Soroban. Players prove ship placement validity and hit/miss results without revealing board state. Fully on-chain game logic with ZK proofs for privacy-preserving competitive gameplay.

## Project Description

DarkWater ZK is a fully on-chain implementation of the classic Battleship game using zero-knowledge proofs on Stellar's Soroban smart contract platform. Players can compete without revealing their ship positions, using cryptographic proofs to verify game actions while maintaining privacy.

**Key Features:**
- Zero-knowledge proofs for board validity and hit detection
- Fully on-chain game state and verification
- Multi-user support with real-time coordination
- Privacy-preserving gameplay mechanics
- Integration with Stellar's Game Hub for leaderboards

**Technical Stack:**
- Smart Contracts: Rust (Soroban)
- ZK Circuits: Noir (Aztec)
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + Supabase
- Blockchain: Stellar Testnet

## Architecture Diagram

\`\`\`mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React UI]
        Wallet[xBull Wallet]
        ZKProver[ZK Proof Generator<br/>Noir + Barretenberg]
    end
    
    subgraph "Backend Layer"
        API[Express API<br/>Vercel Serverless]
        DB[(Supabase PostgreSQL<br/>Room State)]
        BC[BroadcastChannel<br/>Cross-Tab Sync]
    end
    
    subgraph "Stellar Blockchain Layer 1"
        Soroban[Soroban Runtime]
        BSContract[Battleship Contract<br/>Game Logic]
        VContract[BN254 Verifier<br/>Proof Verification]
        Hub[Game Hub<br/>Leaderboards]
    end
    
    UI --> Wallet
    UI --> ZKProver
    UI --> API
    UI --> BC
    
    Wallet --> Soroban
    API --> DB
    
    Soroban --> BSContract
    Soroban --> VContract
    Soroban --> Hub
    
    BSContract -.->|verify_board_proof| VContract
    BSContract -.->|verify_hit_proof| VContract
    BSContract -.->|start_game| Hub
    BSContract -.->|end_game| Hub
    
    ZKProver -->|Board Proof| BSContract
    ZKProver -->|Hit Proof| BSContract
    
    style Soroban fill:#1a1a2e
    style BSContract fill:#16213e
    style VContract fill:#16213e
    style Hub fill:#16213e
    style ZKProver fill:#0f3460
\`\`\`

## Game Flow

\`\`\`mermaid
sequenceDiagram
    participant P1 as Player 1 (Host)
    participant P2 as Player 2 (Joiner)
    participant API as Backend API
    participant SC as Battleship Contract
    participant ZK as ZK Verifier
    
    P1->>SC: create_game()
    SC-->>P1: game_id
    P1->>API: Save room with game_id
    
    P2->>API: Poll for game_id
    API-->>P2: game_id found
    P2->>SC: join_game(game_id)
    
    P1->>P1: Generate board + ZK proof
    P1->>SC: submit_commitment(proof)
    SC->>ZK: verify_board_proof()
    ZK-->>SC: valid ✓
    
    P2->>P2: Generate board + ZK proof
    P2->>SC: submit_commitment(proof)
    SC->>ZK: verify_board_proof()
    ZK-->>SC: valid ✓
    
    loop Game Turns
        P1->>SC: fire_shot(row, col)
        P2->>P2: Generate hit/miss proof
        P2->>SC: submit_hit_proof(result, proof)
        SC->>ZK: verify_hit_proof()
        ZK-->>SC: valid ✓
    end
    
    SC->>SC: Check win condition
    SC-->>P1: Winner!
\`\`\`

## Current Status

✅ **Working:**
- Contracts deployed and initialized
- Frontend and backend infrastructure
- Room creation and management
- ZK proof generation (simulated)
- Multi-user coordination via API

⚠️ **Known Issue:**
- Game Hub integration has parameter mismatch
- Players can create games but joining fails
- Requires either hub contract update or removal of hub integration

## Deployment Ready

All infrastructure is ready for Vercel deployment. Follow `QUICK_DEPLOY.md` for production deployment once the hub integration issue is resolved.
