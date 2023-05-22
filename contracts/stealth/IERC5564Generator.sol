/// @notice Interface for generating stealth addresses for keys from a given stealth address scheme.
/// @dev The Generator contract MUST have a method called `stealthKeys` that returns the recipient's
/// public keys as the correct types. The return types will vary for each generator, so a sample
/// is shown below.
interface IERC5564Generator {
    /// @notice Given a `registrant`, returns all relevant data to compute a stealth address.
    /// @dev MUST return all zeroes if the registrant has not registered keys for this generator.
    /// @dev The returned `viewTag` MUST be the hash of the `sharedSecret`. THe hashing function used
    /// is specified by the generator.
    /// @dev `ephemeralPubKey` represents the ephemeral public key used by the sender.
    /// @dev Intended to be used off-chain only to prevent exposing secrets on-chain.
    /// @dev Consider running this against a local node, or using an off-chain library with the same
    /// logic, instead of via an `eth_call` to a public RPC provider to avoid leaking secrets.
    function generateStealthAddress(
        address registrant,
        bytes memory ephemeralPrivKey
    ) external view returns (address stealthAddress, bytes memory ephemeralPubKey, bytes memory sharedSecret, bytes32 viewTag);

    /// @notice Returns the stealth public keys for the given `registrant`, in the types that best
    /// represent the curve.
    /// @dev The below is an example for the secp256k1 curve.
    function stealthKeys(
        address registrant
    ) external view returns (uint256 spendingPubKeyX, uint256 spendingPubKeyY, uint256 viewingPubKeyX, uint256 viewingPubKeyY);
}
