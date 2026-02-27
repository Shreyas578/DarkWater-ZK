# =============================================================
# DarkWater ZK — Initialize Contract State (PowerShell)
# Run after deploy.sh
# =============================================================

$ErrorActionPreference = "Stop"

# Load .env variables
if (Test-Path ".env") {
    Get-Content .env | Where-Object { $_ -match '=' } | ForEach-Object {
        $name, $value = $_ -split '=', 2
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
    }
}

$BATTLESHIP_ID = [System.Environment]::GetEnvironmentVariable("BATTLESHIP_CONTRACT_ID")
$VERIFIER_ID = [System.Environment]::GetEnvironmentVariable("VERIFIER_CONTRACT_ID")
$GAME_HUB_ID = "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG"
$NETWORK = [System.Environment]::GetEnvironmentVariable("STELLAR_NETWORK")
if (-not $NETWORK) { $NETWORK = "testnet" }
$RPC_URL = [System.Environment]::GetEnvironmentVariable("STELLAR_RPC_URL")
if (-not $RPC_URL) { $RPC_URL = "https://soroban-testnet.stellar.org" }
$NETWORK_PASSPHRASE = [System.Environment]::GetEnvironmentVariable("STELLAR_NETWORK_PASSPHRASE")
if (-not $NETWORK_PASSPHRASE) { $NETWORK_PASSPHRASE = "Test SDF Network ; September 2015" }

Write-Host "DarkWater ZK - Initializing Battleship contract..." -ForegroundColor Cyan
Write-Host "Battleship: $BATTLESHIP_ID"
Write-Host "Verifier:   $VERIFIER_ID"
Write-Host "Game Hub:   $GAME_HUB_ID"

# Use the stellar.exe in the scripts folder
$STELLAR_EXE = ".\scripts\stellar.exe"
if (-not (Test-Path $STELLAR_EXE)) {
    $STELLAR_EXE = "stellar" # Fallback to system path
}

& $STELLAR_EXE contract invoke `
  --id $BATTLESHIP_ID `
  --source darkwater-deployer `
  --network $NETWORK `
  --rpc-url $RPC_URL `
  --network-passphrase $NETWORK_PASSPHRASE `
  -- initialize `
  --admin (&$STELLAR_EXE keys address darkwater-deployer) `
  --verifier_contract $VERIFIER_ID `
  --game_hub_contract $GAME_HUB_ID

Write-Host "Contract initialized successfully!" -ForegroundColor Green
