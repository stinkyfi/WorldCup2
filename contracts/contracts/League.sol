// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @notice Prediction revision policy set at league creation and immutable thereafter.
/// @dev Locked = 0, Free = 1, Paid = 2
enum RevisionPolicy { Locked, Free, Paid }

/// @notice All immutable parameters supplied by the creator at league creation time.
/// @dev Defined at file scope so LeagueFactory can import without circular dependency.
struct LeagueParams {
    address token;               // ERC-20 token used for entry fees and payouts
    uint256 entryFee;            // Flat fee per entry (in token smallest unit)
    uint256 maxEntries;          // Hard cap on total entries (0 = no cap)
    uint256 maxEntriesPerWallet; // Max entries any single wallet may hold (0 = no cap)
    uint256 minThreshold;        // Minimum entries required at lock; refund triggered if not met
    uint256 revisionFee;         // Fee per prediction revision (in token smallest unit) when revisionPolicy == Paid
    RevisionPolicy revisionPolicy;
    uint256 lockTime;            // Unix timestamp: no new entries accepted on or after this time
}

/// @notice League lifecycle states.
enum LeagueState { Active, Refunding, Resolved }

/// @title League
/// @notice Per-league contract managing entry, commitment hash storage, state machine,
///         oracle result consumption, dispute window, and Merkle-proof claim payouts.
contract League is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ───────────────────────────────────────────────────────────

    /// @notice Hard cap on combined dev + creator fee (10%).
    uint256 public constant MAX_FEE_BPS = 1000;

    /// @notice Duration after Merkle root is set during which unclaimed funds can be swept.
    uint256 public constant UNCLAIMED_EXPIRY = 90 days;

    // ─── Immutable config ────────────────────────────────────────────────────

    address public immutable creator;
    address public immutable oracleController;
    address public immutable devWallet;
    uint256 public immutable devFeeBps;
    uint256 public immutable creatorFeeCap;
    address public immutable token;
    uint256 public immutable entryFee;
    uint256 public immutable maxEntries;
    uint256 public immutable maxEntriesPerWallet;
    uint256 public immutable minThreshold;
    uint256 public immutable revisionFee;
    RevisionPolicy public immutable revisionPolicy;
    uint256 public immutable lockTime;

    // ─── State machine ───────────────────────────────────────────────────────

    LeagueState public state;

    // ─── Entry tracking ──────────────────────────────────────────────────────

    uint256 public totalEntries;
    address[] private _entrantsList;
    mapping(address => uint256) private _walletEntryCount;
    mapping(address => bool) private _refundClaimed;

    // ─── Merkle claim ────────────────────────────────────────────────────────

    bytes32 public merkleRoot;
    uint256 public merkleRootSetAt;
    mapping(bytes32 => bool) private _claimed;

    // ─── Events ──────────────────────────────────────────────────────────────

    event EntrySubmitted(address indexed player, bytes32 commitmentHash);
    event LeagueRefunding();
    event MerkleRootSet(bytes32 indexed root);
    event PrizeClaimed(address indexed player, uint256 amount);
    event FeeClaimed(address indexed claimant, uint256 amount);
    event RefundClaimed(address indexed player, uint256 amount);
    event UnclaimedSwept(uint256 amount);

    // ─── Custom errors ───────────────────────────────────────────────────────

    error LeagueLocked();
    error LeagueNotActive();
    error LeagueNotRefunding();
    error LeagueNotResolved();
    error MaxEntriesReached();
    error MaxEntriesPerWalletReached();
    error ThresholdMet();
    error MerkleRootAlreadySet();
    error InvalidProof();
    error AlreadyClaimed();
    error NoRefundDue();
    error UnclaimedNotExpired();
    error NotAuthorized();
    error InvalidAddress();
    error InvalidParams();

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(
        address creator_,
        address oracleController_,
        address devWallet_,
        uint256 devFeeBps_,
        uint256 creatorFeeCap_,
        LeagueParams memory params
    ) {
        if (creator_ == address(0)) revert InvalidAddress();
        if (oracleController_ == address(0)) revert InvalidAddress();
        if (devWallet_ == address(0)) revert InvalidAddress();
        if (devFeeBps_ + creatorFeeCap_ > MAX_FEE_BPS) revert InvalidParams();

        creator = creator_;
        oracleController = oracleController_;
        devWallet = devWallet_;
        devFeeBps = devFeeBps_;
        creatorFeeCap = creatorFeeCap_;
        token = params.token;
        entryFee = params.entryFee;
        maxEntries = params.maxEntries;
        maxEntriesPerWallet = params.maxEntriesPerWallet;
        minThreshold = params.minThreshold;
        revisionFee = params.revisionFee;
        revisionPolicy = params.revisionPolicy;
        lockTime = params.lockTime;
    }

    // ─── Entry ───────────────────────────────────────────────────────────────

    /// @notice Enter the league by paying `entryFee` in `token` and supplying a commitment hash.
    /// @param commitmentHash keccak256 of the player's plaintext predictions (revealed post-lock).
    function enter(bytes32 commitmentHash) external nonReentrant {
        if (block.timestamp >= lockTime) revert LeagueLocked();
        if (maxEntries > 0 && totalEntries >= maxEntries) revert MaxEntriesReached();
        if (maxEntriesPerWallet > 0 && _walletEntryCount[msg.sender] >= maxEntriesPerWallet)
            revert MaxEntriesPerWalletReached();

        // Track entrant list (deduplicated — only add on first entry)
        if (_walletEntryCount[msg.sender] == 0) {
            _entrantsList.push(msg.sender);
        }
        _walletEntryCount[msg.sender]++;
        totalEntries++;

        IERC20(token).safeTransferFrom(msg.sender, address(this), entryFee);
        emit EntrySubmitted(msg.sender, commitmentHash);
    }

    // ─── Threshold check & refund ─────────────────────────────────────────────

    /// @notice Check whether the minimum player threshold was met after lock time.
    ///         Callable by anyone. Transitions league to Refunding if underpopulated.
    function checkThreshold() external {
        if (block.timestamp < lockTime) revert LeagueNotActive();
        if (state != LeagueState.Active) revert LeagueNotActive();
        if (minThreshold == 0) return;
        if (totalEntries >= minThreshold) revert ThresholdMet();
        state = LeagueState.Refunding;
        emit LeagueRefunding();
    }

    /// @notice Claim a full entry fee refund when the league is in Refunding state.
    function claimRefund() external nonReentrant {
        if (state != LeagueState.Refunding) revert LeagueNotRefunding();
        uint256 entries = _walletEntryCount[msg.sender];
        if (entries == 0 || _refundClaimed[msg.sender]) revert NoRefundDue();
        _refundClaimed[msg.sender] = true;
        uint256 refundAmount = entries * entryFee;
        IERC20(token).safeTransfer(msg.sender, refundAmount);
        emit RefundClaimed(msg.sender, refundAmount);
    }

    // ─── Merkle root ──────────────────────────────────────────────────────────

    /// @notice Set the Merkle payout root. Restricted to devWallet (indexer operator).
    /// @param root keccak256 Merkle root encoding all prize and fee allocations.
    function setMerkleRoot(bytes32 root) external {
        if (msg.sender != devWallet) revert NotAuthorized();
        if (root == bytes32(0)) revert InvalidParams();
        if (merkleRoot != bytes32(0)) revert MerkleRootAlreadySet();
        merkleRoot = root;
        merkleRootSetAt = block.timestamp;
        state = LeagueState.Resolved;
        emit MerkleRootSet(root);
    }

    // ─── Prize claim ──────────────────────────────────────────────────────────

    /// @notice Claim a prize payout. Proof must be valid against the stored Merkle root.
    /// @param amount Token amount allocated to caller in the payout tree.
    /// @param proof  Merkle path proving (caller, amount, claimType=0) is in the tree.
    function claimPrize(uint256 amount, bytes32[] calldata proof) external nonReentrant {
        if (state != LeagueState.Resolved) revert LeagueNotResolved();
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount, uint8(0)));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();
        if (_claimed[leaf]) revert AlreadyClaimed();
        _claimed[leaf] = true;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit PrizeClaimed(msg.sender, amount);
    }

    // ─── Fee claim ────────────────────────────────────────────────────────────

    /// @notice Claim a creator or dev fee allocation. Proof must use claimType = 1.
    /// @param amount Token amount allocated to caller in the fee portion of the payout tree.
    /// @param proof  Merkle path proving (caller, amount, claimType=1) is in the tree.
    function claimFee(uint256 amount, bytes32[] calldata proof) external nonReentrant {
        if (state != LeagueState.Resolved) revert LeagueNotResolved();
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount, uint8(1)));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidProof();
        if (_claimed[leaf]) revert AlreadyClaimed();
        _claimed[leaf] = true;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit FeeClaimed(msg.sender, amount);
    }

    // ─── Sweep unclaimed ──────────────────────────────────────────────────────

    /// @notice Sweep leftover token balance to devWallet after the 90-day unclaimed window.
    function sweepUnclaimed() external {
        if (msg.sender != devWallet) revert NotAuthorized();
        if (state != LeagueState.Resolved) revert LeagueNotResolved();
        if (block.timestamp < merkleRootSetAt + UNCLAIMED_EXPIRY) revert UnclaimedNotExpired();
        uint256 remaining = IERC20(token).balanceOf(address(this));
        if (remaining == 0) return;
        IERC20(token).safeTransfer(devWallet, remaining);
        emit UnclaimedSwept(remaining);
    }
}
