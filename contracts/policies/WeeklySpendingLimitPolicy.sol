// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IPolicy.sol";
import "../CBAccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

/**
 * @title WeeklySpendingLimitPolicy
 * @notice This contract enforces a weekly spending limit policy for user accounts.
 * @dev This contract is intended to be used in conjunction with other policy contracts.
 */
contract WeeklySpendingLimitPolicy is IPolicy, CBAccessControl {
    using SafeCast for uint256;

    uint256 private defaultLimit = 1_000_0000;

    struct Limits {
        uint32 weekNumber;
        uint256 spent;
        uint256 limit;
    }

    mapping(address account => Limits) limitOf;

    event DefaultLimitUpdated(uint256 newDefaultLimit);
    event LimitUpdated(address indexed account, uint256 newLimit);

    /**
     * @dev Returns the current week number since unix epoch.
     * @return uint32 The current day number.
     */
    function getWeekNumber() public view returns (uint32) {
        return (block.timestamp / 1 weeks).toUint32();
    }

    /**
     * @notice Get the spending limit for the given account.
     * @param _address The address of the account to get the limit of.
     */
    function getSpendingLimitOf(address _address) public view returns (uint256) {
        return limitOf[_address].limit;
    }

    /**
     * @notice Set the default spending limit for accounts.
     * @dev Can only be called by accounts with the DEFAULT_ADMIN_ROLE.
     * @param _defaultLimit The new default spending limit.
     */
    function setDefaultLimit(uint256 _defaultLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultLimit = _defaultLimit;
        emit DefaultLimitUpdated(_defaultLimit);
    }

    /**
     * @notice Set a custom spending limit for a specific account.
     * @dev Can only be called by accounts with the DEFAULT_ADMIN_ROLE.
     * @param account_ The address of the account to set the limit for.
     * @param limit_ The new spending limit for the account.
     */
    function setLimit(address account_, uint256 limit_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        limitOf[account_].limit = limit_;
        emit LimitUpdated(account_, limit_);
    }

    /**
     * @notice Perform a spending check and forward the request to the next policy in the chain.
     * @dev This function is called by the main contract that manages policies.
     * @param from The sender's address.
     * @param to The recipient's address.
     * @param amount The amount to be transferred.
     * @return from_ The sender's address after the check.
     * @return to_ The recipient's address after the check.
     * @return amount_ The amount to be transferred after the check.
     */
    function check(address from, address to, uint256 amount) external override returns (address from_, address to_, uint256 amount_) {
        uint256 weeklySpendingLimit = _getSpendingLimitOf(from);
        require(limitOf[from].spent + amount <= weeklySpendingLimit, "WeeklySpendingLimitPolicy: Transfer would exceed senders weekly spending limit");

        limitOf[from].spent += amount;
        return IPolicy._nextPolicy(from, to, amount);
    }

    /**
     * @dev Retrieve the spending limit of an address. If no limit is set for the address, it sets a default limit.
     * @param _address The address of the user.
     * @return uint256 The spending limit of the user.
     */
    function _getSpendingLimitOf(address _address) internal returns (uint256) {
        // Set default spending limit if not set
        if (limitOf[_address].limit == 0) limitOf[_address].limit = defaultLimit;
        // Check if new week, if so reset weekly spending limit
        resetSpendingLimitIfNewWeek(_address);
        return getSpendingLimitOf(_address);
    }

    /**
     * @dev Check if the current week is different from the week the spending limit was last reset
     * If so, reset the spending limit
     * @param _address address of the user
     */
    function resetSpendingLimitIfNewWeek(address _address) private {
        uint32 curWeek = getWeekNumber();

        if (curWeek > limitOf[_address].weekNumber) {
            limitOf[_address].weekNumber = curWeek;
            limitOf[_address].spent = 0;
        }
    }
}
