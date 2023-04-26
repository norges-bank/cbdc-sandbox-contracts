pragma solidity >=0.7.0 <0.9.0;

import "./IERC5564Generator.sol";
import "./IERC5564Registry.sol";
import "./EllipticCurve.sol";
import "hardhat/console.sol";

/// @notice Sample IERC5564Generator implementation for the secp256k1 curve.
contract Secp256k1Generator {
    IERC5564Registry public REGISTRY;

    uint256 public constant GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 public constant GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    uint256 public constant AA = 0;
    uint256 public constant BB = 7;
    uint256 public constant PP = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;

    constructor(address registry) {
        REGISTRY = IERC5564Registry(registry);
    }

    /// @notice Sample implementation for parsing stealth keys on the secp256k1 curve.
    function stealthKeys(
        address registrant
    ) public view returns (uint256 spendingPubKeyX, uint256 spendingPubKeyY, uint256 viewingPubKeyX, uint256 viewingPubKeyY) {
        // Fetch the raw spending and viewing keys from the registry.
        (bytes memory spendingPubKey, bytes memory viewingPubKey) = REGISTRY.stealthKeys(registrant, address(this));

        // Parse the keys.
        assembly {
            spendingPubKeyX := mload(add(spendingPubKey, 0x20))
            spendingPubKeyY := mload(add(spendingPubKey, 0x40))
            viewingPubKeyX := mload(add(viewingPubKey, 0x20))
            viewingPubKeyY := mload(add(viewingPubKey, 0x40))
        }
    }

    function generateStealthAddress(
        address registrant,
        bytes memory ephemeralPrivKey
    ) external view returns (address stealthAddress, bytes memory ephemeralPubKey, bytes32 sharedSecret, bytes32 viewTag) {
        // Get the ephemeral public key points from the private key.
        (uint256 ephemeralPubX, uint256 ephemeralPubY) = EllipticCurve.ecMul(uint256(bytes32(ephemeralPrivKey)), GX, GY, AA, PP);
        // Format the ephemeral public keys points into a single bytes array. From Solidity it will return as hex (0x) without compression prefix which should be 04.
        ephemeralPubKey = abi.encodePacked(ephemeralPubX, ephemeralPubY);

        // Get the spending and viewing keys for the receiver from the registry.
        // TODO - Use viewkeys
        (uint256 spendingPubKeyX, uint256 spendingPubKeyY /* uint256 viewingPubKeyX */ /* uint256 viewingPubKeyY */, , ) = stealthKeys(registrant);
        // Generate shared secret from sender's private key and recipient's viewing key.
        (uint256 sharedSecretX, uint256 sharedSecretY) = EllipticCurve.ecMul(uint(bytes32(ephemeralPrivKey)), spendingPubKeyX, spendingPubKeyY, AA, PP);
        // Hash the shared secret
        sharedSecret = keccak256(abi.encodePacked(sharedSecretX, sharedSecretY));

        // Generate view tag for enabling faster parsing for the recipient
        // TODO - Use viewTags sharedSecret[:12]
        viewTag = bytes32(0);

        // Generate a point from the hash of the shared secret
        (uint256 sharedSecretPointX, uint256 sharedSecretPointY) = EllipticCurve.ecMul(uint256(sharedSecret), GX, GY, AA, PP);

        // Generate sender's public key from their ephemeral private key.
        (uint256 stealthPubKeyX, uint256 stealthPubKeyY) = EllipticCurve.ecAdd(
            spendingPubKeyX,
            spendingPubKeyY,
            sharedSecretPointX,
            sharedSecretPointY,
            AA,
            PP
        );
        // Compute stealth address from the stealth public key.
        stealthAddress = pubkeyToAddress(stealthPubKeyX, stealthPubKeyY);
    }

    function pubkeyToAddress(uint256 pubKeyX, uint256 pubKeyY) public pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(pubKeyX, pubKeyY)))));
    }
}
