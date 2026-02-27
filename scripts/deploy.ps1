# =============================================================
# DarkWater ZK - Deploy Script (PowerShell / Windows)
# Builds, deploys, and initializes Soroban contracts.
# Run from project root: .\scripts\deploy.ps1
# =============================================================
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent $PSScriptRoot
$ENV_FILE = Join-Path $ROOT ".env"
$FRONTEND_ENV = Join-Path $ROOT "frontend\.env"

Write-Host "DarkWater ZK - Deploy (Windows PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================="

# ---- Load .env manually (robust) ----
if (-not (Test-Path $ENV_FILE)) {
    Write-Error "ERROR: .env not found at $ENV_FILE"
    exit 1
}

$SECRET_KEY = ""
$RPC_URL    = ""
$PASSPHRASE = ""
$HUB_ID     = ""

Get-Content $ENV_FILE | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 0) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim().Trim('"')
    switch ($key) {
        "STELLAR_SECRET_KEY"       { $SECRET_KEY = $val }
        "STELLAR_RPC_URL"          { $RPC_URL    = $val }
        "STELLAR_NETWORK_PASSPHRASE" { $PASSPHRASE = $val }
        "GAME_HUB_CONTRACT_ID"    { $HUB_ID     = $val }
    }
}

if (-not $SECRET_KEY) { Write-Error "STELLAR_SECRET_KEY not set"; exit 1 }
if (-not $RPC_URL)    { $RPC_URL = "https://soroban-testnet.stellar.org" }
if (-not $PASSPHRASE) { $PASSPHRASE = "Test SDF Network ; September 2015" }
if (-not $HUB_ID)     { $HUB_ID = "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG" }

Write-Host "RPC:       $RPC_URL"
Write-Host "Hub:       $HUB_ID"

# ---- Find stellar CLI ----
$STELLAR = $null
foreach ($candidate in @("stellar", "stellar-cli")) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $STELLAR = $candidate
        break
    }
}

if (-not $STELLAR) {
    Write-Host "stellar-cli not found. Installing via cargo..." -ForegroundColor Yellow
    cargo install --locked stellar-cli --features opt
    $STELLAR = "stellar"
}

Write-Host "Using: $STELLAR"
& $STELLAR --version

# ---- Import deployer key ----
Write-Host ""
Write-Host "Importing deployer key..." -ForegroundColor Cyan
# Try different CLI versions' import syntax
$imported = $false
try {
    & $STELLAR keys secret add --name darkwater-deployer --overwrite 2>&1 | Out-Null
    $imported = $true
} catch {}
if (-not $imported) {
    try {
        echo $SECRET_KEY | & $STELLAR keys add darkwater-deployer --secret-key 2>&1 | Out-Null
        $imported = $true
    } catch {}
}
if (-not $imported) {
    # Stellar CLI v25 syntax
    & $STELLAR keys generate darkwater-deployer --secret-key $SECRET_KEY --network testnet 2>&1 | Out-Null
}
$DEPLOYER_PUB = (& $STELLAR keys address darkwater-deployer 2>&1)
Write-Host "Deployer:  $DEPLOYER_PUB"

# ---- Friendbot ----
Write-Host ""
Write-Host "Funding via Friendbot..." -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "https://friendbot.stellar.org/?addr=$DEPLOYER_PUB" -Method Post | Out-Null
    Write-Host "Funded (or already funded)"
} catch { Write-Host "Friendbot failed (may already be funded)" }

# ---- Clean build WASM ----
Write-Host ""
Write-Host "Clean building contracts..." -ForegroundColor Cyan
Set-Location (Join-Path $ROOT "contracts")
cargo clean 2>&1 | Out-Null
cargo build --release --target wasm32-unknown-unknown --package battleship-game --package bn254-verifier 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }
Set-Location $ROOT
Write-Host "Build complete!" -ForegroundColor Green

$BATTLESHIP_WASM = Join-Path $ROOT "contracts\target\wasm32-unknown-unknown\release\battleship_game.wasm"
$VERIFIER_WASM   = Join-Path $ROOT "contracts\target\wasm32-unknown-unknown\release\bn254_verifier.wasm"
if (-not (Test-Path $BATTLESHIP_WASM)) { Write-Error "battleship_game.wasm not found"; exit 1 }

# ---- Deploy Verifier ----
Write-Host ""
Write-Host "Deploying Verifier..." -ForegroundColor Cyan
$VERIFIER_ID = & $STELLAR contract deploy `
    --wasm $VERIFIER_WASM `
    --source darkwater-deployer `
    --network testnet `
    --rpc-url $RPC_URL `
    --network-passphrase $PASSPHRASE
Write-Host "Verifier:  $VERIFIER_ID" -ForegroundColor Green

# ---- Deploy Battleship ----
Write-Host ""
Write-Host "Deploying Battleship..." -ForegroundColor Cyan
$BATTLESHIP_ID = & $STELLAR contract deploy `
    --wasm $BATTLESHIP_WASM `
    --source darkwater-deployer `
    --network testnet `
    --rpc-url $RPC_URL `
    --network-passphrase $PASSPHRASE
Write-Host "Battleship: $BATTLESHIP_ID" -ForegroundColor Green

# ---- Initialize ----
Write-Host ""
Write-Host "Initializing Battleship contract..." -ForegroundColor Cyan
& $STELLAR contract invoke `
    --id $BATTLESHIP_ID `
    --source darkwater-deployer `
    --network testnet `
    --rpc-url $RPC_URL `
    --network-passphrase $PASSPHRASE `
    -- initialize `
    --admin $DEPLOYER_PUB `
    --verifier_contract $VERIFIER_ID `
    --game_hub_contract $HUB_ID
Write-Host "Initialized!" -ForegroundColor Green

# ---- Write new IDs to .env ----
Write-Host ""
Write-Host "Saving new contract IDs..." -ForegroundColor Cyan

function Update-EnvFile($path, $key, $value) {
    if (Test-Path $path) {
        $content = Get-Content $path
        $updated = $false
        $content = $content | ForEach-Object {
            if ($_ -match "^$key=") { "$key=$value"; $updated = $true }
            else { $_ }
        }
        if (-not $updated) { $content += "$key=$value" }
        $content | Set-Content $path -Encoding UTF8
    }
}

Update-EnvFile $ENV_FILE "BATTLESHIP_CONTRACT_ID" $BATTLESHIP_ID
Update-EnvFile $ENV_FILE "VERIFIER_CONTRACT_ID" $VERIFIER_ID
Update-EnvFile $FRONTEND_ENV "VITE_BATTLESHIP_CONTRACT_ID" $BATTLESHIP_ID
Update-EnvFile $FRONTEND_ENV "VITE_VERIFIER_CONTRACT_ID" $VERIFIER_ID

Write-Host ""
Write-Host "=================================================="
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "   Battleship: $BATTLESHIP_ID"
Write-Host "   Verifier:   $VERIFIER_ID"
Write-Host ""
Write-Host "Next step: cd frontend && npm run dev"
Write-Host "=================================================="
