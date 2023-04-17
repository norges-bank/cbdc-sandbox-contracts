pragma solidity >=0.7.0 <0.9.0;

import "./IERC5564Registry.sol";

contract ERC5564Registry is IERC5564Registry {
    struct Keys {
        bytes spendingPubKey;
        bytes viewingPubKey;
    }

    mapping(address => mapping(address => Keys)) private _addressToGeneratorKeys;

    /// @notice Returns the stealth public keys for the given `registrant` to compute a stealth
    /// address accessible only to that `registrant` using the provided `generator` contract.
    /// @dev MUST return zero if a registrant has not registered keys for the given generator.
    function stealthKeys(address registrant, address generator) external view returns (bytes memory spendingPubKey, bytes memory viewingPubKey) {
        return (_addressToGeneratorKeys[registrant][generator].spendingPubKey, _addressToGeneratorKeys[registrant][generator].viewingPubKey);
    }

    /// @notice Sets the caller's stealth public keys for the `generator` contract.
    function registerKeys(address generator, bytes memory spendingPubKey, bytes memory viewingPubKey) external {
        _addressToGeneratorKeys[msg.sender][generator] = Keys(spendingPubKey, viewingPubKey);
        emit StealthKeyChanged(msg.sender, generator, spendingPubKey, viewingPubKey);
    }

    /// @notice Sets the `registrant`s stealth public keys for the `generator` contract using their
    /// `signature`.
    /// @dev MUST support both EOA signatures and EIP-1271 signatures.
    function registerKeysOnBehalf(
        address registrant,
        address generator,
        bytes memory signature,
        bytes memory spendingPubKey,
        bytes memory viewingPubKey
    ) external pure {
        // TODO
        require(false, "not implemented");
    }
}
