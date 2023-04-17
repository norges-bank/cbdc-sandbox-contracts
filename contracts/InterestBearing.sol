// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { WadRayMath } from "./WadRayMath.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CBAccessControl.sol";
import "./InterestCalculation.sol";

contract InterestBearing is CBAccessControl {
    using WadRayMath for uint256;
    using SafeCast for uint256;
    using SafeCast for int256;
    using InterestCalculation for InterestCalculation.InterestData;

    InterestCalculation.InterestData private _interestData;

    IERC20 private _token;

    struct HistoricBalances {
        mapping(uint16 year => int256 balance) principal;
        mapping(uint16 year => int256 balance) scaledEOY;
        mapping(uint16 year => bool) hasTransacted;
    }

    mapping(address owner => HistoricBalances) private _historicBalancesOf;
    mapping(uint16 year => uint256) private _indexEOY;

    event NewInterestRate(uint256 interestRate, bool negativeInterestRate);

    constructor(
        uint256 index_,
        uint256 lastCalculationTimestamp_,
        uint16 currentYear_,
        uint256 annualInterestRate_,
        bool isNegativeInterestRate_,
        IERC20 token_
    ) {
        _interestData = InterestCalculation.InterestData({
            index: index_,
            lastCalculationTimestamp: lastCalculationTimestamp_,
            currentYear: currentYear_,
            annualInterestRate: annualInterestRate_,
            isNegativeInterestRate: isNegativeInterestRate_
        });

        _token = token_;
    }

    function setYear(uint16 year) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _interestData.currentYear = year;
    }

    function recalculateIndex() public returns (uint256) {
        return _interestData.recalculateIndex();
    }

    function setInterestRate(uint256 _interestRate, bool _negativeInterestRate) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _interestData.setInterestRate(_interestRate, _negativeInterestRate);
        emit NewInterestRate(_interestRate, _negativeInterestRate);
    }

    function calculateEOYInterest(uint16 year) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_indexEOY[year] == 0, string.concat("EOY index for ", Strings.toString(year), "already set. Use manuallySetEOYIndex instead"));

        _indexEOY[year] = recalculateIndex();
    }

    // Should be used if the EOY index is not calculated correctly or if the calculateEOYInterest function was not called by the central bank
    function manuallySetEOYIndex(uint16 year, uint256 newIndex) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _indexEOY[year] = newIndex;
    }

    function getInterestRate() public view returns (uint256, bool) {
        return _interestData.getInterestRate();
    }

    function getIndex() public view returns (uint256) {
        return _interestData.getIndex();
    }

    // This should really be calculated offchain, but it's here for convenience.
    // The user will have to have transacted every year since opening the account for this to work.
    // It will return wrong values if the user has not transacted every year.
    function calculateInterestEarned(address user, uint16 year) public view returns (int256) {
        require(year <= _interestData.currentYear, "InterestBearing: Cannot calculate interest for a future year");

        uint256 startingScaledBalance = uint256(_historicBalancesOf[user].scaledEOY[year - 1]);
        uint256 endingScaledBalance;

        if (_interestData.currentYear == year) {
            endingScaledBalance = _token.balanceOf(user);
        } else {
            endingScaledBalance = uint256(_historicBalancesOf[user].scaledEOY[year]);
        }

        int256 netDepositsWithdrawalsScaled = _historicBalancesOf[user].principal[year];

        int256 interest = interestEarned(startingScaledBalance, endingScaledBalance, netDepositsWithdrawalsScaled);
        return interest;
    }

    function interestEarned(uint256 startingActualBalance_, uint256 endingActualBalance_, int256 netDepositsWithdrawalsScaled) public pure returns (int256) {
        int256 startingActualBalance = startingActualBalance_.toInt256();
        int256 endingActualBalance = endingActualBalance_.toInt256();
        int256 interest = endingActualBalance - startingActualBalance - netDepositsWithdrawalsScaled;

        return interest;
    }

    function _getEndOfYearBalance(address _address, uint16 year) private view returns (int256) {
        if (_interestData.currentYear == year) {
            return _historicBalancesOf[_address].scaledEOY[year - 1];
        } else {
            return _historicBalancesOf[_address].scaledEOY[year];
        }
    }

    function _EOYcalculation(address from, address to) internal {
        _EOYcalculationFrom(from, _token.balanceOf(from));
        _EOYcalculationTo(to, _token.balanceOf(to));
    }

    function _EOYcalculationFrom(address from, uint256 balance) internal {
        if (!_historicBalancesOf[from].hasTransacted[_interestData.currentYear]) {
            _historicBalancesOf[from].scaledEOY[_interestData.currentYear - 1] = balance.toInt256();

            _historicBalancesOf[from].hasTransacted[_interestData.currentYear] = true;
        }
    }

    function _EOYcalculationTo(address to, uint256 balance) internal {
        if (!_historicBalancesOf[to].hasTransacted[_interestData.currentYear]) {
            _historicBalancesOf[to].scaledEOY[_interestData.currentYear - 1] = balance.toInt256();
            _historicBalancesOf[to].hasTransacted[_interestData.currentYear] = true;
        }
    }

    function _interestGainCalulation(address from, address to, uint256 amount) internal {
        _interestGainCalulationFrom(from, amount);
        _interestGainCalulationTo(to, amount);
    }

    // The user received funds. Change the user's underlying principal balance
    function _interestGainCalulationTo(address to, uint256 amount) internal {
        _historicBalancesOf[to].principal[_interestData.currentYear] += amount.toInt256();
    }

    // The user sent funds. Change the user's underlying principal balance
    function _interestGainCalulationFrom(address from, uint256 amount) internal {
        _historicBalancesOf[from].principal[_interestData.currentYear] -= amount.toInt256();
    }

    function getYear() internal view returns (uint16) {
        return _interestData.currentYear;
    }
}
