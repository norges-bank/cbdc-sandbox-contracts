// SPDX-License-Identifier: ISC

pragma solidity ^0.8.0;

/**
 * @notice ERC-1271: Standard Signature Validation Method for Contracts
 */
abstract contract ERC1271 {
    // bytes4(keccak256("isValidSignature(bytes32,bytes)")
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    /**
     * @dev Should return whether the signature provided is valid for the provided data
     * @param _hash Arbitrary length data signed on the behalf of address(this)
     * @param _signature Signature byte array associated with _hash
     *
     * MUST return the bytes4 magic value 0x1626ba7e when function passes.
     * MUST NOT modify state (using STATICCALL for solc < 0.5, view modifier for solc > 0.5)
     * MUST allow external calls
     */

    function isValidSignature(bytes32 _hash, bytes memory _signature) public view virtual returns (bytes4 magicValue);
}
