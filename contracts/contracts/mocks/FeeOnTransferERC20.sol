// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Burns a fixed `feePerTransfer` on every transfer/transferFrom (Story 1.6 edge case).
///      Documents that `League` credits `entryFee` while actual token receipt can be lower.
contract FeeOnTransferERC20 is ERC20 {
    uint256 public immutable feePerTransfer;

    constructor(string memory name, string memory symbol, uint256 feePerTransfer_) ERC20(name, symbol) {
        feePerTransfer = feePerTransfer_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (
            from == address(0) || to == address(0) || feePerTransfer == 0 || value <= feePerTransfer
        ) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = feePerTransfer;
        super._update(from, to, value - fee);
        super._update(from, address(0x000000000000000000000000000000000000dEaD), fee);
    }
}
