// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IPolicy.sol";
import "../CBAccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
// console log
import "hardhat/console.sol";

contract AuthenticatedPolicy is IPolicy, CBAccessControl {
    // The maximum time interval that a person's authentication should be considered valid
    uint256 internal authTTL;

    struct Authentication {
        address bank;
        uint256 timestamp;
    }

    mapping(address wallet => Authentication) internal authenticationOf;
    mapping(address contractAddress => address owner) internal ownerOfContract; // Contracts with an owner are authenticated for transactions
    mapping(address wallet => string bankName) internal bankNameOf;

    event PersonAuthenticatedContract(address indexed contractAddress, address indexed owner);
    event ContractRevoked(address indexed contractAddress, address indexed owner);

    constructor() {
        authTTL = 52 weeks;
    }

    // If both sender and recipient are authenticated, the transaction is allowed, enforced with "return"
    // If the sender or recipient is not authenticated, a regular transaction is not allowed.
    // Try to do an anonymous transaction instead enforced with "_nextPolicy"
    function check(address from, address to, uint256 amount) external override returns (address from_, address to_, uint256 amount_) {
        // If the transfer is valid, return to avoid further checks for anonymous transactions
        if (_validSender(from) && _validRecipient(to)) return (from, to, amount);
        // If not valid, and no next policy, revert
        require(nextPolicyAddress != NO_NEXT_POLICY_ADDRESS, "AuthenticatedPolicy: Sender and/or recipient not authenticated");
        return IPolicy._nextPolicy(from, to, amount);
    }

    function setTTL(uint256 _ttl) external onlyRole(DEFAULT_ADMIN_ROLE) {
        authTTL = _ttl;
    }

    function setAuthenticatedPerson(address _address) external onlyRole(BANK_ROLE) {
        // If the person is already authenticated, update the timestamp. Only the same bank as previous authentication can do this.
        if (authenticationOf[_address].bank != address(0)) {
            require(authenticationOf[_address].bank == msg.sender, "A new bank can not authenticate a wallet owned by another bank");
        }

        authenticationOf[_address] = Authentication(msg.sender, block.timestamp);
    }

    function revokeAuthenticationPerson(address _address) external {
        require(authenticationOf[_address].bank == msg.sender, "Only the bank that authenticated the address can revoke it");
        delete authenticationOf[_address].timestamp;
    }

    function setAuthenticatedContract(address _address) external {
        require(authenticationOf[msg.sender].timestamp > 0, "Msg.sender needs to be authenticated");
        require(ownerOfContract[_address] == address(0), "Contract already authenticated");

        ownerOfContract[_address] = msg.sender;
        emit PersonAuthenticatedContract(_address, msg.sender);
    }

    function revokeAuthenticationContract(address _address) external {
        address owner = ownerOfContract[_address];
        address ownerBank = authenticationOf[owner].bank;
        require(owner == msg.sender || ownerBank == msg.sender, "Only the owner of the contract or it's bank can revoke authentication");

        emit ContractRevoked(_address, ownerOfContract[_address]);
        delete ownerOfContract[_address];
    }

    function authenticateBank(address _bankAddress, string calldata _bankName) external {
        bankNameOf[_bankAddress] = _bankName;
        grantRole(BANK_ROLE, _bankAddress);
    }

    function changeBankName(address _bankAddress, string calldata _bankName) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bankNameOf[_bankAddress] = _bankName;
    }

    function revokeBank(address bank) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(BANK_ROLE, bank);
    }

    function getBankOf(address _address) external view returns (address) {
        return authenticationOf[_address].bank;
    }

    function getBankName(address _bankAddress) external view returns (string memory) {
        return bankNameOf[_bankAddress];
    }

    // This function checks if the address is authenticated or not.
    // It checks if the address is the bank address, if the transaction is a burn address,
    // or if the address has authenticated previously.
    function checkAuthenticatedOnce(address _address) public view returns (bool) {
        bool isBank = hasRole(BANK_ROLE, _address) || hasRole(DEFAULT_ADMIN_ROLE, _address);
        bool contractHasOwner = ownerOfContract[_address] != address(0);
        bool personHasAuthTime = authenticationOf[_address].timestamp != 0;
        bool isBurn = _address == address(0);
        return contractHasOwner || personHasAuthTime || isBank || isBurn;
    }

    function checkAuthenticated(address _address) public view returns (bool) {
        return (hasRole(DEFAULT_ADMIN_ROLE, _address) ||
            hasRole(BANK_ROLE, _address) ||
            _isContractAuthenticated(_address) ||
            _isPersonAuthenticated(_address));
    }

    function _isContractAuthenticated(address _address) internal view returns (bool) {
        address owner = ownerOfContract[_address];
        return owner != address(0) && authenticationOf[owner].timestamp > 0;
    }

    function _isPersonAuthenticated(address _address) internal view returns (bool) {
        uint256 authTime = authenticationOf[_address].timestamp;
        uint256 cutoffTime = authTime + authTTL;
        bool isBetweenZeroAndCutoffTime = authTime > 0 && block.timestamp < cutoffTime;
        return isBetweenZeroAndCutoffTime;
    }

    function _validSender(address from) internal view returns (bool) {
        return from == address(0) || checkAuthenticated(from);
    }

    function _validRecipient(address to) internal view returns (bool) {
        return checkAuthenticatedOnce(to);
    }
}
