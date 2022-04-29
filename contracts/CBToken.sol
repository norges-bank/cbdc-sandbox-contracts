// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

contract CBToken is ERC20, AccessControl {
    address public owner;
    uint8 private _decimals;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(string memory name_, string memory symbol_, uint8 decimals_)
        ERC20(name_, symbol_)
    {
        console.log("Deploying a token with the name '%s', symbol '%s' and '%s' decimals.", name_, symbol_, decimals_);
        owner = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _decimals = decimals_;
        _mint(msg.sender, 1_000_000 * (10**decimals()));
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
   
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address to, uint256 amount) external onlyOwner {
        _burn(to, amount);
    }
}
