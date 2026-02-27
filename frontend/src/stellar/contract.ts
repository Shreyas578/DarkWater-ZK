// =============================================================
// DarkWater ZK — Stellar Soroban Contract Interface
// Real on-chain calls to battleship_game contract on Testnet
// =============================================================

import { Buffer } from 'buffer'

import {
    Contract,
    rpc,
    TransactionBuilder,
    BASE_FEE,
    xdr,
    Address,
    Networks,
    nativeToScVal,
    scValToNative,
} from '@stellar/stellar-sdk'

// ---- Config ---
const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org'
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_PASSPHRASE || Networks.TESTNET
const BATTLESHIP_ID = import.meta.env.VITE_BATTLESHIP_CONTRACT_ID as string

function getServer() {
    return new rpc.Server(RPC_URL, { allowHttp: false })
}

// ---- Helpers for robust decoding ----

/** 
 * Robustly convert ScVal to native JS types.
 * Helps avoid "Bad union switch" errors by falling back to manual decoding.
 */
function safeScValToNative(val: xdr.ScVal): any {
    if (!val) return null;

    // If this isn't actually an xdr.ScVal (e.g. plain JS value), just return it.
    if (typeof (val as any).switch !== 'function') {
        console.warn('[safeScValToNative] Non-XDR value passed, returning as-is:', val);
        return val as any;
    }

    // Even calling .switch() can throw "Bad union switch" if the library's
    // internal XDR state is confused.
    let typeTag: number;
    let typeName: string;
    try {
        typeTag = (val as any).switch().value;
        typeName = (val as any).switch().name;
    } catch (e) {
        console.error('[CRITICAL] val.switch() failed. The XDR object is likely corrupt or incompatible.');
        try {
            console.error('Raw XDR Context (Base64):', (val as any).toXDR('base64'));
        } catch {
            console.error('Raw value (no toXDR available):', val);
        }
        throw e;
    }

    try {
        // Explicit manual decoding for all common tags
        // 0=BOOL, 1=VOID, 4=I32, 5=U32, 6=I64, 7=U64, 11=SYMBOL, 13=STRING, 18=ADDRESS, 14=BYTES
        if (typeTag === 0) return val.b();
        if (typeTag === 1) return null;
        if (typeTag === 4) return val.i32();
        if (typeTag === 5) return val.u32();
        if (typeTag === 6) return val.i64().toBigInt();
        if (typeTag === 7) return val.u64().toBigInt();
        if (typeTag === 11) return val.sym().toString();
        if (typeTag === 13) return val.str().toString();
        if (typeTag === 18) return Address.fromScVal(val).toString();
        if (typeTag === 14) return val.bytes();

        if (typeTag === 20) {
            return val.vec()?.map(v => safeScValToNative(v)) || [];
        }

        if (typeTag === 21) {
            const map: Record<string, any> = {};
            val.map()?.forEach(entry => {
                const k = safeScValToNative(entry.key());
                // Handle different key types for robustness
                const kStr = (typeof k === 'string' || typeof k === 'number' || typeof k === 'bigint')
                    ? k.toString() : JSON.stringify(k);
                map[kStr] = safeScValToNative(entry.val());
            });
            return map;
        }

        // Fallback to library only if manual fails or for unknown types
        return scValToNative(val);
    } catch (e) {
        console.warn(`[safeScValToNative] Manual decode failed for ${typeName} (Tag ${typeTag}). Fallback to SDK...`, e);
        try {
            return scValToNative(val);
        } catch (e2) {
            console.error(`[CRITICAL] SDK Decoder also failed for ${typeName} (Tag ${typeTag}):`, e2);
            console.error('Raw XDR Context (Base64):', val.toXDR('base64'));
            throw e2;
        }
    }
}

function getContract() {
    return new Contract(BATTLESHIP_ID)
}

