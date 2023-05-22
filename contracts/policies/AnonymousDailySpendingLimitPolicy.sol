// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IPolicy.sol";
import "../CBAccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "hardhat/console.sol";

contract AnonymousDailySpendingLimitPolicy is IPolicy, CBAccessControl {
    using SafeCast for uint256;

    uint256 private defaultLimit = 100_0000;

    struct Limits {
        uint32 dayNumber;
        uint256 spent;
        uint256 limit;
    }

    mapping(address account => Limits) private limitOf;

    /**
     * @dev Returns the current day number since unix epoch.
     * @return uint32 The current day number.
     */
    function getDayNumber() public view returns (uint32) {
        return (block.timestamp / 1 days).toUint32();
    }

    function setLimit(address account_, uint256 limit_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        limitOf[account_].limit = limit_;
    }

    function setDefaultLimit(uint256 _defaultLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultLimit = _defaultLimit;
    }

    function check(address from, address to, uint256 amount) external override returns (address from_, address to_, uint256 amount_) {
        // console.log("6. Running AnonymousDailySpendingLimitPolicy");
        uint256 dailySpendingLimit = _getSpendingLimitOf(from);
        require(
            limitOf[from].spent + amount <= dailySpendingLimit,
            "AnonymousDailySpendingLimitPolicy: Transfer would exceed senders daily anonymous spending limit"
        );
        limitOf[from].spent += amount;

        return IPolicy._nextPolicy(from, to, amount);
    }

    // Get the spending limit for an address, if not set, set it to the default value
    function _getSpendingLimitOf(address _address) internal returns (uint256) {
        // Set default spending limit if not set
        if (limitOf[_address].limit == 0) limitOf[_address].limit = defaultLimit;

        // Check if new week, if so reset weekly spending limit
        resetSpendingLimitIfNewDay(_address);

        return limitOf[_address].limit;
    }

    /**
     * @dev Check if the current week is different from the week the spending limit was last reset
     * If so, reset the spending limit
     * @param _address address of the user
     */
    function resetSpendingLimitIfNewDay(address _address) private {
        uint32 curDay = getDayNumber();
        if (curDay > limitOf[_address].dayNumber) {
            limitOf[_address].dayNumber = curDay;
            limitOf[_address].spent = 0;
        }
    }
}
