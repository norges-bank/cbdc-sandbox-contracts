// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IPolicy.sol";
import "../CBAccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "hardhat/console.sol";

contract AnonymousTransactionAmountLimitPolicy is IPolicy, CBAccessControl {
    using SafeCast for uint256;

    uint256 private defaultLimit = 10_0000;

    mapping(address account => uint256 transactionAmountLimit) private limitOf;

    function setDefaultLimit(uint256 _defaultLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultLimit = _defaultLimit;
    }

    function setLimit(address account_, uint256 limit_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        limitOf[account_] = limit_;
    }

    function check(address from, address to, uint256 amount) external override returns (address from_, address to_, uint256 amount_) {
        // console.log("4. Running AnonymousTransactionAmountLimitPolicy");
        if (limitOf[from] == 0) limitOf[from] = defaultLimit;
        require(amount < limitOf[from], "AnonymousTransactionAmountLimitPolicy: Amount must be less than TRANSACTION AMOUNT LIMIT");
        return IPolicy._nextPolicy(from, to, amount);
    }
}
