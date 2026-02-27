// =====================================================================
// DarkWater ZK - Board Validity Circuit
// Noir circuit proving a Battleship board is legally placed.
//
// Standard Battleship ships (lengths): [5, 4, 3, 3, 2] => 5 ships
// Board: 10x10 grid (rows 0..9, cols 0..9)
// Orientation: 0 = horizontal, 1 = vertical
//
// Private inputs:
//   ships: [[row, col, length, orientation]; 5]
//
// Public inputs:
//   commitment: Field  (Poseidon2 hash of all occupied cells)
//
// Proved constraints:
//   1. Every ship cell is within [0,9] x [0,9]
//   2. No two ships share a cell (no overlaps)
//   3. Ship lengths are exactly [5, 4, 3, 3, 2]
//   4. commitment == Poseidon2(all 17 occupied cells flattened)
// =====================================================================

use dep::std::hash::poseidon2;

// Board dimension
global BOARD_SIZE: u32 = 10;
// Number of ships
global NUM_SHIPS: u32 = 5;
// Total occupied cells: 5+4+3+3+2 = 17
global TOTAL_CELLS: u32 = 17;

// Expected ship lengths in order
global SHIP_LENGTHS: [u32; 5] = [5, 4, 3, 3, 2];

// Maximum cells any single ship can occupy (length 5)
global MAX_SHIP_LEN: u32 = 5;

fn main(
    // Private: ship placements [row, col, length, orientation] for each ship
    ships: [[Field; 4]; 5],
    // Public: Poseidon2 commitment of all occupied cells
    commitment: pub Field,
) {
    // ---- Step 1: Validate ship lengths ----
    for i in 0..NUM_SHIPS {
        let ship_len = ships[i][2] as u32;
        assert(
            ship_len == SHIP_LENGTHS[i],
            "Ship length mismatch"
        );
    }

    // ---- Step 2: Compute all occupied cells ----
    // We'll collect all occupied cells as (row, col) pairs
    // Using fixed-size arrays because Noir doesn't support dynamic allocation
    // Max cells: 5 ships * 5 max length = 25 slots (padded with sentinel 255)
    let mut cell_rows: [Field; 25] = [255; 25];
    let mut cell_cols: [Field; 25] = [255; 25];
    let mut cell_count: u32 = 0;

    for ship_idx in 0..NUM_SHIPS {
        let row = ships[ship_idx][0];
        let col = ships[ship_idx][1];
        let len = ships[ship_idx][2] as u32;
        let orientation = ships[ship_idx][3]; // 0=horizontal, 1=vertical

        for cell_idx in 0..MAX_SHIP_LEN {
            if cell_idx < len {
                // Compute cell position
                let cell_row = if orientation == 0 {
                    row  // horizontal: same row
                } else {
                    row + cell_idx as Field  // vertical: row increases
                };
                let cell_col = if orientation == 0 {
                    col + cell_idx as Field  // horizontal: col increases
                } else {
                    col  // vertical: same col
                };

                // ---- Constraint: within bounds ----
                assert(cell_row as u32 < BOARD_SIZE, "Ship row out of bounds");
                assert(cell_col as u32 < BOARD_SIZE, "Ship col out of bounds");

                cell_rows[cell_count] = cell_row;
                cell_cols[cell_count] = cell_col;
                cell_count += 1;
            }
        }
    }

    // Verify total cells match expected (17)
    assert(cell_count == TOTAL_CELLS, "Wrong total ship cells");

    // ---- Step 3: No overlaps ----
    // For every pair of cells, ensure they are not at the same position
    for i in 0..TOTAL_CELLS {
        for j in (i + 1)..TOTAL_CELLS {
            let same_row = cell_rows[i] == cell_rows[j];
            let same_col = cell_cols[i] == cell_cols[j];
            // They cannot occupy the same cell
            assert(!(same_row & same_col), "Ships overlap");
        }
    }

    // ---- Step 4: Commitment check ----
    // Flatten cells: [row0, col0, row1, col1, ..., row16, col16] = 34 fields
    // Poseidon2 hash of exactly TOTAL_CELLS * 2 = 34 field elements
    //
    // We hash pairs (row, col) for all 17 cells in placement order.
    // The frontend must use the same ordering when computing the commitment.

    let mut inputs: [Field; 34] = [0; 34];
    for i in 0..TOTAL_CELLS {
        inputs[i * 2] = cell_rows[i];
        inputs[i * 2 + 1] = cell_cols[i];
    }

    // Poseidon2 sponge on 34 inputs (batched as pairs)
    // Noir's poseidon2 takes a slice
    let computed_commitment = poseidon2::Poseidon2::hash(inputs, 34);

    assert(
        computed_commitment == commitment,
        "Commitment does not match board layout"
    );
}

// =====================================================================
// Test: valid 5-ship board
// Run with: nargo test
// =====================================================================
#[test]
fn test_valid_board() {
    // Ship placements: [row, col, length, orientation]
    // Ship 1 (len=5): row=0, col=0, horizontal -> cells (0,0),(0,1),(0,2),(0,3),(0,4)
    // Ship 2 (len=4): row=1, col=0, horizontal -> cells (1,0),(1,1),(1,2),(1,3)
    // Ship 3 (len=3): row=2, col=0, horizontal -> cells (2,0),(2,1),(2,2)
    // Ship 4 (len=3): row=3, col=0, horizontal -> cells (3,0),(3,1),(3,2)
    // Ship 5 (len=2): row=4, col=0, horizontal -> cells (4,0),(4,1)
    let ships: [[Field; 4]; 5] = [
        [0, 0, 5, 0],
        [1, 0, 4, 0],
        [2, 0, 3, 0],
        [3, 0, 3, 0],
        [4, 0, 2, 0],
    ];

    // Manually compute commitment for this board layout
    // (In practice this is computed by the JS prover using poseidon2)
    // For the test we compute it inline
    let inputs: [Field; 34] = [
        0,0,  0,1,  0,2,  0,3,  0,4,  // ship 1
        1,0,  1,1,  1,2,  1,3,        // ship 2
        2,0,  2,1,  2,2,              // ship 3
        3,0,  3,1,  3,2,              // ship 4
        4,0,  4,1,                    // ship 5
    ];
    let commitment = dep::std::hash::poseidon2::Poseidon2::hash(inputs, 34);

    main(ships, commitment);
}

#[test(should_fail)]
fn test_out_of_bounds_ship() {
    // Ship placed at row=9, col=8, len=5, horizontal -> col 8..12 out of bounds
    let ships: [[Field; 4]; 5] = [
        [9, 8, 5, 0], // out of bounds!
        [1, 0, 4, 0],
        [2, 0, 3, 0],
        [3, 0, 3, 0],
        [4, 0, 2, 0],
    ];
    main(ships, 0);
}

#[test(should_fail)]
fn test_overlapping_ships() {
    // Ship 1 and 2 both at row=0,col=0
    let ships: [[Field; 4]; 5] = [
        [0, 0, 5, 0],
        [0, 0, 4, 0], // overlaps!
        [2, 0, 3, 0],
        [3, 0, 3, 0],
        [4, 0, 2, 0],
    ];
    main(ships, 0);
}
