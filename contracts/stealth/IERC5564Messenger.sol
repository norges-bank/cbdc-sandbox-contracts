/// @notice Interface for announcing that something was sent to a stealth address.
interface IERC5564Messenger {
    /// @dev Emitted when sending something to a stealth address.
    /// @dev See `announce` for documentation on the parameters.
    event Announcement(bytes ephemeralPubKey, bytes32 indexed stealthRecipientAndViewTag, bytes32 metadata);

    /// @dev Called by integrators to emit an `Announcement` event.
    /// @dev `ephemeralPubKey` represents the ephemeral public key used by the sender.
    /// @dev `stealthRecipientAndViewTag` contains the stealth address (20 bytes) and the view tag (12
    /// bytes).
    /// @dev `metadata` is an arbitrary field that the sender can use however they like, but the below
    /// guidelines are recommended:
    ///   - When sending ERC-20 tokens, the metadata SHOULD include the token address as the first 20
    ///     bytes, and the amount being sent as the following 32 bytes.
    ///   - When sending ERC-721 tokens, the metadata SHOULD include the token address as the first 20
    ///     bytes, and the token ID being sent as the following 32 bytes.
    function announce(bytes memory ephemeralPubKey, bytes32 stealthRecipientAndViewTag, bytes32 metadata) external;
}
