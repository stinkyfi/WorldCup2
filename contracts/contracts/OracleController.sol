// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title OracleController
/// @notice Manages authorised result posters, group result storage, and grace period logic.
///         One instance is deployed per supported EVM chain. The authorised oracle address
///         (a cron-managed backend wallet) posts group stage results on-chain after match
///         completion. League.sol consumes getResults() to validate payout eligibility.
///
///         Idempotency: posting identical results for the same group twice is a no-op (safe
///         for redundant cron operation). Posting conflicting results reverts.
///
///         stagingMode: when true (deploy-time immutable), setResultsForTesting() is callable
///         by anyone — used for local/staging end-to-end runs without a live oracle.
contract OracleController is Ownable {
    /// @notice The authorised oracle address that may call postResults().
    address public oracle;

    /// @notice Whether this deployment is in staging mode (immutable after deploy).
    bool public immutable stagingMode;

    /// @dev Packed group result storage. groupId maps to a fixed 4-team ranking.
    mapping(uint8 => address[4]) private _results;

    /// @dev Tracks whether results have been posted for each group.
    mapping(uint8 => bool) private _resultsPosted;

    /// @notice Expected deadline timestamp per group (set by owner; extended by extendGracePeriod).
    mapping(uint8 => uint256) public expectedDeadline;

    /// @notice Emitted when group results are posted on-chain.
    /// @param groupId The group index (0–11 for groups A–L).
    /// @param rankings The 4 team addresses ranked 1st–4th.
    event ResultsPosted(uint8 indexed groupId, address[4] rankings);

    /// @notice Emitted when an admin extends the grace period for a group.
    /// @param groupId The group index.
    /// @param newDeadline The updated deadline timestamp.
    event GracePeriodExtended(uint8 indexed groupId, uint256 newDeadline);

    /// @notice Reverts when a caller is not the authorised oracle.
    error UnauthorisedOracle(address caller);

    /// @notice Reverts when posting results that conflict with already-posted results.
    error ResultsAlreadyPosted(uint8 groupId);

    /// @notice Reverts when setResultsForTesting is called on a non-staging deployment.
    error NotStagingMode();

    /// @notice Reverts when getResults is called for a group with no posted results.
    error ResultsNotPosted(uint8 groupId);

    /// @notice Reverts when a zero address is provided where a valid address is required.
    error InvalidAddress();

    modifier onlyOracleOrOwner() {
        if (msg.sender != oracle && msg.sender != owner()) revert UnauthorisedOracle(msg.sender);
        _;
    }

    /// @param initialOwner The address that receives initial ownership (OZ v5 requirement).
    /// @param oracle_ The authorised oracle address that may post results.
    /// @param stagingMode_ Whether this deployment allows setResultsForTesting().
    constructor(address initialOwner, address oracle_, bool stagingMode_) Ownable(initialOwner) {
        if (oracle_ == address(0)) revert InvalidAddress();
        oracle = oracle_;
        stagingMode = stagingMode_;
    }

    /// @notice Rotate the authorised oracle address. Only callable by the owner.
    /// @param newOracle The replacement oracle address.
    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidAddress();
        oracle = newOracle;
    }

    /// @notice Post group stage results on-chain. Only callable by the authorised oracle.
    ///         Idempotent: a second call with identical data succeeds silently (no event re-emitted).
    ///         A second call with conflicting data reverts with ResultsAlreadyPosted.
    /// @param groupId The group index (0–11).
    /// @param rankings The 4 team addresses ranked 1st–4th.
    function postResults(uint8 groupId, address[4] calldata rankings) external onlyOracleOrOwner {
        if (_resultsPosted[groupId]) {
            // Idempotency check: identical data → silent no-op; different data → revert
            address[4] storage stored = _results[groupId];
            for (uint8 i = 0; i < 4; i++) {
                if (stored[i] != rankings[i]) revert ResultsAlreadyPosted(groupId);
            }
            return;
        }
        _results[groupId] = rankings;
        _resultsPosted[groupId] = true;
        emit ResultsPosted(groupId, rankings);
    }

    /// @notice Returns the stored rankings for a group.
    ///         Reverts with ResultsNotPosted if no results have been posted for this group.
    /// @param groupId The group index.
    /// @return The 4 team addresses ranked 1st–4th.
    function getResults(uint8 groupId) external view returns (address[4] memory) {
        if (!_resultsPosted[groupId]) revert ResultsNotPosted(groupId);
        return _results[groupId];
    }

    /// @notice Returns whether results have been posted for a group.
    /// @param groupId The group index.
    function hasResultsPosted(uint8 groupId) external view returns (bool) {
        return _resultsPosted[groupId];
    }

    /// @notice Staging-only: set results without oracle auth check. Reverts on production deploys.
    ///         Used for local/staging end-to-end test runs without a live oracle backend.
    /// @param groupId The group index.
    /// @param rankings The 4 team addresses ranked 1st–4th.
    function setResultsForTesting(uint8 groupId, address[4] calldata rankings) external {
        if (!stagingMode) revert NotStagingMode();
        _results[groupId] = rankings;
        _resultsPosted[groupId] = true;
        emit ResultsPosted(groupId, rankings);
    }

    /// @notice Extend the grace period deadline for a group by adding additional seconds.
    ///         Only callable by the owner (platform admin).
    /// @param groupId The group index.
    /// @param additionalSeconds Seconds to add to the current deadline.
    function extendGracePeriod(uint8 groupId, uint256 additionalSeconds) external onlyOwner {
        uint256 newDeadline = expectedDeadline[groupId] + additionalSeconds;
        expectedDeadline[groupId] = newDeadline;
        emit GracePeriodExtended(groupId, newDeadline);
    }

    /// @notice Set the initial expected results deadline for a group.
    ///         Only callable by the owner.
    /// @param groupId The group index.
    /// @param timestamp The absolute Unix timestamp of the expected deadline.
    function setGroupDeadline(uint8 groupId, uint256 timestamp) external onlyOwner {
        expectedDeadline[groupId] = timestamp;
    }
}
