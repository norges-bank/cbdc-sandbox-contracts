// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./ERC1400.sol";

contract CBSToken is ERC1400 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 granularity,
        address[] memory controllers,
        bytes32[] memory defaultPartitions,
        uint256 chainID
    ) public ERC1400(name, symbol, granularity, controllers, defaultPartitions, chainID) {} // solhint-disable-line no-empty-blocks
}
