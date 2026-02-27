// =====================================================================
// DarkWater ZK - Hit Verification Circuit
// Noir circuit proving a hit/miss result is correct without
// revealing the board layout.
//
// Private inputs:
//   ships: [[row, col, length, orientation]; 5]  (defender's board)
//   target_row: Field   (attacker's shot row)
//   target_col: Field   (attacker's shot col)
//
// Public inputs:
//   commitment: Field   (Poseidon2 hash of defender's board, already on-chain)
//   target: Field       (target_row * 10 + target_col, packed)
//   result: Field       (0=miss, 1=hit - what the defender claims)
//
// Proved constraints:
//   1. commitment == Poseidon2(ships) - defender can't change their board
//   2. result correctly reflects whether (target_row, target_col) is occupied
// =====================================================================

use dep::std::hash::poseidon2;

global BOARD_SIZE: u32 = 10;
global NUM_SHIPS: u32 = 5;
global TOTAL_CELLS: u32 = 17;
global MAX_SHIP_LEN: u32 = 5;
global SHIP_LENGTHS: [u32; 5] = [5, 4, 3, 3, 2];

fn main(
    // Private: defender's board
    ships: [[Field; 4]; 5],
    target_row: Field,
    target_col: Field,
    // Public
    commitment: pub Field,
    target: pub Field,      // target_row * 10 + target_col
    result: pub Field,      // 0 or 1
) {
    // ---- Step 1: Verify target encoding ----
    // target == target_row * 10 + target_col
    assert(
        target == target_row * 10 + target_col,
        "Target encoding mismatch"
    );

    // ---- Step 2: Re-derive all occupied cells from private ships ----
    let mut cell_rows: [Field; 25] = [255; 25];
    let mut cell_cols: [Field; 25] = [255; 25];
    let mut cell_count: u32 = 0;

    for ship_idx in 0..NUM_SHIPS {
        let row = ships[ship_idx][0];
        let col = ships[ship_idx][1];
        let len = ships[ship_idx][2] as u32;
        let orientation = ships[ship_idx][3];

        // Validate lengths match expected
        assert(len == SHIP_LENGTHS[ship_idx], "Ship length mismatch");

        for cell_idx in 0..MAX_SHIP_LEN {
            if cell_idx < len {
                let cell_row = if orientation == 0 {
                    row
                } else {
                    row + cell_idx as Field
                };
                let cell_col = if orientation == 0 {
                    col + cell_idx as Field
                } else {
                    col
                };

                // Bounds check
                assert(cell_row as u32 < BOARD_SIZE, "Row out of bounds");
                assert(cell_col as u32 < BOARD_SIZE, "Col out of bounds");

                cell_rows[cell_count] = cell_row;
                cell_cols[cell_count] = cell_col;
                cell_count += 1;
            }
        }
    }

    assert(cell_count == TOTAL_CELLS, "Wrong total cells");

    // ---- Step 3: Verify commitment matches private board ----
    let mut inputs: [Field; 34] = [0; 34];
    for i in 0..TOTAL_CELLS {
        inputs[i * 2] = cell_rows[i];
        inputs[i * 2 + 1] = cell_cols[i];
    }
    let computed_commitment = poseidon2::Poseidon2::hash(inputs, 34);

    assert(
        computed_commitment == commitment,
        "Board commitment mismatch - board was changed!"
    );

    // ---- Step 4: Verify hit/miss result ----
    // Count how many occupied cells match the target
    let mut is_hit: Field = 0;
    for i in 0..TOTAL_CELLS {
        let matches_row: bool = cell_rows[i] == target_row;
        let matches_col: bool = cell_cols[i] == target_col;
        if matches_row & matches_col {
            is_hit = 1;
        }
    }

    // The claimed result must match the actual hit/miss
    assert(result == is_hit, "Hit/miss result is incorrect");

    // Result must be 0 or 1 (boolean)
    assert(
        (result == 0) | (result == 1),
        "Result must be 0 or 1"
    );
}

// =====================================================================
// Tests
// =====================================================================

#[test]
fn test_hit_correct() {
    let ships: [[Field; 4]; 5] = [
        [0, 0, 5, 0],
        [1, 0, 4, 0],
        [2, 0, 3, 0],
        [3, 0, 3, 0],
        [4, 0, 2, 0],
    ];

    let inputs: [Field; 34] = [
        0,0,  0,1,  0,2,  0,3,  0,4,
        1,0,  1,1,  1,2,  1,3,
        2,0,  2,1,  2,2,
        3,0,  3,1,  3,2,
        4,0,  4,1,
    ];
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash(inputs, 34);

    // Target: row=0, col=2 -> index=2 -> HIT
    main(ships, 0, 2, commitment, 2, 1);
}

#[test]
fn test_miss_correct() {
    let ships: [[Field; 4]; 5] = [
        [0, 0, 5, 0],
        [1, 0, 4, 0],
        [2, 0, 3, 0],
        [3, 0, 3, 0],
        [4, 0, 2, 0],
    ];

    let inputs: [Field; 34] = [
        0,0,  0,1,  0,2,  0,3,  0,4,
        1,0,  1,1,  1,2,  1,3,
        2,0,  2,1,  2,2,
        3,0,  3,1,  3,2,
        4,0,  4,1,
    ];
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash(inputs, 34);

    // Target: row=9, col=9 -> MISS
    main(ships, 9, 9, commitment, 99, 0);
}

#[test(should_fail)]
fn test_false_hit_claim() {
    let ships: [[Field; 4]; 5] = [
        [0, 0, 5, 0],
        [1, 0, 4, 0],
        [2, 0, 3, 0],
        [3, 0, 3, 0],
        [4, 0, 2, 0],
    ];

    let inputs: [Field; 34] = [
        0,0,  0,1,  0,2,  0,3,  0,4,
        1,0,  1,1,  1,2,  1,3,
        2,0,  2,1,  2,2,
        3,0,  3,1,  3,2,
        4,0,  4,1,
    ];
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash(inputs, 34);

    // Target: row=9, col=9 -> actually MISS, but claiming HIT=1 -> should fail
    main(ships, 9, 9, commitment, 99, 1);
}
