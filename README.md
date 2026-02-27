
# DarkWater ZK

> 🌊 Zero-Knowledge Battleship on Stellar — Hackathon Build

**Live on Stellar Testnet!** Both players' ship placements are cryptographically secret — proven valid without revealing positions using ZK proofs.

## 🏗️ Deployed Contracts (Stellar Testnet)

| Contract | Address |
|----------|---------|
| Battleship Game | `CBHHAVSTMY3WHDGZGAUBPAKD3Y4VQKZXLZK2LRYYU32MYPZMKTIEKIWH` |
| BN254 Verifier | `CC2DUGE26XRGB4L56IPFQGI2JSGOVXPQ2XWLDYW2GEGHSEHUD5BSSF3Q` |
| Stellar Game Hub | `CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG` |

🔗 [View Battleship on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBHHAVSTMY3WHDGZGAUBPAKD3Y4VQKZXLZK2LRYYU32MYPZMKTIEKIWH)

## 🎮 How ZK Works

```
Player places ships → SHA-256 commitment computed → ZK proof generated
→ Commitment + proof submitted to Soroban → Contract verifies proof
→ Commitment stored on-chain → Game begins
```

On each move:
- Attacker fires at cell (row, col) — recorded on-chain
- Defender runs ZK hit/miss proof locally
- Proof + result submitted to Soroban — **can't cheat** without breaking ZK
- Turn switches

## 🚀 Quick Start

### Prerequisites

- [xBull Wallet](https://xbull.app) browser extension
- Node.js 18+
- Rust + Stellar CLI (for contract deployment)

### Run Locally

```bash
git clone https://github.com/yourusername/darkwater-zk
cd darkwater-zk/frontend
cp .env.example .env.local   # contracts already filled in
npm install
npm run dev
```

Open `http://localhost:5173` in **two browser tabs**.

### Play

1. **Tab A**: Install xBull → Connect wallet → **Create New Game** → copy the 6-char code
2. **Tab B**: Connect wallet → **Join with Room Code** → enter code
3. Both players place ships → **Submit Board & Prove** (signs Soroban tx with xBull)
4. Take turns firing → each hit/miss proven on-chain

## 📁 Project Structure

```
darkwater-zk/
├── contracts/
│   ├── battleship_game/src/
│   │   ├── lib.rs           — Main game contract (create_game, fire_shot, etc.)
│   │   ├── game_hub_interface.rs — start_game/end_game hub calls
│   │   └── storage.rs       — On-chain data structures
│   └── verifier/src/
│       └── lib.rs           — BN254 ZK proof verifier
├── circuits/
│   ├── board_validity/      — Noir circuit: ship placement validity
│   └── hit_verify/          — Noir circuit: hit/miss verification
├── frontend/
│   └── src/
│       ├── zk/              — ZK proof generation (Barretenberg)
│       ├── stellar/         — Soroban contract calls
│       ├── game/            — Local 2-player sync (BroadcastChannel)
│       └── hooks/           — useGame, useXBull
└── scripts/
    ├── deploy.sh
    ├── initialize.sh
    └── register_game.sh
```

## 🔐 ZK Circuits (Noir)

### Board Validity Circuit
- **Private**: ship coordinates (5 ships, 4 params each)
- **Public**: SHA-256 commitment (top byte zeroed for BN254 field)
- **Constraints**: bounds check, no overlap, correct ship count

### Hit Verification Circuit
- **Private**: full ship layout
- **Public**: commitment, target cell, result (0/1)
- **Proves**: hit/miss is correct without revealing board

## �️ Deploy Your Own Contracts

```bash
# 1. Install Rust + Stellar CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
brew install stellar-cli

# 2. Add wasm target
rustup target add wasm32v1-none

# 3. Configure .env
cp .env.example .env
echo "STELLAR_SECRET_KEY=S..." >> .env

# 4. Deploy
cd scripts
./deploy.sh       # builds + deploys both contracts
./initialize.sh   # initializes game contract
./register_game.sh # registers with Game Hub
```

## 🔒 Security & Fairness

| Threat | Defense |
|--------|---------|
| Forged board | ZK board validity proof required before game starts |
| Lying about hit/miss | ZK hit verification proof required for each shot |
| Replay attack | Shot index tracked on-chain, duplicate shots rejected |
| Board change mid-game | Commitment stored on-chain at game start, immutable |
| Signer fraud | `player.require_auth()` in every contract function |

## 🌐 Tech Stack

- **ZK**: [Noir](https://noir-lang.org) circuits + [Barretenberg](https://github.com/AztecProtocol/barretenberg) prover
- **Smart Contracts**: [Soroban](https://soroban.stellar.org) (Rust), Stellar Testnet
- **Frontend**: React + Vite + TypeScript
- **Wallet**: [xBull](https://xbull.app) via `@creit.tech/xbull-wallet-connect`
- **Cross-Tab Sync**: BroadcastChannel API + localStorage

## ⚡ Why Stellar + ZK?

Stellar's Protocol 25 (X-Ray) adds BN254 elliptic curve primitives to Soroban, enabling on-chain ZK proof verification at low cost. Game moves that previously required trust (or expensive Oracle feeds) can now be verified with a single contract call.
