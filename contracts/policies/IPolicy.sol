// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Implementation of chain of responsibility pattern for policies to check transfers
// Each policy can call the next policy in the chain
abstract contract IPolicy {
    address constant NO_NEXT_POLICY_ADDRESS = address(0);

    address nextPolicyAddress;

    function setNextPolicy(address nextPolicyAddress_) external {
        nextPolicyAddress = nextPolicyAddress_;
    }

    function check(address from, address to, uint256 amount) external virtual returns (address from_, address to_, uint256 amount_);

    function _nextPolicy(address from, address to, uint256 amount) internal returns (address from_, address to_, uint256 amount_) {
        if (nextPolicyAddress == NO_NEXT_POLICY_ADDRESS) return (from, to, amount);

        IPolicy nextPolicyRef = IPolicy(nextPolicyAddress);
        return nextPolicyRef.check(from, to, amount);
    }
}
