pragma solidity ^0.4.25; // solhint-disable-line compiler-version
pragma experimental ABIEncoderV2;

import "@banteg/disperse-research/contracts/Disperse.sol";

interface IERC1400 {
    function transferWithData(address to, uint256 value, bytes data) external;

    function transferFromWithData(address from, address to, uint256 value, bytes data) external;
}

interface IERC1820Registry {
    function setInterfaceImplementer(address account, bytes32 _interfaceHash, address implementer) external;

    function getInterfaceImplementer(address account, bytes32 _interfaceHash) external view returns (address);
}

contract ERC1820Client {
    IERC1820Registry private constant ERC1820REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    function interfaceAddr(address addr, string memory _interfaceLabel) internal view returns (address) {
        bytes32 interfaceHash = keccak256(abi.encodePacked(_interfaceLabel));
        return ERC1820REGISTRY.getInterfaceImplementer(addr, interfaceHash);
    }
}

contract DisperseWithData is Disperse, ERC1820Client {
    bytes[] public data;

    function getDataLength() external view returns (uint256) {
        return data.length;
    }

    function disperseEtherWithData(address[] recipients, uint256[] values, bytes _data) external payable {
        for (uint256 i = 0; i < recipients.length; i++) recipients[i].transfer(values[i]);

        uint256 balance = address(this).balance;
        if (balance > 0) msg.sender.transfer(balance);

        data.push(_data);
    }

    function disperseTokenWithData(IERC20 token, address[] recipients, uint256[] values, bytes _data) external {
        uint256 total = 0;
        uint256 i = 0;

        for (i = 0; i < recipients.length; i++) total += values[i];

        require(token.transferFrom(msg.sender, address(this), total)); // solhint-disable-line reason-string

        if (interfaceAddr(address(token), "ERC1400Token") == address(0))
            for (i = 0; i < recipients.length; i++)
                // solhint-disable-next-line reason-string
                require(token.transfer(recipients[i], values[i]));
        else for (i = 0; i < recipients.length; i++) IERC1400(address(token)).transferWithData(recipients[i], values[i], _data);

        data.push(_data);
    }

    function disperseTokenWithDataSimple(IERC20 token, address[] recipients, uint256[] values, bytes _data) external {
        uint256 i;

        if (interfaceAddr(address(token), "ERC1400Token") == address(0))
            for (i = 0; i < recipients.length; i++)
                // solhint-disable-next-line reason-string
                require(token.transferFrom(msg.sender, recipients[i], values[i]));
        else for (i = 0; i < recipients.length; i++) IERC1400(address(token)).transferFromWithData(msg.sender, recipients[i], values[i], _data);

        data.push(_data);
    }
}
