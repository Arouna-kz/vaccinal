// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "./VaccinRegistry.sol";  
import "./VaccineStock.sol"; 

/**
 =* @title VaccineDAO
* @dev (Formerly GovMpoxDAO) Governance contract (DAO) for the entire ecosystem.
* Manages proposals, votes, and their execution on all related contracts.
*/
contract VaccineDAO is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    VaccinRegistry private registry;
    VaccineStock private stock;


        /**
     * @dev Constructor initializes the governance parameters.
     * - Name: "VaccineDAO"
     * - Voting delay: 7 days (302,400 blocks assuming ~12s per block)
     * - Voting period: 7 days
     * - Proposal threshold: 0 (any token holder can propose)
     * - Quorum fraction: 4% of total token supply
     * @param _token The governance token implementing IVotes.
     */
    constructor(IVotes _token)
        Governor("VaccineDAO")
        GovernorSettings(
            302400,  /* 7 exact days (43,200 blocks/day × 7) */
            302400,  /* 7-day voting deadline */
            0
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)
    {}

    /**
     * @notice Returns the voting delay between proposal submission and voting start.
     * @return The voting delay in blocks.
     */
    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    /**
     * @notice Returns the voting period during which votes can be cast.
     * @return The voting period in blocks.
     */
    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }
    
    /**
     * @notice Returns the minimum number of tokens required to submit a proposal.
     * @return The proposal threshold.
     */
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    /**
     * @notice Returns the quorum (minimum number of votes required) for a given block.
     * @param blockNumber The block number to check quorum for.
     * @return The quorum value in number of votes.
     */
    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /**
     * @notice Creates a new governance proposal.
     * @param targets The list of contract addresses to call.
     * @param values The ETH values to send with each call.
     * @param calldatas The encoded function call data.
     * @param description A human-readable description of the proposal.
     * @return The ID of the newly created proposal.
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    /**
     * @notice Sets the VaccinRegistry contract address.
     * @param _registry The address of the VaccinRegistry contract.
     */
    function setRegistry(address _registry) external  {
        registry = VaccinRegistry(_registry);
    }

    /**
     * @notice Sets the VaccineStock contract address.
     * @param _stock The address of the VaccineStock contract.
     */
    function setStock(address _stock) external  {
        stock = VaccineStock(_stock);
    }

}