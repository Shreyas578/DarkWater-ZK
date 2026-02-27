#!/usr/bin/env bash
# =============================================================
# DarkWater ZK — Deploy Script
# Builds + deploys Soroban contracts to Stellar Testnet
#
# Usage:
#   cp ../.env.example ../.env
#   # Edit .env and set STELLAR_SECRET_KEY=S...
#   ./deploy.sh
# =============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# ---- Load .env ----
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found at $ROOT_DIR/.env"
  echo "   Please copy .env.example to .env and set STELLAR_SECRET_KEY"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "${STELLAR_SECRET_KEY:-}" ]; then
  echo "❌ STELLAR_SECRET_KEY is not set in .env"
  echo "   Add your xBull wallet private key: STELLAR_SECRET_KEY=S..."
  exit 1
fi

echo "🌊 DarkWater ZK — Deployment to Stellar Testnet"
echo "=================================================="
echo "Network:  ${STELLAR_NETWORK:-testnet}"
echo "RPC URL:  ${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
echo ""

# ---- Get deployer public key ----
DEPLOYER_PUBLIC=$(stellar keys show darkwater-deployer 2>/dev/null || true)
if [ -z "$DEPLOYER_PUBLIC" ]; then
  echo "🔑 Importing deployer key..."
  stellar keys import darkwater-deployer --secret-key "$STELLAR_SECRET_KEY"
  DEPLOYER_PUBLIC=$(stellar keys show darkwater-deployer)
fi
echo "Deployer: $DEPLOYER_PUBLIC"

# ---- Fund account (testnet only) ----
echo ""
echo "💧 Funding account on Testnet Friendbot..."
curl -s -X POST "https://friendbot.stellar.org/?addr=${DEPLOYER_PUBLIC}" | \
  python3 -c "import sys,json; r=json.load(sys.stdin); print('  Funded!' if 'result' in r else 'Already funded or error: ' + str(r))" || \
  echo "  (Friendbot call failed — account may already be funded)"

# ---- Build contracts ----
echo ""
echo "🔨 Building Soroban contracts..."
cd "$ROOT_DIR/contracts"

cargo build \
  --release \
  --target wasm32-unknown-unknown \
  --package battleship-game \
  --package bn254-verifier

echo "✅ Build complete"

# ---- Deploy Verifier Contract ----
echo ""
echo "📦 Deploying BN254 Verifier contract..."
VERIFIER_WASM="$ROOT_DIR/contracts/target/wasm32-unknown-unknown/release/bn254_verifier.wasm"

VERIFIER_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$VERIFIER_WASM" \
  --source darkwater-deployer \
  --network "${STELLAR_NETWORK:-testnet}" \
  --rpc-url "${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}" \
  --network-passphrase "${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}")

echo "✅ Verifier Contract ID: $VERIFIER_CONTRACT_ID"

# ---- Deploy Battleship Game Contract ----
echo ""
echo "📦 Deploying Battleship Game contract..."
BATTLESHIP_WASM="$ROOT_DIR/contracts/target/wasm32-unknown-unknown/release/battleship_game.wasm"

BATTLESHIP_CONTRACT_ID=$(stellar contract deploy \
  --wasm "$BATTLESHIP_WASM" \
  --source darkwater-deployer \
  --network "${STELLAR_NETWORK:-testnet}" \
  --rpc-url "${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}" \
  --network-passphrase "${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}")

echo "✅ Battleship Contract ID: $BATTLESHIP_CONTRACT_ID"

# ---- Write contract IDs to .env ----
echo ""
echo "💾 Saving contract IDs to .env..."
# Update or append contract IDs
if grep -q "BATTLESHIP_CONTRACT_ID=" "$ENV_FILE"; then
  sed -i "s/BATTLESHIP_CONTRACT_ID=.*/BATTLESHIP_CONTRACT_ID=$BATTLESHIP_CONTRACT_ID/" "$ENV_FILE"
else
  echo "BATTLESHIP_CONTRACT_ID=$BATTLESHIP_CONTRACT_ID" >> "$ENV_FILE"
fi

if grep -q "VERIFIER_CONTRACT_ID=" "$ENV_FILE"; then
  sed -i "s/VERIFIER_CONTRACT_ID=.*/VERIFIER_CONTRACT_ID=$VERIFIER_CONTRACT_ID/" "$ENV_FILE"
else
  echo "VERIFIER_CONTRACT_ID=$VERIFIER_CONTRACT_ID" >> "$ENV_FILE"
fi

# Also write a frontend .env.local for Vite
cat > "$ROOT_DIR/frontend/.env.local" << EOF
VITE_BATTLESHIP_CONTRACT_ID=$BATTLESHIP_CONTRACT_ID
VITE_VERIFIER_CONTRACT_ID=$VERIFIER_CONTRACT_ID
VITE_GAME_HUB_CONTRACT_ID=CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
EOF

echo ""
echo "=================================================="
echo "🚀 Deployment complete!"
echo "   Battleship:  $BATTLESHIP_CONTRACT_ID"
echo "   Verifier:    $VERIFIER_CONTRACT_ID"
echo ""
echo "Next steps:"
echo "   ./initialize.sh    — Initialize contract state"
echo "   ./register_game.sh — Register with Game Hub"
echo "=================================================="