async function handleSimulationError(simResult: rpc.Api.SimulateTransactionResponse, context: string) {
    let errorMsg = 'Unknown simulation error';
    const failResult = simResult as any;

    if (failResult.error) {
        errorMsg = failResult.error;
    } else if (failResult.result?.error) {
        errorMsg = failResult.result.error;
    }

    // Friendly message for Error(Contract, #1)
    if (errorMsg.includes('Error(Contract, #1)')) {
        errorMsg = "Contract is NOT INITIALIZED. Run 'npm run initialize' or './scripts/initialize.sh'";
    } else if (errorMsg.includes('Error(Contract, #4)')) {
        errorMsg = "Game Already Exists (Error #4)";
    }

    console.error(`[${context}] Simulation Failed:`, errorMsg, simResult);
    throw new Error(`${context} failed: ${errorMsg}`);
}

// ---- Generic tx builder + submit ----

/**
 * Bypasses SDK's getTransaction if it crashes on XDR parsing.
 * Manually fetches transaction status via JSON-RPC.
 */
async function manualGetTransaction(hash: string) {
    console.log('[manualGetTransaction] Fetching tx status for:', hash);
    const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        // Soroban RPC expects an *object* with { hash }, not a bare array
        params: { hash }
    };

    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const json = await res.json();
    if (json.error) {
        console.error('[manualGetTransaction] RPC Error:', json.error);
        throw new Error(`RPC Error: ${json.error.message || 'Unknown'}`);
    }

    const result = json.result;
    if (!result) {
        console.warn('[manualGetTransaction] No result field in RPC response');
        return { status: 'NOT_FOUND', hash };
    }
    console.log('[manualGetTransaction] Status:', result.status);

    // If success, we attempt to decode the returnValue, but we wrap it 
    // extremely defensively so that the WHOLE function doesn't crash 
    // if the SDK hits a "Bad union switch" during XDR parsing.
    let returnValue: xdr.ScVal | undefined;
    if (result.status === 'SUCCESS') {
        try {
            // First try resultMetaXdr (preferred for Soroban)
            if (result.resultMetaXdr) {
                const meta = xdr.TransactionMeta.fromXDR(result.resultMetaXdr, 'base64');
                returnValue = meta.v3().sorobanMeta()?.returnValue() ?? undefined;
            } else if (result.resultXdr) {
                // Fallback to resultXdr
                const txResult = xdr.TransactionResult.fromXDR(result.resultXdr, 'base64');
                const opResult = txResult.result().results()[0].tr();
                returnValue = (opResult as any).invokeHostFunctionResult().success();
            }
        } catch (e) {
            console.warn('[manualGetTransaction] XDR Parsing CRASHED (Library Bug). Returning SUCCESS status without return value.', e);
            // We return just the status so the caller knows the Tx confirmed.
        }
    }

    return {
        status: result.status,
        returnValue,
        hash: hash
    };
}

