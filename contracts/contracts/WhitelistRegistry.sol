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

    /// @notice Token whitelist request record (append-only list; status handled in later stories).
    struct WhitelistRequest {
        address token;
        address requester;
        uint64 requestedAt;
    }

    /// @notice ERC-20 token used to pay the whitelist request fee (e.g. USDC on this chain).
    address public requestFeeToken;

    /// @notice Amount of `requestFeeToken` required to submit a whitelist request.
    uint256 public requestFeeAmount;

    /// @notice Append-only list of submitted requests.
    WhitelistRequest[] public requests;

    /// @notice Prevent duplicate requests per token (per-chain).
    mapping(address => bool) public hasPendingRequest;

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
        IERC20(requestFeeToken).safeTransferFrom(msg.sender, address(this), requestFeeAmount);
        requests.push(WhitelistRequest({ token: token, requester: msg.sender, requestedAt: uint64(block.timestamp) }));
        emit WhitelistRequested(token, block.chainid, msg.sender);
    }

    /// @notice Approve a token for use in leagues on this chain.
    /// @param token The ERC-20 token address to whitelist.
    function approveToken(address token) external onlyOwner {
        if (token == address(0) || token.code.length == 0) revert InvalidTokenAddress(token);
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
