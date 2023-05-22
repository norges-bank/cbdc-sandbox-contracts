// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./policies/IPolicy.sol";
import "./CBAccessControl.sol";

// Implementation of chain of responsibility pattern for policies to check transfers
// Each policy can call the next policy in the chain
contract PolicyRunner is CBAccessControl {
    address private _firstPolicy;

    function setDefaultPolicy(address policy) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _firstPolicy = policy;
    }

    function _check(address from, address to, uint256 amount) internal returns (address from_, address to_, uint256 amount_) {
        if (_firstPolicy == address(0)) return (from, to, amount);
        IPolicy policies = IPolicy(_firstPolicy);
        return policies.check(from, to, amount);
    }
}
