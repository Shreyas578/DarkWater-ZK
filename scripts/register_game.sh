#!/usr/bin/env bash
# =============================================================
# DarkWater ZK — Register with Game Hub
# Tells the Game Hub contract about our Battleship contract
# =============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

set -a; source "$ENV_FILE"; set +a

if [ -z "${BATTLESHIP_CONTRACT_ID:-}" ]; then
  echo "❌ BATTLESHIP_CONTRACT_ID not set. Run ./deploy.sh first."
  exit 1
fi

echo "🎮 Registering with Game Hub..."
echo "   Game Hub:   ${GAME_HUB_CONTRACT_ID}"
echo "   Battleship: $BATTLESHIP_CONTRACT_ID"
echo ""

# The Game Hub's register function signature may vary.
# Attempt with common signatures:
stellar contract invoke \
  --id "${GAME_HUB_CONTRACT_ID}" \
  --source darkwater-deployer \
  --network "${STELLAR_NETWORK:-testnet}" \
  --rpc-url "${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}" \
  --network-passphrase "${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}" \
  -- register \
  --game_contract "$BATTLESHIP_CONTRACT_ID" \
  --game_name "DarkWater ZK" \
  --game_type "battleship" 2>/dev/null || \
stellar contract invoke \
  --id "${GAME_HUB_CONTRACT_ID}" \
  --source darkwater-deployer \
  --network "${STELLAR_NETWORK:-testnet}" \
  --rpc-url "${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}" \
  --network-passphrase "${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}" \
  -- register_game \
  --contract_id "$BATTLESHIP_CONTRACT_ID"

echo ""
echo "✅ Game registered with Game Hub!"
echo ""
echo "🚀 DarkWater ZK is ready!"
echo "   Run the frontend: cd frontend && npm run dev"
echo "   Open: http://localhost:5173"
