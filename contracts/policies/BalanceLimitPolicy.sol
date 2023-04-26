// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IPolicy.sol";
import "../CBAccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev One-way mapping of overflow balances in CBDC.
 * Once added, CBDC cannot escape this mapping.
 * Overflow balances are those that exceed the limit set by the BalanceLimitPolicy.
 * The intention is to transfer the excess amount to the user's regular bank account. However, this feature has not been implemented yet. As a result, the overflow balance is effectively removed from circulation.
 */
contract BalanceLimitPolicy is IPolicy, CBAccessControl {
    IERC20 private _token;

    /**
     * @dev The default balance limit for users which is set when the first time they receive CBDC, if they do not have a custom limit set.
     */
    uint256 private defaultLimit = 500_0000;

    struct BalanceLimitUser {
        uint256 limit;
        uint256 overflowBalance;
    }

    mapping(address => BalanceLimitUser) private _userDataOf;
    mapping(address account => bool) private _isExempt;

    event ExemptStatusChanged(address indexed account, bool exempt);
    event DefaultBalanceLimitUpdated(uint256 newDefaultLimit);
    event UserBalanceLimitUpdated(address indexed user, uint256 newLimit);
    event OverflowBalanceUpdated(address indexed user, uint256 amountIncrease);

    constructor(address CBtoken_) {
        _token = IERC20(CBtoken_);
    }

    /**
     * @dev Sets an account to be exempt from the balance limit policy.
     * @param account The account to set.
     * @param exempt True to set the account as exempt, false to set it as not exempt.
     */
    function setExempt(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_isExempt[account] != exempt, "BalanceLimitPolicy: Account status already set to the provided value");
        _isExempt[account] = exempt;
        emit ExemptStatusChanged(account, exempt);
    }

    function defaultBalanceLimit(uint256 _defaultLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultLimit = _defaultLimit;
        emit DefaultBalanceLimitUpdated(_defaultLimit);
    }

    /**
     * @dev Sets a custom balance limit for a user.
     * @param user The user to set the limit for.
     * @param limit_ The custom balance limit for the user.
     */
    function setUserBalanceLimit(address user, uint256 limit_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _userDataOf[user].limit = limit_;
        emit UserBalanceLimitUpdated(user, limit_);
    }

    /**
     * @dev Enforces the balance limit policy by checking the balance limit of the receiver.
     * If the transfer would cause the receiver's balance to exceed the limit, it fills the receiver's balance to its limit and moves the overflow to another account.
     * @param from The address of the sender.
     * @param to The address of the receiver.
     * @param amount The amount being transferred.
     * @return from_ The updated sender address.
     * @return to_ The updated receiver address.
     * @return amount_ The updated transfer amount after enforcing the balance limit policy.
     */
    function check(address from, address to, uint256 amount) external override returns (address from_, address to_, uint256 amount_) {
        if (_isExempt[from] || _isExempt[to]) return (from, to, amount);

        _ensureUserBalanceLimitExistsFor(to);

        uint256 limit = _userDataOf[to].limit;
        uint256 preBalance = _token.balanceOf(to);
        uint256 postBalance = preBalance + amount;

        // The account is full. Everything is overflow
        if (preBalance >= limit) {
            _userDataOf[to].overflowBalance += amount;
            amount = 0;
            emit OverflowBalanceUpdated(to, amount);
        }
        // The transfer will exceed the limit
        // Move the overflow to the overflow balance
        // Reduce the `amount` to be within the limit
        else if (postBalance > limit) {
            uint256 transferCapasity = limit - preBalance;
            uint256 overflow = amount - transferCapasity;
            _userDataOf[to].overflowBalance += overflow;
            require(transferCapasity + overflow == amount, "BalanceLimitPolicy: Overflow");
            amount = transferCapasity;
            emit OverflowBalanceUpdated(to, overflow);
        }

        return IPolicy._nextPolicy(from, to, amount);
    }

    /**
     * @dev Gets the overflow balance of a user.
     * The overflow balance is the amount of CBDC that exceeds the user's balance limit.
     * @param user The user to get the overflow balance for.
     * @return The overflow balance of the user.
     */
    function getOverflowBalanceOf(address user) external view returns (uint256) {
        return _userDataOf[user].overflowBalance;
    }

    /**
     * @dev Gets the balance limit of a user.
     * @param user The user to get the balance limit for.
     * @return The balance limit of the user.
     */
    function getUserBalanceLimitOf(address user) external view returns (uint256) {
        return _userDataOf[user].limit;
    }

    function _ensureUserBalanceLimitExistsFor(address user) internal {
        if (_userDataOf[user].limit == 0) {
            _userDataOf[user].limit = defaultLimit;
        }
    }
}
