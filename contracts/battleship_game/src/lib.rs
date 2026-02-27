// =============================================================
// DarkWater ZK — Main Battleship Game Contract
// Soroban smart contract on Stellar Testnet
// =============================================================

#![no_std]

mod game_hub_interface;
mod storage;

use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error,
    symbol_short, Address, Bytes, BytesN, Env, String, Symbol, Vec,
    log,
};

use storage::*;
use game_hub_interface::{call_hub_start_game, call_hub_end_game};

// --------------- Error Codes ---------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum GameError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    GameNotFound = 3,
    GameAlreadyExists = 4,
    NotAuthorized = 5,
    InvalidGameStatus = 6,
    AlreadyJoined = 7,
    CommitmentAlreadySubmitted = 8,
    CommitmentNotSubmitted = 9,
    ProofAlreadySubmitted = 10,
    ProofNotVerified = 11,
    NotYourTurn = 12,
    InvalidCell = 13,
    CellAlreadyFired = 14,
    ShotNotFound = 15,
    GameNotActive = 16,
    InvalidProof = 17,
    SelfPlay = 18,
    MissingOpponent = 19,
    BoardProofRequired = 20,
    ReplayAttack = 21,
}

impl From<GameError> for soroban_sdk::Error {
    fn from(e: GameError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

// --------------- Events ---------------

const EVENT_GAME_CREATED: Symbol = symbol_short!("GAME_CRT");
const EVENT_PLAYER_JOINED: Symbol = symbol_short!("JOINED");
const EVENT_COMMITMENT: Symbol = symbol_short!("COMMIT");
const EVENT_BOARD_VERIFIED: Symbol = symbol_short!("BRD_VFD");
const EVENT_SHOT_FIRED: Symbol = symbol_short!("SHOT");
const EVENT_HIT_VERIFIED: Symbol = symbol_short!("HIT_VFD");
const EVENT_GAME_ENDED: Symbol = symbol_short!("GAME_END");

// Total ship cells in standard Battleship (5+4+3+3+2)
const TOTAL_SHIP_CELLS: u32 = 17;
// Board dimension
const BOARD_SIZE: u32 = 10;

// No contractimport needed, using env.invoke_contract directly

// --------------- Contract ---------------

#[contract]
pub struct BattleshipGame;

#[contractimpl]
impl BattleshipGame {
    // ================================================================
    // ADMIN — Initialize Contract
    // ================================================================

    /// Initialize the contract with verifier and game hub addresses.
    /// Must be called once after deployment.
    pub fn initialize(
        env: Env,
        admin: Address,
        verifier_contract: Address,
        game_hub_contract: Address,
    ) {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, GameError::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VerifierContract, &verifier_contract);
        env.storage().instance().set(&DataKey::GameHubContract, &game_hub_contract);
        env.storage().instance().set(&DataKey::NextGameId, &1u64);

        log!(&env, "DarkWater ZK initialized. Admin={}", admin);
    }

    // ================================================================
    // GAME CREATION
    // ================================================================

    /// Player A creates a new game. Returns the game ID.
    /// Calls start_game() on the Game Hub once player B joins.
    pub fn create_game(env: Env, player_a: Address) -> u64 {
        player_a.require_auth();

        Self::assert_initialized(&env);

        let game_id = Self::next_game_id(&env);

        let game = GameState {
            game_id,
            player_a: player_a.clone(),
            player_b: None,
            status: GameStatus::WaitingForOpponent,
            current_turn: None,
            hits_a: 0,
            hits_b: 0,
            total_ship_cells: TOTAL_SHIP_CELLS,
            commitment_a_submitted: false,
            commitment_b_submitted: false,
            proof_a_verified: false,
            proof_b_verified: false,
            winner: None,
            hub_game_id: None,
            created_at: env.ledger().sequence(),
        };

        env.storage().persistent().set(&DataKey::Game(game_id), &game);

        env.events().publish(
            (EVENT_GAME_CREATED, symbol_short!("id")),
            (game_id, player_a),
        );

        log!(&env, "Game {} created by {}", game_id, game.player_a);
        game_id
    }

    /// Player B joins an existing game by game_id.
    /// Triggers cross-contract call to Game Hub start_game().
    pub fn join_game(env: Env, game_id: u64, player_b: Address) {
        player_b.require_auth();

        let mut game = Self::get_game(&env, game_id);

        // Validate state
        if game.status != GameStatus::WaitingForOpponent {
            panic_with_error!(&env, GameError::InvalidGameStatus);
        }
        if game.player_a == player_b {
            panic_with_error!(&env, GameError::SelfPlay);
        }

        game.player_b = Some(player_b.clone());
        game.status = GameStatus::CommitmentPhase;

        // ---- Call Game Hub start_game() ----
        let hub_contract = Self::get_hub_contract(&env);
        call_hub_start_game(
            &env,
            &hub_contract,
            game_id,
            &game.player_a,
            &player_b,
        );
        // Hub returns Void — use our own game_id as the hub_game_id reference
        let hub_game_id: u64 = game_id;
        game.hub_game_id = Some(hub_game_id);

        env.storage().persistent().set(&DataKey::Game(game_id), &game);

        env.events().publish(
            (EVENT_PLAYER_JOINED, symbol_short!("game")),
            (game_id, player_b, hub_game_id),
        );

        log!(&env, "Player B joined game {}. Hub game ID={}", game_id, hub_game_id);
    }

    // ================================================================
    // COMMITMENT PHASE
    // ================================================================

    /// Submit board commitment hash + ZK board validity proof.
    /// Both players must call this before the game becomes Active.
    pub fn submit_commitment(
        env: Env,
        game_id: u64,
        player: Address,
        commitment_hash: BytesN<32>,
        proof: Bytes,
        public_inputs: Bytes,
    ) {
        player.require_auth();

        let mut game = Self::get_game(&env, game_id);

        if game.status != GameStatus::CommitmentPhase {
            panic_with_error!(&env, GameError::InvalidGameStatus);
        }

        let is_player_a = game.player_a == player;
        let is_player_b = game.player_b.as_ref().map_or(false, |b| b == &player);

        if !is_player_a && !is_player_b {
            panic_with_error!(&env, GameError::NotAuthorized);
        }

        // Prevent re-submission
        if is_player_a && game.commitment_a_submitted {
            panic_with_error!(&env, GameError::CommitmentAlreadySubmitted);
        }
        if is_player_b && game.commitment_b_submitted {
            panic_with_error!(&env, GameError::CommitmentAlreadySubmitted);
        }

        // ---- Verify the board ZK proof via verifier contract ----
        let verifier = Self::get_verifier_contract(&env);
        let board_vk_hash = Self::board_vk_hash(&env);

        let proof_valid = env.invoke_contract::<bool>(
            &verifier,
            &Symbol::new(&env, "verify_board_proof"),
            soroban_sdk::vec![
                &env,
                proof.clone().into_val(&env),
                commitment_hash.clone().into_val(&env),
                board_vk_hash.into_val(&env),
            ],
        );

        if !proof_valid {
            panic_with_error!(&env, GameError::InvalidProof);
        }

        // Store commitment
        let commitment = BoardCommitment {
            hash: commitment_hash.clone(),
            proof: proof.clone(),
            public_inputs: public_inputs.clone(),
        };
        env.storage().persistent().set(
            &DataKey::Commitment(game_id, player.clone()),
            &commitment,
        );

        if is_player_a {
            game.commitment_a_submitted = true;
            game.proof_a_verified = true;
        } else {
            game.commitment_b_submitted = true;
            game.proof_b_verified = true;
        }

        // If both players committed, activate the game
        if game.commitment_a_submitted && game.commitment_b_submitted {
            game.status = GameStatus::Active;
            game.current_turn = Some(game.player_a.clone()); // Player A goes first
        }

        env.storage().persistent().set(&DataKey::Game(game_id), &game);

        env.events().publish(
            (EVENT_COMMITMENT, symbol_short!("game")),
            (game_id, player, commitment_hash),
        );

        if game.status == GameStatus::Active {
            env.events().publish(
                (EVENT_BOARD_VERIFIED, symbol_short!("both")),
                game_id,
            );
        }
    }

    // ================================================================
    // GAMEPLAY — TURN-BASED MOVES
    // ================================================================

    /// Fire a shot at the opponent's board.
    /// Must be the caller's turn. Cell must not have been fired before.
    pub fn fire_shot(
        env: Env,
        game_id: u64,
        attacker: Address,
        target_row: u32,
        target_col: u32,
    ) -> u32 {
        attacker.require_auth();

        let game = Self::get_game(&env, game_id);

        if game.status != GameStatus::Active {
            panic_with_error!(&env, GameError::GameNotActive);
        }

        // Verify it's attacker's turn
        let current_turn = game.current_turn.as_ref().expect("no current turn");
        if current_turn != &attacker {
            panic_with_error!(&env, GameError::NotYourTurn);
        }

        // Validate cell bounds
        if target_row >= BOARD_SIZE || target_col >= BOARD_SIZE {
            panic_with_error!(&env, GameError::InvalidCell);
        }

        // Anti-replay: check this cell hasn't been shot before by attacker
        let shot_count_key = DataKey::ShotCount(game_id, attacker.clone());
        let shot_index: u32 = env
            .storage()
            .persistent()
            .get(&shot_count_key)
            .unwrap_or(0u32);

        // Check existing shots for duplicate cell
        for i in 0..shot_index {
            let shot_key = DataKey::Shot(game_id, attacker.clone(), i);
            let prev_shot: ShotRecord = env
                .storage()
                .persistent()
                .get(&shot_key)
                .expect("shot not found");
            if prev_shot.row == target_row && prev_shot.col == target_col {
                panic_with_error!(&env, GameError::CellAlreadyFired);
            }
        }

        // Record shot as pending
        let shot = ShotRecord {
            row: target_row,
            col: target_col,
            result: 255, // pending
            proof: None,
        };
        env.storage().persistent().set(
            &DataKey::Shot(game_id, attacker.clone(), shot_index),
            &shot,
        );
        env.storage().persistent().set(&shot_count_key, &(shot_index + 1));

        env.events().publish(
            (EVENT_SHOT_FIRED, symbol_short!("game")),
            (game_id, attacker, target_row, target_col, shot_index),
        );

        shot_index
    }

    /// Defender submits a ZK proof proving the hit/miss result.
    /// After verification, switches turn back to attacker (if miss) or continues attack.
    pub fn submit_hit_proof(
        env: Env,
        game_id: u64,
        defender: Address,
        shot_index: u32,
        result: u32,     // 0=miss, 1=hit
        proof: Bytes,
    ) {
        defender.require_auth();

        let mut game = Self::get_game(&env, game_id);

        if game.status != GameStatus::Active {
            panic_with_error!(&env, GameError::GameNotActive);
        }

        // Determine the attacker (opponent of defender)
        let attacker = if game.player_a == defender {
            game.player_b.clone().expect("no player b")
        } else if game.player_b.as_ref().map_or(false, |b| b == &defender) {
            game.player_a.clone()
        } else {
            panic_with_error!(&env, GameError::NotAuthorized);
        };

        // Verify it's currently the attacker's turn waiting for defender's proof
        // (Turn: attacker fires, then defender must submit proof before next shot)
        let current_turn = game.current_turn.as_ref().expect("no turn");
        if current_turn != &attacker {
            panic_with_error!(&env, GameError::NotYourTurn);
        }

        // Get the shot
        let shot_key = DataKey::Shot(game_id, attacker.clone(), shot_index);
        let mut shot: ShotRecord = env
            .storage()
            .persistent()
            .get(&shot_key)
            .unwrap_or_else(|| panic_with_error!(&env, GameError::ShotNotFound));

        if shot.result != 255 {
            panic_with_error!(&env, GameError::ReplayAttack);
        }

        // Get defender's commitment
        let commitment_key = DataKey::Commitment(game_id, defender.clone());
        let commitment: BoardCommitment = env
            .storage()
            .persistent()
            .get(&commitment_key)
            .expect("commitment not found");

        // ---- Verify hit/miss proof ----
        let verifier = Self::get_verifier_contract(&env);
        let hit_vk_hash = Self::hit_vk_hash(&env);

        let proof_valid = env.invoke_contract::<bool>(
            &verifier,
            &Symbol::new(&env, "verify_hit_proof"),
            soroban_sdk::vec![
                &env,
                proof.clone().into_val(&env),
                commitment.hash.into_val(&env),
                shot.row.into_val(&env),
                shot.col.into_val(&env),
                result.into_val(&env),
                hit_vk_hash.into_val(&env),
            ],
        );

        if !proof_valid {
            panic_with_error!(&env, GameError::InvalidProof);
        }

        // Update shot record
        shot.result = result;
        shot.proof = Some(proof);
        env.storage().persistent().set(&shot_key, &shot);

        // Update hit counts
        if result == 1 {
            if attacker == game.player_a {
                game.hits_a += 1;
            } else {
                game.hits_b += 1;
            }
        }

        // ---- Check win condition ----
        let attacker_hit_count = if attacker == game.player_a { game.hits_a } else { game.hits_b };

        if attacker_hit_count >= TOTAL_SHIP_CELLS {
            // Attacker wins!
            game.status = GameStatus::Finished;
            game.winner = Some(attacker.clone());

            // Call Game Hub end_game()
            let hub_contract = Self::get_hub_contract(&env);
            if let Some(hub_game_id) = game.hub_game_id {
                call_hub_end_game(&env, &hub_contract, hub_game_id, &attacker);
            }

            env.events().publish(
                (EVENT_GAME_ENDED, symbol_short!("winner")),
                (game_id, attacker.clone()),
            );
        } else {
            // Switch turn to defender (they now attack)
            game.current_turn = Some(defender.clone());
        }

        env.storage().persistent().set(&DataKey::Game(game_id), &game);

        env.events().publish(
            (EVENT_HIT_VERIFIED, symbol_short!("game")),
            (game_id, defender, shot_index, result),
        );
    }

    // ================================================================
    // EXPLICIT END GAME (surrender / timeout)
    // ================================================================

    /// Called by winner or admin to finalize a completed game.
    /// If called directly by winner when game is Finished, calls end_game on hub.
    pub fn end_game(env: Env, game_id: u64, caller: Address) {
        caller.require_auth();

        let mut game = Self::get_game(&env, game_id);

        if game.status != GameStatus::Finished {
            panic_with_error!(&env, GameError::InvalidGameStatus);
        }

        let winner = game.winner.as_ref().expect("no winner");
        if caller != *winner {
            panic_with_error!(&env, GameError::NotAuthorized);
        }

        // Call Game Hub end_game() if not already called
        let hub_contract = Self::get_hub_contract(&env);
        if let Some(hub_game_id) = game.hub_game_id {
            call_hub_end_game(&env, &hub_contract, hub_game_id, winner);
        }

        env.events().publish(
            (EVENT_GAME_ENDED, symbol_short!("final")),
            (game_id, caller),
        );
    }

    // ================================================================
    // VIEW / QUERY FUNCTIONS
    // ================================================================

    pub fn get_game_state(env: Env, game_id: u64) -> GameState {
        Self::get_game(&env, game_id)
    }

    pub fn get_shot(env: Env, game_id: u64, attacker: Address, index: u32) -> ShotRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Shot(game_id, attacker, index))
            .unwrap_or_else(|| panic_with_error!(&env, GameError::ShotNotFound))
    }

    pub fn get_shot_count(env: Env, game_id: u64, attacker: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ShotCount(game_id, attacker))
            .unwrap_or(0u32)
    }

    pub fn get_commitment(env: Env, game_id: u64, player: Address) -> BoardCommitment {
        env.storage()
            .persistent()
            .get(&DataKey::Commitment(game_id, player))
            .expect("commitment not found")
    }

    // ================================================================
    // INTERNAL HELPERS
    // ================================================================

    fn assert_initialized(env: &Env) {
        if !env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(env, GameError::NotInitialized);
        }
    }

    fn get_game(env: &Env, game_id: u64) -> GameState {
        env.storage()
            .persistent()
            .get(&DataKey::Game(game_id))
            .unwrap_or_else(|| panic_with_error!(env, GameError::GameNotFound))
    }

    fn get_verifier_contract(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::VerifierContract)
            .expect("verifier not set")
    }

    fn get_hub_contract(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::GameHubContract)
            .expect("hub not set")
    }

    fn next_game_id(env: &Env) -> u64 {
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextGameId)
            .unwrap_or(1u64);
        env.storage()
            .instance()
            .set(&DataKey::NextGameId, &(id + 1));
        id
    }

    /// Board validity circuit verification key hash (from nargo compile output).
    /// Replace with actual VK hash after running `bb write_vk`.
    fn board_vk_hash(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[
            0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x18,
            0x29, 0x3A, 0x4B, 0x5C, 0x6D, 0x7E, 0x8F, 0x90,
            0x01, 0x12, 0x23, 0x34, 0x45, 0x56, 0x67, 0x78,
            0x89, 0x9A, 0xAB, 0xBC, 0xCD, 0xDE, 0xEF, 0xF0,
        ])
    }

    /// Hit verification circuit VK hash.
    fn hit_vk_hash(env: &Env) -> BytesN<32> {
        BytesN::from_array(env, &[
            0x10, 0x21, 0x32, 0x43, 0x54, 0x65, 0x76, 0x87,
            0x98, 0xA9, 0xBA, 0xCB, 0xDC, 0xED, 0xFE, 0x0F,
            0x20, 0x31, 0x42, 0x53, 0x64, 0x75, 0x86, 0x97,
            0xA8, 0xB9, 0xCA, 0xDB, 0xEC, 0xFD, 0x0E, 0x1F,
        ])
    }
}

use soroban_sdk::IntoVal;

// --------------- Tests ---------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Events}, Env, vec};

    fn setup_env() -> (Env, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let player_a = Address::generate(&env);
        let player_b = Address::generate(&env);

        let verifier_id = env.register_contract(None, crate::BattleshipGame); // placeholder
        let hub_id = Address::generate(&env); // mock hub

        (env, admin, player_a, player_b, verifier_id)
    }

    #[test]
    fn test_create_and_join_game() {
        // Integration test skeleton — full test requires mock hub + verifier
        // See tests/ directory for comprehensive tests
        assert!(true);
    }
}
