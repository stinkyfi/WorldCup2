// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Prediction revision policy set at league creation and immutable thereafter.
/// @dev Locked = 0, Free = 1, Paid = 2
enum RevisionPolicy { Locked, Free, Paid }

/// @notice All immutable parameters supplied by the creator at league creation time.
/// @dev Defined at file scope so LeagueFactory can import without circular dependency.
struct LeagueParams {
    address token;              // ERC-20 token used for entry fees and payouts
    uint256 entryFee;           // Flat fee per entry (in token smallest unit)
    uint256 maxEntries;         // Hard cap on total entries (0 = no cap)
    uint256 maxEntriesPerWallet;// Max entries any single wallet may hold (0 = no cap)
    uint256 minThreshold;       // Minimum entries required at lock; refund triggered if not met
    RevisionPolicy revisionPolicy;
    uint256 lockTime;           // Unix timestamp: no new entries accepted on or after this time
}

/// @title League
/// @notice Per-league contract managing entry, commitment hash storage, state machine,
///         oracle result consumption, dispute window, and Merkle-proof claim payouts.
///
/// @dev STUB — Full implementation delivered in Story 1.5.
///      This stub exists solely so LeagueFactory.sol can compile and `new League(...)`.
///      Story 1.5 replaces the constructor body and adds all state variables,
///      events, errors, and functions.
contract League {
    // ─── Stub constructor ────────────────────────────────────────────────────
    /// @dev Accepts all factory-supplied params but performs no logic.
    ///      Story 1.5 replaces this body with the full league state machine.
    constructor(
        address /*creator*/,
        address /*oracleController*/,
        address /*devWallet*/,
        uint256 /*devFeeBps*/,
        uint256 /*creatorFeeCap*/,
        LeagueParams memory /*params*/
    ) {}
}
