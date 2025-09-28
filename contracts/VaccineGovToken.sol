// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
* @title VaccineGovToken
* @dev (Formerly GovMpoxToken) Universal ERC20 governance token for the ecosystem.
 */
contract VaccineGovToken is ERC20, ERC20Votes, Ownable {
    constructor(address initialOwner)
        ERC20("Gouvernance Vaccinale", "VGOV") 
        Ownable(initialOwner)
        EIP712("Gouvernance Vaccinale", "1")
    {}

    // Function for minting new tokens, reserved for the owner (the DAO).
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // The _update function is required by ERC20Votes.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }
}
