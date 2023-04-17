// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { WadRayMath } from "./WadRayMath.sol";
import "./ERC20/ERC20.sol";
import "./InterestBearing.sol";
import "./PolicyRunner.sol";

contract CBToken is ERC20, InterestBearing, PolicyRunner {
    using WadRayMath for uint256;

    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint16 currentYear_
    ) ERC20(name_, symbol_) InterestBearing(1e27, block.timestamp, currentYear_, 0.5e27, false, this) {
        _decimals = decimals_;
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        return _burnScaled(from, amount);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) returns (bool) {
        return _mintScaled(to, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function balanceOf(address user) public view virtual override returns (uint256) {
        return ERC20.balanceOf(user).rayMul(getIndex()).rayDiv(1e27);
    }

    /// @inheritdoc IERC20
    function totalSupply() public view virtual override returns (uint256) {
        uint256 currentSupplyScaled = ERC20.totalSupply();

        if (currentSupplyScaled == 0) return 0;

        return currentSupplyScaled.rayMul(getIndex()).rayDiv(1e27);
    }

    // ERC20.transfer --> _transfer (this) --> ERC20._transfer --> _beforeTokenTransfer --> PolicyRunner._check
    function _transfer(address from, address to, uint256 amount) internal override {
        uint256 amountScaled = _preTransfer(from, to, amount);
        ERC20._transfer(from, to, amountScaled);
        InterestBearing._interestGainCalulation(from, to, amount);
    }

    function _preTransfer(address from, address to, uint256 amount) internal returns (uint256) {
        InterestBearing._EOYcalculation(from, to);
        InterestBearing.recalculateIndex();

        return amount.rayDiv(getIndex().rayMul(1e27));
    }

    /**
     * @notice Implements the basic logic to mint a scaled balance token.
     * @param amount The amount of tokens getting minted
     * @return `true` if the the previous balance of the user was 0
     **/
    function _mintScaled(address to, uint256 amount) internal returns (bool) {
        InterestBearing._EOYcalculationTo(to, balanceOf(to));
        InterestBearing.recalculateIndex();

        uint256 previousBalance = ERC20.balanceOf(to);
        uint256 amountScaled = amount.rayDiv(getIndex().rayMul(1e27));
        require(amountScaled != 0, "Mint amount (scaled) cannot be 0.");

        ERC20._mint(to, amountScaled);
        InterestBearing._interestGainCalulationTo(to, amount);

        return previousBalance == 0;
    }

    function _burnScaled(address from, uint256 amount) internal onlyRole(BURNER_ROLE) {
        _EOYcalculationFrom(from, balanceOf(from));
        InterestBearing.recalculateIndex();

        uint256 amountScaled = amount.rayDiv(getIndex().rayMul(1e27));
        require(amountScaled != 0, "Burn amount (scaled) cannot be 0.");
        ERC20._burn(from, amountScaled);
        InterestBearing._interestGainCalulationFrom(from, amount);
    }

    function unscaled(uint256 amount) public view returns (uint256) {
        return amount.rayMul(getIndex()).rayDiv(1e27);
    }

    function scale(uint256 amount) public view returns (uint256) {
        return amount.rayDiv(getIndex().rayMul(1e27));
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override returns (address from_, address to_, uint256 amount_) {
        ERC20._beforeTokenTransfer(from, to, amount);
        (from, to, amount) = PolicyRunner._check(from, to, unscaled(amount));

        return (from, to, scale(amount));
    }
}
