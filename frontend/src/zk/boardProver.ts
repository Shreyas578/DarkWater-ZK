// =============================================================
// DarkWater ZK — Board Validity Proof Generator
// Simulates ZK proof generation for demo purposes.
// Real Noir/Barretenberg proof would require Poseidon2 in JS
// to match the circuit's hash, which needs a separate WASM setup.
// The game logic (hit/miss) is fully correct and enforced locally.
// =============================================================

export interface ShipPlacement {
    row: number
    col: number
    length: number
    orientation: 0 | 1  // 0=horizontal, 1=vertical
}


export interface BoardProofResult {
    proof: Uint8Array
    publicInputs: Uint8Array
    commitment: Uint8Array
    commitmentHex: string
}

/**
 * Compute a SHA-256 commitment from the ship layout.
 * Top byte zeroed to fit in BN254 field.
 */
export async function computeBoardCommitment(ships: ShipPlacement[]): Promise<Uint8Array> {
    const cells = buildCellList(ships)
    const flat = new Uint8Array(cells.length * 2)
    cells.forEach(([r, c], i) => {
        flat[i * 2] = r
        flat[i * 2 + 1] = c
    })
    const hash = await crypto.subtle.digest('SHA-256', flat)
    const bytes = new Uint8Array(hash)
    bytes[0] = 0  // fit in BN254 field
    return bytes
}

/**
 * Generate a board validity proof.
 * Simulates the ZK prover delay and returns mock proof bytes.
 * Commitment is a real SHA-256 hash used to keep game state honest.
 */
export async function generateBoardProof(ships: ShipPlacement[]): Promise<BoardProofResult> {
    if (ships.length !== 5) throw new Error('Must have exactly 5 ships')

    // Simulate proof generation time (realistic for Barretenberg WASM)
    await delay(2000)

    const commitment = await computeBoardCommitment(ships)
    const commitmentHex = bytesToHex(commitment)

    // Mock proof bytes (128 bytes = typical BN254 Groth16 proof size)
    const proof = crypto.getRandomValues(new Uint8Array(128))
    const publicInputs = commitment.slice(0, 32)

    return { proof, publicInputs, commitment, commitmentHex }
}

// ---- Helpers ----

export function buildCellList(ships: ShipPlacement[]): Array<[number, number]> {
    const cells: Array<[number, number]> = []
    for (const ship of ships) {
        for (let i = 0; i < ship.length; i++) {
            if (ship.orientation === 0) {
                cells.push([ship.row, ship.col + i])
            } else {
                cells.push([ship.row + i, ship.col])
            }
        }
    }
    return cells
}

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex: string): Uint8Array {
    const clean = hex.replace('0x', '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
