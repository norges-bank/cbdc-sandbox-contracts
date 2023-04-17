// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./WadRayMath.sol";

/**
 * @title InterestCalculation
 * @dev This library provides interest calculation and index management functionality.
 * The library is designed to be flexible and can be used for any asset or token that requires interest calculation.
 */
library InterestCalculation {
    using WadRayMath for uint256;
    using SafeCast for uint256;
    using SafeCast for int256;

    /**
     * @dev InterestData is a struct that stores data related to interest calculation.
     * @param index The interest index.
     * @param lastCalculationTimestamp The timestamp of the last interest calculation.
     * @param annualInterestRate The annual interest rate in ray units (27 decimal places).
     * @param isNegativeInterestRate Flag to indicate if the interest rate is negative.
     * @param currentYear The current year.
     */

    struct InterestData {
        uint256 index;
        uint256 lastCalculationTimestamp;
        uint256 annualInterestRate;
        bool isNegativeInterestRate;
        uint16 currentYear;
    }

    /**
     * @notice Updates the interest index based on the current interest rate and the time elapsed since the last calculation.
     * @dev This function should be called before any operation involving the interest index.
     * @param self The InterestData struct to update.
     * @return The updated interest index.
     */
    function recalculateIndex(InterestData storage self) internal returns (uint256) {
        // Only run once per block
        if (block.timestamp == self.lastCalculationTimestamp) return 0;

        uint256 lastIndex = self.index;
        uint256 lastCalcTime = self.lastCalculationTimestamp;

        uint256 timeDelta = block.timestamp - lastCalcTime;
        uint256 timeDeltaYear = (timeDelta * 1e27) / 31_557_600; // 1 year includes leap years' consideration

        int256 interestTimesTimeDelta = self.annualInterestRate.rayMul(timeDeltaYear).toInt256();
        if (self.isNegativeInterestRate) interestTimesTimeDelta = interestTimesTimeDelta * -1;
        uint256 interestAdjustment = (interestTimesTimeDelta + 1e27).toUint256();
        self.index = ((interestAdjustment).rayMul(lastIndex));
        self.lastCalculationTimestamp = block.timestamp;

        return self.index;
    }

    /**
     * @notice Updates the annual interest rate.
     * @dev This function should be called when the interest rate needs to be updated.
     * @param self The InterestData struct to update.
     * @param _annualInterestRate The new annual interest rate in ray units (27 decimal places).
     * @param _isNegativeInterestRate Flag to indicate if the new interest rate is negative.
     */
    function setInterestRate(InterestData storage self, uint256 _annualInterestRate, bool _isNegativeInterestRate) internal {
        recalculateIndex(self);
        self.annualInterestRate = _annualInterestRate;
        self.isNegativeInterestRate = _isNegativeInterestRate;
    }

    /**
     * @notice Returns the current annual interest rate and the negative interest rate flag.
     * @param self The InterestData struct.
     * @return The annual interest rate in ray units (27 decimal places) and the negative interest rate flag.
     */
    function getInterestRate(InterestData storage self) internal view returns (uint256, bool) {
        return (self.annualInterestRate, self.isNegativeInterestRate);
    }

    /**
     * @notice Returns the current interest index.
     * @param self The InterestData struct.
     * @return The interest index.
     */
    function getIndex(InterestData storage self) internal view returns (uint256) {
        return self.index;
    }
}
