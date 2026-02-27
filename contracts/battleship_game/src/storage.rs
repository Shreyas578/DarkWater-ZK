// =============================================================
// DarkWater ZK — Storage Keys & Types
// Soroban storage helpers for the battleship game contract
// =============================================================

use soroban_sdk::{contracttype, Address, Bytes, BytesN};

// --------------- Storage Key Enum ---------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    // Game state by game_id
    Game(u64),
    // Commitment by (game_id, player_address)
    Commitment(u64, Address),
    // Proof submitted by (game_id, player_address)  
    Proof(u64, Address),
    // Shots fired: (game_id, player_address, shot_index)
    Shot(u64, Address, u32),
    // Number of shots fired by player
    ShotCount(u64, Address),
    // Whether a proof is verified for a shot
    ShotVerified(u64, Address, u32),
    // Verifier contract address (set at init)
    VerifierContract,
    // Game Hub contract address (set at init)
    GameHubContract,
    // Admin/owner
    Admin,
    // Next game ID counter
    NextGameId,
}

// --------------- Game Status ---------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GameStatus {
    /// Game created, waiting for player B to join
    WaitingForOpponent,
    /// Both players joined, waiting for board commitments + proofs
    CommitmentPhase,
    /// Game is live, turns being played
    Active,
    /// Game completed, winner determined
    Finished,
    /// Game cancelled / abandoned
    Cancelled,
}

// --------------- Game State ---------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct GameState {
    pub game_id: u64,
    pub player_a: Address,
    pub player_b: Option<Address>,
    pub status: GameStatus,
    /// Whose turn it is (address of current player)
    pub current_turn: Option<Address>,
    /// Number of hits player A has landed on player B's board
    pub hits_a: u32,
    /// Number of hits player B has landed on player A's board
    pub hits_b: u32,
    /// Total ship cells (17 for standard battleship: 5+4+3+3+2)
    pub total_ship_cells: u32,
    /// Whether player A has submitted commitment
    pub commitment_a_submitted: bool,
    /// Whether player B has submitted commitment
    pub commitment_b_submitted: bool,
    /// Whether player A's board proof is verified
    pub proof_a_verified: bool,
    /// Whether player B's board proof is verified
    pub proof_b_verified: bool,
    /// Winner address (set when game finishes)
    pub winner: Option<Address>,
    /// Game Hub game ID (returned from start_game call)
    pub hub_game_id: Option<u64>,
    /// Timestamp when game created (ledger sequence)
    pub created_at: u32,
}

// --------------- Shot Record ---------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct ShotRecord {
    /// Row 0..9
    pub row: u32,
    /// Col 0..9
    pub col: u32,
    /// 0 = miss, 1 = hit, 255 = pending verification
    pub result: u32,
    /// Proof bytes for this shot's hit verification
    pub proof: Option<Bytes>,
}

// --------------- Board Commitment ---------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct BoardCommitment {
    /// Poseidon2 hash of the board layout (32 bytes)
    pub hash: BytesN<32>,
    /// BN254 proof of board validity
    pub proof: Bytes,
    /// Public inputs to the ZK circuit (commitment hash as field element)
    pub public_inputs: Bytes,
}
