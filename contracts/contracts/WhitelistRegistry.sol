// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title WhitelistRegistry
/// @notice Maintains the canonical list of approved ERC-20 tokens on this chain.
///         One instance is deployed per supported EVM chain. Only the owner
///         (platform admin) can approve or remove tokens. LeagueFactory reads
///         isWhitelisted() before creating a league.
contract WhitelistRegistry is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    EnumerableSet.AddressSet private _tokens;

    /// @notice Emitted when a token is approved on this chain.
    event TokenApproved(address indexed token);

    /// @notice Emitted when a token is removed from this chain's whitelist.
    event TokenRemoved(address indexed token);

    /// @notice Emitted when a user submits a token whitelist request (Epic 9).
    /// @dev chainId is emitted for easy multi-chain indexing even though this contract is per-chain.
    event WhitelistRequested(address indexed token, uint256 indexed chainId, address indexed requester);

    /// @notice Reverts when the token address is invalid (zero address or non-contract).
    error InvalidTokenAddress(address token);

    /// @notice Reverts when approving a token that is already whitelisted.
    error TokenAlreadyWhitelisted(address token);

    /// @notice Reverts when removing a token that is not whitelisted.
    error TokenNotWhitelisted(address token);

    /// @notice Reverts when whitelist request fee isn't configured.
    error RequestFeeNotConfigured();

    /// @notice Reverts when submitting a request for a token already requested.
    error TokenAlreadyRequested(address token);

    /// @notice Reverts when owner uses `approveToken` while a pending queue request exists for that token (use `approveRequest` first).
    error TokenHasPendingWhitelistRequest(address token);

    /// @notice Token whitelist request record (append-only list; status handled in later stories).
    struct WhitelistRequest {
        address token;
        address requester;
        uint64 requestedAt;
        uint8 status; // 0=Pending, 1=Approved, 2=Rejected
        /// @notice Actual fee-token balance received at request time (handles fee-on-transfer fee tokens).
        uint256 feeEscrowed;
    }

    /// @notice Reverts when trying to vote twice on a request.
    error AlreadyVoted(uint256 requestId, address voter);

    /// @notice Reverts when requestId is out of range.
    error InvalidRequestId(uint256 requestId);

    /// @notice Reverts when a request is not in Pending status.
    error RequestNotPending(uint256 requestId);

    /// @notice Emitted when a wallet votes on a request.
    event WhitelistVoted(uint256 indexed requestId, address indexed voter, bool isUpvote);

    /// @notice Emitted when the owner rejects a whitelist request and refunds escrowed fee (Story 9.3).
    event TokenRejected(uint256 indexed requestId, address indexed token, address indexed requester, uint256 refundAmount);

    /// @notice ERC-20 token used to pay the whitelist request fee (e.g. USDC on this chain).
    address public requestFeeToken;

    /// @notice Amount of `requestFeeToken` required to submit a whitelist request.
    uint256 public requestFeeAmount;

    /// @notice Append-only list of submitted requests.
    WhitelistRequest[] public requests;

    /// @notice Prevent duplicate requests per token (per-chain).
    mapping(address => bool) public hasPendingRequest;

    /// @notice Votes are tracked per (requestId, voter).
    mapping(uint256 => mapping(address => uint8)) public voteOf; // 0=none, 1=up, 2=down

    /// @notice Aggregate vote counts per requestId.
    mapping(uint256 => uint256) public upvotes;
    mapping(uint256 => uint256) public downvotes;

    /// @param initialOwner The address that receives initial ownership (OZ v5 requirement).
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Set the ERC-20 fee required to submit whitelist requests.
    /// @dev Future stories add refund-on-reject logic; fees are escrowed in this contract.
    function setRequestFee(address feeToken, uint256 feeAmount) external onlyOwner {
        requestFeeToken = feeToken;
        requestFeeAmount = feeAmount;
    }

    /// @notice Submit a token whitelist request by paying the configured ERC-20 fee.
    function requestWhitelist(address token) external {
        if (token == address(0) || token.code.length == 0) revert InvalidTokenAddress(token);
        if (_tokens.contains(token)) revert TokenAlreadyWhitelisted(token);
        if (hasPendingRequest[token]) revert TokenAlreadyRequested(token);
        if (requestFeeToken == address(0) || requestFeeAmount == 0) revert RequestFeeNotConfigured();

        hasPendingRequest[token] = true;
        uint256 balBefore = IERC20(requestFeeToken).balanceOf(address(this));
        IERC20(requestFeeToken).safeTransferFrom(msg.sender, address(this), requestFeeAmount);
        uint256 received = IERC20(requestFeeToken).balanceOf(address(this)) - balBefore;
        requests.push(
            WhitelistRequest({
                token: token,
                requester: msg.sender,
                requestedAt: uint64(block.timestamp),
                status: 0,
                feeEscrowed: received
            })
        );
        emit WhitelistRequested(token, block.chainid, msg.sender);
    }

    function requestCount() external view returns (uint256) {
        return requests.length;
    }

    function getRequests(uint256 offset, uint256 limit) external view returns (WhitelistRequest[] memory out) {
        uint256 n = requests.length;
        if (offset >= n) return new WhitelistRequest[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new WhitelistRequest[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = requests[i];
        }
    }

    function vote(uint256 requestId, bool isUpvote) external {
        if (requestId >= requests.length) revert InvalidRequestId(requestId);
        if (requests[requestId].status != 0) revert RequestNotPending(requestId);
        if (voteOf[requestId][msg.sender] != 0) revert AlreadyVoted(requestId, msg.sender);
        voteOf[requestId][msg.sender] = isUpvote ? 1 : 2;
        if (isUpvote) {
            upvotes[requestId] += 1;
        } else {
            downvotes[requestId] += 1;
        }
        emit WhitelistVoted(requestId, msg.sender, isUpvote);
    }

    /// @notice Approve a pending whitelist request (owner). Escrowed fee is retained by the registry.
    function approveRequest(uint256 requestId) external onlyOwner {
        if (requestId >= requests.length) revert InvalidRequestId(requestId);
        WhitelistRequest storage r = requests[requestId];
        if (r.status != 0) revert RequestNotPending(requestId);
        address tok = r.token;
        if (tok == address(0) || tok.code.length == 0) revert InvalidTokenAddress(tok);
        if (!_tokens.add(tok)) revert TokenAlreadyWhitelisted(tok);
        r.status = 1;
        hasPendingRequest[tok] = false;
        emit TokenApproved(tok);
    }

    /// @notice Reject a pending whitelist request (owner); refunds exact escrow received at submit time (FoT-safe).
    function rejectRequest(uint256 requestId) external onlyOwner {
        if (requestId >= requests.length) revert InvalidRequestId(requestId);
        WhitelistRequest storage r = requests[requestId];
        if (r.status != 0) revert RequestNotPending(requestId);
        address tok = r.token;
        address payer = r.requester;
        uint256 escrow = r.feeEscrowed;
        r.status = 2;
        hasPendingRequest[tok] = false;
        if (escrow > 0) {
            IERC20(requestFeeToken).safeTransfer(payer, escrow);
        }
        emit TokenRejected(requestId, tok, payer, escrow);
    }

    /// @notice Approve a token for use in leagues on this chain.
    /// @param token The ERC-20 token address to whitelist.
    function approveToken(address token) external onlyOwner {
        if (token == address(0) || token.code.length == 0) revert InvalidTokenAddress(token);
        if (hasPendingRequest[token]) revert TokenHasPendingWhitelistRequest(token);
        if (!_tokens.add(token)) revert TokenAlreadyWhitelisted(token);
        emit TokenApproved(token);
    }

    /// @notice Remove a token from this chain's whitelist.
    ///         Existing leagues using the token continue to run (no retroactive effect).
    /// @param token The ERC-20 token address to remove.
    function removeToken(address token) external onlyOwner {
        if (!_tokens.remove(token)) revert TokenNotWhitelisted(token);
        emit TokenRemoved(token);
    }

    /// @notice Returns whether a token is currently whitelisted on this chain.
    /// @param token The ERC-20 token address to check.
    function isWhitelisted(address token) external view returns (bool) {
        return _tokens.contains(token);
    }

    /// @notice Returns all currently whitelisted token addresses on this chain.
    /// @return Array of whitelisted token addresses (order not guaranteed).
    function getWhitelistedTokens() external view returns (address[] memory) {
        return _tokens.values();
    }
}
