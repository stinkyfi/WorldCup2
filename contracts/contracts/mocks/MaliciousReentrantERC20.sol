// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface ILeagueReentrantProbe {
    function claimPrize(uint256 amount, bytes32[] calldata proof) external;
    function claimRefund() external;
}

/// @dev ERC-20 used in tests: on transfer *from the league*, calls back into `League`
///      to probe re-entrancy guards (Story 1.6).
contract MaliciousReentrantERC20 is ERC20 {
    enum AttackKind {
        None,
        ClaimPrize,
        ClaimRefund
    }

    address public league;
    address public attackVictim;
    AttackKind public attackKind;
    uint256 public attackAmount;
    bytes32[] private _attackProof;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function configureAttack(
        address league_,
        address victim_,
        AttackKind kind_,
        uint256 amount_,
        bytes32[] calldata proof_
    ) external {
        league = league_;
        attackVictim = victim_;
        attackKind = kind_;
        attackAmount = amount_;
        delete _attackProof;
        for (uint256 i = 0; i < proof_.length; i++) {
            _attackProof.push(proof_[i]);
        }
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _performAttack() private {
        if (league == address(0) || attackKind == AttackKind.None) return;
        if (attackKind == AttackKind.ClaimPrize) {
            ILeagueReentrantProbe(league).claimPrize(attackAmount, _attackProof);
        } else if (attackKind == AttackKind.ClaimRefund) {
            ILeagueReentrantProbe(league).claimRefund();
        }
    }

    /// @dev After league → user transfer completes, attempt nested `League` call (still inside outer `nonReentrant`).
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (from == league && to == attackVictim && value > 0) {
            _performAttack();
        }
    }
}
