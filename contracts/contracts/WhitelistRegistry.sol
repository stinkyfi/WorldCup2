// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title WhitelistRegistry
/// @notice Maintains the canonical list of approved ERC-20 tokens on this chain.
///         One instance is deployed per supported EVM chain. Only the owner
///         (platform admin) can approve or remove tokens. LeagueFactory reads
///         isWhitelisted() before creating a league.
contract WhitelistRegistry is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _tokens;

    /// @notice Emitted when a token is approved on this chain.
    event TokenApproved(address indexed token);

    /// @notice Emitted when a token is removed from this chain's whitelist.
    event TokenRemoved(address indexed token);

    /// @notice Reverts when the token address is invalid (zero address or non-contract).
    error InvalidTokenAddress(address token);

    /// @notice Reverts when approving a token that is already whitelisted.
    error TokenAlreadyWhitelisted(address token);

    /// @notice Reverts when removing a token that is not whitelisted.
    error TokenNotWhitelisted(address token);

    /// @param initialOwner The address that receives initial ownership (OZ v5 requirement).
    constructor(address initialOwner) Ownable(initialOwner) {}

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
