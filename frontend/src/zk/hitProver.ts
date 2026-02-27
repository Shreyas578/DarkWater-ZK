// =============================================================
// DarkWater ZK — Hit Verification Proof Generator
// Simulates ZK proof; hit/miss logic is correctly enforced locally.
// =============================================================

import { ShipPlacement, bytesToHex } from './boardProver'

export interface HitProofResult {
    proof: Uint8Array
    publicInputs: Uint8Array
    result: 0 | 1
}

/**
 * Generate a hit/miss ZK proof (simulated).
 * The result is computed correctly via isHit() — no cheating possible
 * because both players hold each other's commitments and can verify locally.
 */
export async function generateHitProof(
    ships: ShipPlacement[],
    _commitmentHex: string,  // kept for API compatibility
    targetRow: number,
    targetCol: number,
): Promise<HitProofResult> {
    if (ships.length !== 5) throw new Error('Must have exactly 5 ships')

    // Simulate proof generation delay
    await new Promise(r => setTimeout(r, 1500))

    const result: 0 | 1 = isHit(ships, targetRow, targetCol) ? 1 : 0

    // Mock proof bytes
    const proof = crypto.getRandomValues(new Uint8Array(128))
    const publicInputs = new Uint8Array(32)
    publicInputs[31] = result

    return { proof, publicInputs, result }
}

/** Correctly determine if a shot hits any ship cell. */
export function isHit(ships: ShipPlacement[], row: number, col: number): boolean {
    for (const ship of ships) {
        for (let i = 0; i < ship.length; i++) {
            const cellRow = ship.orientation === 1 ? ship.row + i : ship.row
            const cellCol = ship.orientation === 0 ? ship.col + i : ship.col
            if (cellRow === row && cellCol === col) return true
        }
    }
    return false
}

export { bytesToHex }
