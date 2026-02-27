# DarkWater ZK — Demo Video Script (2-3 min)

## Intro (0:00–0:20)

> "What if you could play Battleship against a stranger on the internet — and mathematically prove that neither of you cheated? That's exactly what DarkWater ZK does, using Zero-Knowledge proofs on Stellar."

Show: app landing screen with "DarkWater ZK" logo

---

## The Problem (0:20–0:40)

> "In any hidden-information game, the server knows all. Traditional implementations require trusting a third party to report hits and misses honestly. With ZK proofs, we remove that trust entirely."

Show: diagram of traditional (server sees all) vs ZK (nobody sees board)

---

## Connect Wallet (0:40–1:00)

1. Click **Connect xBull** → xBull extension popup opens
2. Approve connection → pubkey shown in header
3. Click **Create New Game** → xBull signs the `create_game` Soroban transaction
4. 6-char room code appears. Show Stellar Expert link for the on-chain transaction.

> "Every game action is a real Stellar transaction. Here's the create_game call on-chain."

---

## Opponent Joins (1:00–1:20)

5. Open second tab, connect different xBull account
6. Enter the room code → xBull signs `join_game`
7. Both tabs show **Place Your Fleet** screen

---

## ZK Board Commitment (1:20–1:50)

8. Place 5 ships in Tab A → click **Submit Board & Prove**
9. Show the "Generating ZK Proof..." spinner (~2s)
10. Show xBull popup to sign the `submit_commitment` transaction
11. Repeat in Tab B

> "The commitment is a SHA-256 hash of the ship layout. The ZK proof proves the ships are legal without revealing their positions. This transaction is stored immutably on Soroban."

---

## Gameplay (1:50–2:30)

12. Tab A fires at cell (3, G) → xBull signs `fire_shot` on-chain
13. Tab B shows: "Opponent shot here — prove hit or miss"
14. Click **Submit Hit/Miss Proof** → proof generates → xBull signs `submit_hit_proof`
15. Hit result propagates to Tab A

> "The defender cannot lie. If they have a ship at cell 3G, the ZK proof forces them to report a hit. Any attempt to cheat would fail proof verification on-chain."

---

## Win + Game Hub (2:30–3:00)

16. Playthrough until 17 hits
17. Winner screen shows
18. `end_game()` called on the Stellar Game Hub contract
19. Show Stellar Expert links for all transactions

> "All 17 hits verified cryptographically, all stored on Stellar Testnet. The Stellar Game Hub records the result, making the outcome verifiable by anyone."

---

## Closing (3:00)

> "DarkWater ZK – trustless, verifiable, on-chain gaming. Built on Stellar Protocol 25 with Noir ZK circuits and Barretenberg proofs. Zero trust required."
