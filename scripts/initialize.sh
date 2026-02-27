#!/usr/bin/env bash
# =============================================================
# DarkWater ZK — Initialize Contract State
# Run after deploy.sh
# =============================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$ROOT_DIR/.env"

DEPLOYER_PUB=$(stellar keys address darkwater-deployer 2>/dev/null)
echo "Deployer: $DEPLOYER_PUB"
echo "Battleship: ${BATTLESHIP_CONTRACT_ID}"
echo "Verifier:   ${VERIFIER_CONTRACT_ID}"

echo ""
echo "⚙️  Initializing Battleship contract..."
stellar contract invoke \
  --id "${BATTLESHIP_CONTRACT_ID}" \
  --source darkwater-deployer \
  --network "${STELLAR_NETWORK:-testnet}" \
  --rpc-url "${STELLAR_RPC_URL}" \
  --network-passphrase "${STELLAR_NETWORK_PASSPHRASE}" \
  -- initialize \
  --admin "$DEPLOYER_PUB" \
  --verifier_contract "${VERIFIER_CONTRACT_ID}" \
  --game_hub_contract "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG"

echo "✅ Contract initialized!"
