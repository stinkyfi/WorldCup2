// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev Rejects all native ETH transfers — used to trigger `DevWalletTransferFailed` in tests.
contract RejectingEthReceiver {
    receive() external payable {
        revert();
    }
}
