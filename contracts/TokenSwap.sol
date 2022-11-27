//SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./CBToken.sol";
import "./CBSToken.sol";

contract TokenSwap is AccessControl {
    bytes32 public constant SWAP_CB_TO_CBS_ROLE =
        keccak256("SWAP_CB_TO_CBS_ROLE");
    bytes32 public constant SWAP_CBS_TO_CB_ROLE =
        keccak256("SWAP_CBS_TO_CB_ROLE");
    CBToken public cbToken;
    CBSToken public cbsToken;

    constructor(address _cbToken, address _cbsToken) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(SWAP_CB_TO_CBS_ROLE, msg.sender);
        _setupRole(SWAP_CBS_TO_CB_ROLE, msg.sender);
        _setRoleAdmin(SWAP_CB_TO_CBS_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(SWAP_CBS_TO_CB_ROLE, DEFAULT_ADMIN_ROLE);
        cbToken = CBToken(_cbToken);
        cbsToken = CBSToken(_cbsToken);
    }

    function swapCbToCbs(
        bytes32 partition,
        uint256 value,
        bytes calldata data
    ) public onlyRole(SWAP_CB_TO_CBS_ROLE) returns (uint256) {
        require(
            value > 0,
            string.concat(
                "Amount of ",
                cbToken.symbol(),
                " must be greater than zero"
            )
        );
        require(
            cbToken.balanceOf(msg.sender) >= value,
            string.concat("Sender does not have enough ", cbToken.symbol())
        );
        require(
            cbsToken.isMinter(address(this)),
            string.concat(
                "TokenSwap contract at ",
                Strings.toHexString(uint160(address(this)), 20),
                " is not a minter of ",
                cbsToken.symbol()
            )
        );
        require(
            cbToken.transferFrom(msg.sender, address(this), value),
            string.concat("Transfer of ", cbToken.symbol(), " failed")
        );
        cbsToken.issueByPartition(partition, msg.sender, value, data);
        return value;
    }

    function swapCbsToCb(
        bytes32 partition,
        uint256 value,
        bytes calldata operatorData
    ) public onlyRole(SWAP_CBS_TO_CB_ROLE) returns (uint256) {
        require(
            value > 0,
            string.concat(
                "Amount of ",
                cbsToken.symbol(),
                " must be greater than zero"
            )
        );
        require(
            cbsToken.isOperatorForPartition(
                partition,
                address(this),
                msg.sender
            ),
            string.concat(
                "TokenSwap contract at ",
                Strings.toHexString(uint160(address(this)), 20),
                " is not operator of partition ",
                Strings.toHexString(uint256(partition)),
                " of ",
                cbsToken.symbol()
            )
        );
        require(
            cbToken.balanceOf(address(this)) >= value,
            string.concat(
                "TokenSwap contract at ",
                Strings.toHexString(uint160(address(this)), 20),
                " does not have enough ",
                cbToken.symbol()
            )
        );
        cbsToken.operatorRedeemByPartition(
            partition,
            msg.sender,
            value,
            operatorData
        );
        require(
            cbToken.transfer(msg.sender, value),
            string.concat("Transfer of ", cbToken.symbol(), " failed")
        );
        return value;
    }
}