async function buildAndSubmitTx(
    publicKey: string,
    signTransaction: (xdr: string) => Promise<string>,
    operation: xdr.Operation,
): Promise<string> {
    const server = getServer()
    const account = await server.getAccount(publicKey)

    console.log('[buildAndSubmitTx] 1. Building Tx...')
    let tx: any;
    try {
        tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(30)
            .build()
    } catch (e) {
        console.error('[buildAndSubmitTx] Tx Build Error:', e);
        throw new Error(`Tx Build Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    // Simulate to get the footprint + auth
    console.log('[buildAndSubmitTx] 2. Simulating...')
    let simResult;
    try {
        simResult = await server.simulateTransaction(tx)
        console.log('[buildAndSubmitTx] Simulation raw result keys:', Object.keys(simResult))
    } catch (e) {
        console.error('[buildAndSubmitTx] Simulation CRASHED (Possible Bad union switch here):', e);
        throw new Error(`Simulation Crash: ${e instanceof Error ? e.message : 'XDR/Decoding Error'}`);
    }

    if (!rpc.Api.isSimulationSuccess(simResult)) {
        console.log('[buildAndSubmitTx] 3. Simulation failed logic')
        await handleSimulationError(simResult, 'buildAndSubmitTx');
        return ''; // Unreachable
    }

    console.log('[buildAndSubmitTx] 4. Assembling and Signing...')
    const preparedTx = rpc.assembleTransaction(tx, simResult).build()
    const preparedTxXdr = preparedTx.toXDR()

    // Sign with xBull wallet
    const signedXdr = await signTransaction(preparedTxXdr)
    console.log('[buildAndSubmitTx] 5. Submitting...')

    // Submit
    let sendResult;
    try {
        sendResult = await server.sendTransaction(
            TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
        )
    } catch (e) {
        console.error('[buildAndSubmitTx] Submission Error:', e);
        throw new Error(`Submission Error: ${e instanceof Error ? e.message : 'Internal SDK Error'}`);
    }

    if (sendResult.status === 'ERROR') {
        console.error('[buildAndSubmitTx] Send status ERROR:', sendResult.status)
        throw new Error(`Tx submission error: ${sendResult.status}`)
    }

    console.log('[buildAndSubmitTx] 6. Waiting for confirmation, hash:', sendResult.hash)
    // Wait for confirmation
    let getResult = await manualGetTransaction(sendResult.hash)
    let attempts = 0
    while ((!getResult.status || getResult.status === 'NOT_FOUND') && attempts < 20) {
        await new Promise(r => setTimeout(r, 1500))
        getResult = await manualGetTransaction(sendResult.hash)
        attempts++
    }

    if (getResult.status === 'SUCCESS') {
        return sendResult.hash
    }
    throw new Error(`Tx failed: ${getResult.status}`)
}

// ---- Contract Calls ----

/** create_game(player_a: Address) -> u64 */
export async function createGame(
    publicKey: string,
    signTransaction: (xdr: string) => Promise<string>,
): Promise<bigint> {
    const server = getServer()
    const contract = getContract()
    const account = await server.getAccount(publicKey)

    // Build a tx just for simulation so we can read the return value safely
    const simTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call(
            'create_game',
            new Address(publicKey).toScVal(),
        ))
        .setTimeout(30)
        .build()

    console.log('[createGame] 1. Simulating to get gameId...')
    const simResult = await server.simulateTransaction(simTx)
    if (!rpc.Api.isSimulationSuccess(simResult)) {
        await handleSimulationError(simResult, 'createGame')
        throw new Error('Simulation failed') // unreachable
    }

    const rawRet = simResult.result?.retval
    if (!rawRet) {
        throw new Error('No return value from createGame simulation')
    }

    const gameId = BigInt(safeScValToNative(rawRet))
    console.log('[createGame] 2. Simulated gameId:', gameId)

    // Now actually submit the transaction (re-using generic helper)
    console.log('[createGame] 3. Submitting real transaction...')
    const op = contract.call(
        'create_game',
        new Address(publicKey).toScVal(),
    )
    await buildAndSubmitTx(publicKey, signTransaction, op)

    console.log('[createGame] 4. Using gameId:', gameId)
    return gameId
}

/** join_game(game_id: u64, player_b: Address) */
export async function joinGame(
    publicKey: string,
    signTransaction: (xdr: string) => Promise<string>,
    gameId: bigint,
): Promise<void> {
    const contract = getContract()
    const op = contract.call(
        'join_game',
        nativeToScVal(gameId, { type: 'u64' }),
        new Address(publicKey).toScVal(),
    )
    await buildAndSubmitTx(publicKey, signTransaction, op)
}

/** submit_commitment(game_id, player, commitment_hash[32], proof, public_inputs) */
export async function submitCommitment(
    publicKey: string,
    signTransaction: (xdr: string) => Promise<string>,
    gameId: bigint,
    commitment: Uint8Array,  // 32 bytes
    proof: Uint8Array,       // 128 bytes
    publicInputs: Uint8Array,
): Promise<void> {
    const contract = getContract()
    const op = contract.call(
        'submit_commitment',
        nativeToScVal(gameId, { type: 'u64' }),
        new Address(publicKey).toScVal(),
        xdr.ScVal.scvBytes(Buffer.from(commitment)),
        xdr.ScVal.scvBytes(Buffer.from(proof)),
        xdr.ScVal.scvBytes(Buffer.from(publicInputs)),
    )
    await buildAndSubmitTx(publicKey, signTransaction, op)
}

/** fire_shot(game_id, attacker, target_row, target_col) -> u32 (shot_index) */
export async function fireShot(
    publicKey: string,
    signTransaction: (xdr: string) => Promise<string>,
    gameId: bigint,
    row: number,
    col: number,
): Promise<number> {
    const server = getServer()
    const contract = getContract()
    const account = await server.getAccount(publicKey)

    const op = contract.call(
        'fire_shot',
        nativeToScVal(gameId, { type: 'u64' }),
        new Address(publicKey).toScVal(),
        nativeToScVal(row, { type: 'u32' }),
        nativeToScVal(col, { type: 'u32' }),
    )

    const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(op)
        .setTimeout(30)
        .build()

    // --- Simulate to get shot_index return value safely ---
    let simResult: rpc.Api.SimulateTransactionResponse
    try {
        simResult = await server.simulateTransaction(tx)
    } catch (e) {
        console.error('fireShot simulation crashed:', e)
        throw new Error(`Simulation Crash: ${e instanceof Error ? e.message : 'XDR Error'}`)
    }

    if (!rpc.Api.isSimulationSuccess(simResult)) {
        await handleSimulationError(simResult, 'fireShot')
        throw new Error('Simulation failed') // unreachable
    }

    // Grab shot_index from simulation return value (safe path, before any XDR issues on-chain)
    let shotIndex = 0
    try {
        const rawRet = simResult.result?.retval
        if (rawRet) shotIndex = Number(safeScValToNative(rawRet))
    } catch (e) {
        console.warn('[fireShot] Could not parse simulated shot_index, defaulting to 0:', e)
    }
    console.log('[fireShot] Simulated shot_index:', shotIndex)

    // --- Assemble + sign ---
    const preparedTx = rpc.assembleTransaction(tx, simResult).build()
    const signedXdr = await signTransaction(preparedTx.toXDR())

    // --- Submit ---
    let sendResult: rpc.Api.SendTransactionResponse
    try {
        sendResult = await server.sendTransaction(
            TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
        )
    } catch (e) {
        console.error('[fireShot] Submission error:', e)
        throw new Error(`Submission Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    }

    if (sendResult.status === 'ERROR') {
        throw new Error(`fireShot submission error: ${sendResult.status}`)
    }

    // --- Wait for confirmation using manualGetTransaction (avoids Bad union switch) ---
    console.log('[fireShot] Waiting for tx:', sendResult.hash)
    let getResult = await manualGetTransaction(sendResult.hash)
    let attempts = 0
    while ((!getResult.status || getResult.status === 'NOT_FOUND') && attempts < 20) {
        await new Promise(r => setTimeout(r, 1500))
        getResult = await manualGetTransaction(sendResult.hash)
        attempts++
    }

    if (getResult.status !== 'SUCCESS') {
        throw new Error(`fireShot tx failed with status: ${getResult.status}`)
    }

    // Try to get shot_index from confirmed tx return value; fall back to simulated value
    if (getResult.returnValue) {
        try {
            shotIndex = Number(safeScValToNative(getResult.returnValue))
        } catch (e) {
            console.warn('[fireShot] Could not parse confirmed shot_index, using simulated value:', e)
        }
    }

    console.log('[fireShot] Final shot_index:', shotIndex)
    return shotIndex
}

/** submit_hit_proof(game_id, defender, shot_index, result, proof) */
export async function submitHitProof(
    publicKey: string,
    signTransaction: (xdr: string) => Promise<string>,
    gameId: bigint,
    shotIndex: number,
    result: 0 | 1,
    proof: Uint8Array,
): Promise<void> {
    const contract = getContract()
    const op = contract.call(
        'submit_hit_proof',
        nativeToScVal(gameId, { type: 'u64' }),
        new Address(publicKey).toScVal(),
        nativeToScVal(shotIndex, { type: 'u32' }),
        nativeToScVal(result, { type: 'u32' }),
        xdr.ScVal.scvBytes(Buffer.from(proof)),
    )
    await buildAndSubmitTx(publicKey, signTransaction, op)
}

/** get_game_state(game_id) — view call, no signing needed */
export async function getGameState(gameId: bigint): Promise<{
    game_id: bigint
    player_a: string
    player_b: string | null
    status: 'WaitingForOpponent' | 'CommitmentPhase' | 'Active' | 'Finished' | 'Cancelled'
    current_turn: string | null
    hits_a: number
    hits_b: number
    total_ship_cells: number
    commitment_a_submitted: boolean
    commitment_b_submitted: boolean
    proof_a_verified: boolean
    proof_b_verified: boolean
    winner: string | null
    hub_game_id: bigint | null
    created_at: number
}> {
    const server = getServer()
    const contract = getContract()

    // Use a dummy source account for view-only calls
    const dummyAccount = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
    const account = await server.getAccount(dummyAccount).catch(() => {
        // If dummy account doesn't exist, use contract address
        return server.getAccount(BATTLESHIP_ID)
    })

    const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(contract.call(
            'get_game_state',
            nativeToScVal(gameId, { type: 'u64' }),
        ))
        .setTimeout(30)
        .build()

    const simResult = await server.simulateTransaction(tx)
    if (!rpc.Api.isSimulationSuccess(simResult)) {
        await handleSimulationError(simResult, 'getGameState');
        throw new Error('Simulation failed'); // Unreachable
    }

    const rawResult = simResult.result?.retval;
    if (!rawResult) throw new Error('No return value from getGameState simulation')

    const result = safeScValToNative(rawResult)

    // Convert the result to the expected format
    return {
        game_id: result.game_id,
        player_a: result.player_a,
        player_b: result.player_b || null,
        status: typeof result.status === 'string' ? result.status : (result.status?.tag || result.status || 'Unknown'),
        current_turn: result.current_turn || null,
        hits_a: result.hits_a,
        hits_b: result.hits_b,
        total_ship_cells: result.total_ship_cells,
        commitment_a_submitted: result.commitment_a_submitted,
        commitment_b_submitted: result.commitment_b_submitted,
        proof_a_verified: result.proof_a_verified,
        proof_b_verified: result.proof_b_verified,
        winner: result.winner || null,
        hub_game_id: result.hub_game_id || null,
        created_at: result.created_at,
    }
}

/** 
 * Fetch recent games created on-chain by querying Stellar events.
 * This allows room listing without needing an indexer or contract modification.
 */
export async function getRecentGames(): Promise<{ id: bigint, playerA: string, createdAt: number }[]> {
    const server = getServer()
    const ledger = await server.getLatestLedger()

    // Look back ~24 hours (assuming ~5s per ledger)
    const startLedger = Math.max(0, ledger.sequence - 17280)

    try {
        const response = await server.getEvents({
            startLedger,
            filters: [{
                type: 'contract',
                contractIds: [BATTLESHIP_ID],
                topics: [[xdr.ScVal.scvSymbol('GAME_CRT').toXDR('base64')]]
            }],
            limit: 50
        })

        const games = response.events.map(event => {
            try {
                // Event data is (game_id, player_a)
                // Use a very defensive approach for event values
                if (!event.value) return null;
                const data = safeScValToNative(event.value);

                if (Array.isArray(data) && data.length >= 2) {
                    return {
                        id: BigInt(data[0]),
                        playerA: String(data[1]),
                        createdAt: event.ledger
                    }
                }
                return null;
            } catch (e) {
                console.warn('Failed to decode GAME_CRT event:', e);
                return null;
            }
        }).filter((g): g is NonNullable<typeof g> => g !== null)

        // Return unique games (latest first)
        const seen = new Set<bigint>()
        return games.filter(g => {
            if (seen.has(g.id)) return false
            seen.add(g.id)
            return true
        }).sort((a, b) => b.createdAt - a.createdAt)
    } catch (e) {
        console.error('getRecentGames failed:', e);
        return [];
    }
}
