// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./WhitelistRegistry.sol";
import "./League.sol";

/// @title LeagueFactory
/// @notice Validates creation parameters, deploys new League instances, and maintains a
///         paginated on-chain registry of all deployed league addresses.
///
///         Reads WhitelistRegistry.isWhitelisted() to gate token acceptance before deployment.
///         Global params (devFeeBps, creatorFeeCap, minEntryAmount) are snapshotted into each
///         deployed League at creation time — existing leagues are never affected by subsequent
///         owner changes to these values.
///
///         Creation fee is charged in native ETH (chain-agnostic; entry tokens vary per league)
///         and forwarded in full to devWallet on each successful createLeague call.
contract LeagueFactory is Ownable, ReentrancyGuard {
    // ─── Addresses ───────────────────────────────────────────────────────────

    /// @notice WhitelistRegistry address consulted to validate entry tokens.
    ///         Updatable by owner so a fixed registry can be substituted without
    ///         redeploying the factory and losing the _leagues[] registry.
    address public whitelistRegistry;

    /// @notice OracleController address passed into every deployed League.
    ///         Updatable by owner; only affects future League deployments —
    ///         existing leagues retain the address baked in at their creation.
    address public oracleController;

    /// @notice Dev wallet that receives the native-ETH creation fee on each league deployment.
    address public immutable devWallet;

    // ─── Mutable global params ───────────────────────────────────────────────

    /// @notice Native-ETH creation fee required to call createLeague (in wei).
    uint256 public creationFee;

    /// @notice Platform dev fee in basis points (100 = 1%). Snapshotted into each new League.
    uint256 public devFeeBps;

    /// @notice Maximum creator fee in basis points a creator may set on their league.
    uint256 public creatorFeeCap;

    /// @notice Minimum entry amount (in token units) enforced on each new League.
    uint256 public minEntryAmount;

    /// @notice When true, createLeague reverts for all callers until unpaused by owner.
    bool public creationsPaused;

    // ─── Registry ────────────────────────────────────────────────────────────

    /// @dev Ordered list of all deployed league addresses (append-only).
    address[] private _leagues;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a new League is deployed and registered.
    /// @param league The address of the newly deployed League contract.
    /// @param creator The address of the caller that created the league.
    event LeagueCreated(address indexed league, address indexed creator);

    /// @notice Emitted when the owner updates global fee and entry parameters.
    event GlobalParamsUpdated(uint256 devFeeBps, uint256 creatorFeeCap, uint256 minEntryAmount);

    /// @notice Emitted when the owner changes the creation-paused flag.
    event CreationsPausedUpdated(bool paused);

    /// @notice Emitted when the owner updates the creation fee.
    event CreationFeeUpdated(uint256 newFee);

    /// @notice Emitted when the owner updates the WhitelistRegistry address.
    event WhitelistRegistryUpdated(address indexed newRegistry);

    /// @notice Emitted when the owner updates the OracleController address.
    event OracleControllerUpdated(address indexed newOracle);

    // ─── Custom errors ───────────────────────────────────────────────────────

    /// @notice Reverts when the provided entry token is not on the whitelist.
    error TokenNotWhitelisted(address token);

    /// @notice Reverts when createLeague is called while creationsPaused is true.
    error CreationsPaused();

    /// @notice Reverts when msg.value is below the required native-ETH creation fee.
    error InsufficientCreationFee(uint256 required, uint256 provided);

    /// @notice Reverts when a required LeagueParams field is invalid (e.g. entryFee == 0).
    error InvalidParams();

    /// @notice Reverts when a zero address is provided for a required address parameter.
    error InvalidAddress();

    /// @notice Reverts when the native-ETH forward to devWallet fails.
    error DevWalletTransferFailed();

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @param initialOwner         OZ v5 Ownable — receives initial ownership.
    /// @param whitelistRegistry_   WhitelistRegistry deployment on this chain.
    /// @param oracleController_    OracleController deployment on this chain.
    /// @param devWallet_           Address that receives creation fees in native ETH.
    /// @param creationFee_         Initial creation fee in wei.
    /// @param devFeeBps_           Initial platform dev fee in basis points.
    /// @param creatorFeeCap_       Initial maximum creator fee in basis points.
    /// @param minEntryAmount_      Initial minimum entry amount (in token units).
    constructor(
        address initialOwner,
        address whitelistRegistry_,
        address oracleController_,
        address devWallet_,
        uint256 creationFee_,
        uint256 devFeeBps_,
        uint256 creatorFeeCap_,
        uint256 minEntryAmount_
    ) Ownable(initialOwner) {
        if (whitelistRegistry_ == address(0)) revert InvalidAddress();
        if (oracleController_ == address(0)) revert InvalidAddress();
        if (devWallet_ == address(0)) revert InvalidAddress();
        whitelistRegistry = whitelistRegistry_;
        oracleController = oracleController_;
        devWallet = devWallet_;
        creationFee = creationFee_;
        devFeeBps = devFeeBps_;
        creatorFeeCap = creatorFeeCap_;
        minEntryAmount = minEntryAmount_;
    }

    // ─── Core ────────────────────────────────────────────────────────────────

    /// @notice Deploy a new League with the provided parameters.
    ///         Caller must supply at least `creationFee` in native ETH.
    ///         The full msg.value is forwarded to devWallet on success.
    /// @param params  Struct of immutable league configuration (see LeagueParams).
    /// @return league Address of the newly deployed League contract.
    function createLeague(LeagueParams calldata params) external payable nonReentrant returns (address league) {
        if (creationsPaused) revert CreationsPaused();
        if (msg.value < creationFee) revert InsufficientCreationFee(creationFee, msg.value);
        if (!WhitelistRegistry(whitelistRegistry).isWhitelisted(params.token))
            revert TokenNotWhitelisted(params.token);
        if (params.entryFee == 0) revert InvalidParams();
        if (params.lockTime <= block.timestamp) revert InvalidParams();
        // Paid revision policy requires a non-zero revisionFee; non-paid policies must have zero fee.
        if (params.revisionPolicy == RevisionPolicy.Paid) {
            if (params.revisionFee == 0) revert InvalidParams();
        } else {
            if (params.revisionFee != 0) revert InvalidParams();
        }

        League newLeague = new League(
            msg.sender,
            oracleController,
            devWallet,
            devFeeBps,
            creatorFeeCap,
            params
        );
        league = address(newLeague);
        _leagues.push(league);

        // Forward full creation fee to devWallet.
        // Using low-level call to avoid 2300-gas limit on smart-contract wallets.
        (bool sent,) = devWallet.call{value: msg.value}("");
        if (!sent) revert DevWalletTransferFailed();

        emit LeagueCreated(league, msg.sender);
    }

    // ─── Owner admin ─────────────────────────────────────────────────────────

    /// @notice Update global fee and entry parameters. Applies to future leagues only.
    /// @param devFeeBps_       New platform dev fee in basis points.
    /// @param creatorFeeCap_   New maximum creator fee in basis points.
    /// @param minEntryAmount_  New minimum entry amount in token units.
    function setGlobalParams(
        uint256 devFeeBps_,
        uint256 creatorFeeCap_,
        uint256 minEntryAmount_
    ) external onlyOwner {
        devFeeBps = devFeeBps_;
        creatorFeeCap = creatorFeeCap_;
        minEntryAmount = minEntryAmount_;
        emit GlobalParamsUpdated(devFeeBps_, creatorFeeCap_, minEntryAmount_);
    }

    /// @notice Pause or unpause league creation globally.
    /// @param paused_ True to pause; false to unpause.
    function setCreationsPaused(bool paused_) external onlyOwner {
        creationsPaused = paused_;
        emit CreationsPausedUpdated(paused_);
    }

    /// @notice Update the native-ETH creation fee.
    /// @param fee_ New creation fee in wei.
    function setCreationFee(uint256 fee_) external onlyOwner {
        creationFee = fee_;
        emit CreationFeeUpdated(fee_);
    }

    /// @notice Point the factory at a new WhitelistRegistry deployment.
    ///         Only affects future createLeague calls — existing leagues are unaffected.
    /// @param registry_ New WhitelistRegistry address (must be non-zero).
    function setWhitelistRegistry(address registry_) external onlyOwner {
        if (registry_ == address(0)) revert InvalidAddress();
        whitelistRegistry = registry_;
        emit WhitelistRegistryUpdated(registry_);
    }

    /// @notice Point the factory at a new OracleController deployment.
    ///         Only affects future League deployments — existing leagues retain
    ///         the OracleController address baked in at their creation.
    /// @param oracle_ New OracleController address (must be non-zero).
    function setOracleController(address oracle_) external onlyOwner {
        if (oracle_ == address(0)) revert InvalidAddress();
        oracleController = oracle_;
        emit OracleControllerUpdated(oracle_);
    }

    // ─── Registry view ───────────────────────────────────────────────────────

    /// @notice Return a paginated slice of deployed league addresses.
    /// @param offset  Start index (0-based). Returns empty array if offset >= total count.
    /// @param limit   Maximum number of addresses to return.
    /// @return Slice of league addresses from [offset, min(offset+limit, total)).
    function getLeagues(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = _leagues.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = _leagues[offset + i];
        }
        return result;
    }
}
