// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./EllipticCurve.sol";

contract TestEC {
    uint256 public constant GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 public constant GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    uint256 public constant AA = 0;
    uint256 public constant BB = 7;
    uint256 public constant PP = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;

    function getPubKey(bytes memory privKey) public pure returns (uint256 pubDataX, uint256 pubDataY) {
        (pubDataX, pubDataY) = EllipticCurve.ecMul(toUint(privKey), GX, GY, AA, PP);
    }

    function toUint(bytes memory b) private pure returns (uint256) {
        return uint256(bytes32(b));
    }

    function toBytes(uint256 i) private pure returns (bytes32) {
        return bytes32(i);
    }

    function xyToBytes(uint256 x, uint256 y) private pure returns (bytes memory) {
        bytes memory b = new bytes(64);
        assembly {
            mstore(add(b, 0x20), x)
            mstore(add(b, 0x40), y)
        }
        return b;
    }

    function bytesToXY(bytes memory pubkey) public pure returns (uint256 pubDataX, uint256 pubDataY) {
        assembly {
            pubDataX := mload(add(pubkey, 0x20))
            pubDataY := mload(add(pubkey, 0x40))
        }
    }
}
