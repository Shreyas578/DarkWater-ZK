// =============================================================
// DarkWater ZK — Game Hub Interface
// Cross-contract calls to the Stellar Game Hub
// Hub Address: CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG
// =============================================================

use soroban_sdk::{Address, Env, Symbol, Val, Vec};

/// The Game Hub contract ID — hardcoded per hackathon requirement
pub const GAME_HUB_ADDRESS: &str =
    "CB4VZAT2U3UC6XFK3N23SKRF2NDCMP3QHJYMCHHFMZO7MRQO6DQ2EMYG";

/// Call `start_game(game_id, session_id, player1, player2, player1_points, player2_points)`
/// on the Stellar Game Hub contract.
///
/// Hub's actual signature (6 params):
///   game_id:        Address  — the calling game contract's own address
///   session_id:     u32      — unique session identifier (our internal game_id)
///   player1:        Address
///   player2:        Address
///   player1_points: i128     — 0 for standard battleship
///   player2_points: i128     — 0 for standard battleship
///
/// The Hub returns Void, so we return () and the caller uses its own game_id as hub_game_id.
pub fn call_hub_start_game(
    env: &Env,
    hub_contract: &Address,
    our_game_id: u64,
    player_a: &Address,
    player_b: &Address,
) {
    // The hub identifies the calling game contract by its address
    let self_addr: Address = env.current_contract_address();
    // session_id is our internal game_id truncated to u32
    let session_id: u32 = (our_game_id & 0xFFFF_FFFF) as u32;
    // Points are not used in this integration
    let points_a: i128 = 0;
    let points_b: i128 = 0;

    let args: Vec<Val> = soroban_sdk::vec![
        env,
        self_addr.into_val(env),
        session_id.into_val(env),
        player_a.clone().into_val(env),
        player_b.clone().into_val(env),
        points_a.into_val(env),
        points_b.into_val(env),
    ];

    env.invoke_contract::<()>(
        hub_contract,
        &Symbol::new(env, "start_game"),
        args,
    );
}

/// Call `end_game(hub_game_id, winner)` on the Game Hub contract.
pub fn call_hub_end_game(
    env: &Env,
    hub_contract: &Address,
    hub_game_id: u64,
    winner: &Address,
) {
    let args: Vec<Val> = soroban_sdk::vec![
        env,
        hub_game_id.into_val(env),
        winner.clone().into_val(env),
    ];

    env.invoke_contract::<()>(
        hub_contract,
        &Symbol::new(env, "end_game"),
        args,
    );
}

// --------------- Trait for testability ---------------

pub trait GameHubClient {
    fn start_game(&self, env: &Env, our_game_id: u64, player_a: &Address, player_b: &Address);
    fn end_game(&self, env: &Env, hub_game_id: u64, winner: &Address);
}

pub struct LiveGameHubClient {
    pub hub_address: Address,
}

impl GameHubClient for LiveGameHubClient {
    fn start_game(&self, env: &Env, our_game_id: u64, player_a: &Address, player_b: &Address) {
        call_hub_start_game(env, &self.hub_address, our_game_id, player_a, player_b)
    }

    fn end_game(&self, env: &Env, hub_game_id: u64, winner: &Address) {
        call_hub_end_game(env, &self.hub_address, hub_game_id, winner);
    }
}

use soroban_sdk::IntoVal;
