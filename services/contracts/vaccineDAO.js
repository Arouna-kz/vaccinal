import { ethers } from 'ethers';
import { getContract } from '../blockchain';
import VaccineDAOABI from '../../abi/VaccineDAO.json';

/**
 * @fileoverview VaccineDAO contract interactions
 * @description Service for managing DAO governance operations
 */


/**
 * Get VaccineDAO contract instance
 * @param {ethers.Signer} signer 
 * @returns {ethers.Contract}
 */
export function getVaccineDAOContract(signer) {
  const address = process.env.NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS;
  return getContract(address, VaccineDAOABI, signer);
}

/**
 * Set registry contract address (DAO governance only)
 * @param {ethers.Contract} contract 
 * @param {string} registryAddress 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function setRegistry(contract, registryAddress) {
  try {
    const tx = await contract.setRegistry(registryAddress);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error setting registry contract:', error);
    throw error;
  }
}

/**
 * Set stock contract address (DAO governance only)
 * @param {ethers.Contract} contract 
 * @param {string} stockAddress 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function setStock(contract, stockAddress) {
  try {
    const tx = await contract.setStock(stockAddress);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error setting stock contract:', error);
    throw error;
  }
}

/**
 * Get proposal count
 * @param {ethers.Contract} contract 
 * @returns {Promise<number>}
 */
export async function getProposalCount(contract) {
  try {
    const count = await contract.proposalCount();
    return count.toNumber();
  } catch (error) {
    console.error('Error getting proposal count:', error);
    return 0;
  }
}

/**
 * Get proposal details by ID
 * @param {ethers.Contract} contract 
 * @param {string} proposalId 
 * @returns {Promise<Object>}
 */
export async function getProposalById(contract, proposalId) {
  try {
    const proposal = await contract.proposals(proposalId);
    return {
      id: proposalId,
      proposer: proposal.proposer,
      targets: proposal.targets,
      values: proposal.values.map(v => ethers.utils.formatEther(v)),
      calldatas: proposal.calldatas,
      description: proposal.description,
      voteStart: proposal.voteStart.toNumber(),
      voteEnd: proposal.voteEnd.toNumber(),
      executed: proposal.executed,
      canceled: proposal.canceled
    };
  } catch (error) {
    console.error(`Error getting proposal ${proposalId}:`, error);
    throw error;
  }
}

/**
 * Get all proposals from blockchain
 * @param {ethers.Contract} contract 
 * @returns {Promise<Array>}
 */
export async function getAllProposals(contract) {
  try {
    const count = await getProposalCount(contract);
    const proposals = [];

    for (let i = 1; i <= count; i++) {
      try {
        const proposal = await getProposalById(contract, i.toString());
        const state = await getProposalState(contract, i.toString());
        const votes = await getProposalVotes(contract, i.toString());
        
        proposals.push({
          ...proposal,
          state,
          ...votes,
          totalVotes: (
            parseFloat(votes.forVotes) + 
            parseFloat(votes.againstVotes) + 
            parseFloat(votes.abstainVotes)
          ).toString()
        });
      } catch (error) {
        console.warn(`Could not fetch proposal ${i}:`, error);
        continue;
      }
    }

    return proposals.sort((a, b) => b.voteStart - a.voteStart);
  } catch (error) {
    console.error('Error getting all proposals:', error);
    return [];
  }
}

/**
 * Create a new proposal with enhanced error handling
 * @param {ethers.Contract} contract 
 * @param {string[]} targets - Array of target contract addresses
 * @param {string[]} values - Array of ETH values to send
 * @param {string[]} calldatas - Array of encoded function calls
 * @param {string} description - Proposal description
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function createProposal(contract, targets, values, calldatas, description) {
  try {
    // Validate inputs
    if (!targets || targets.length === 0) {
      throw new Error('Au moins une adresse cible est requise');
    }

    if (targets.length !== values.length || targets.length !== calldatas.length) {
      throw new Error('Les tableaux targets, values et calldatas doivent avoir la même longueur');
    }

    // Convert values to wei and validate
    const valuesInWei = values.map(v => {
      try {
        return ethers.utils.parseEther(v || '0');
      } catch (error) {
        throw new Error(`Valeur invalide: ${v}`);
      }
    });

    // Validate addresses
    targets.forEach(target => {
      if (!ethers.utils.isAddress(target)) {
        throw new Error(`Adresse cible invalide: ${target}`);
      }
    });

    console.log('Creating proposal with params:', {
      targets,
      values: valuesInWei,
      calldatas,
      descriptionLength: description.length
    });

    // Vérification du pouvoir de vote - APPROCHE SIMPLIFIÉE
    try {
      const proposalThreshold = await contract.proposalThreshold();
      const userAddress = await contract.signer.getAddress();
      
      // APPROCHE 1: Essayer sans numéro de bloc (certains contrats utilisent le bloc actuel)
      let votingPower;
      try {
        // Essayer d'abord sans paramètre de bloc
        votingPower = await contract.getVotes(userAddress);
        console.log('Voting power check (without block number):', {
          votingPower: ethers.utils.formatEther(votingPower),
          threshold: ethers.utils.formatEther(proposalThreshold)
        });
      } catch (noBlockError) {
        // APPROCHE 2: Essayer avec un ancien bloc (1 bloc avant)
        const blockNumber = await contract.provider.getBlockNumber();
        const pastBlock = blockNumber - 10; // Utiliser un bloc plus ancien pour être sûr
        
        votingPower = await contract.getVotes(userAddress, pastBlock);
        console.log('Voting power check (with past block):', {
          blockNumber,
          pastBlock,
          votingPower: ethers.utils.formatEther(votingPower),
          threshold: ethers.utils.formatEther(proposalThreshold)
        });
      }

      if (votingPower.lt(proposalThreshold)) {
        throw new Error(`Voting power insuffisant. Nécessaire: ${ethers.utils.formatEther(proposalThreshold)}, Actuel: ${ethers.utils.formatEther(votingPower)}`);
      }

      console.log('✅ Voting power sufficient for proposal creation');

    } catch (votingError) {
      console.error('Voting power check failed:', votingError);
      
      // Si l'échec est dû à un problème technique, continuer quand même
      // mais afficher un avertissement
      if (votingError.message.includes('call revert exception') || 
          votingError.message.includes('CALL_EXCEPTION')) {
        console.warn('⚠️ Voting power check technical failure, proceeding anyway...');
      } else {
        throw votingError;
      }
    }

    // Vérification statique avant envoi
    try {
      await contract.callStatic.propose(
        targets,
        valuesInWei,
        calldatas,
        description
      );
      console.log('✅ Static call successful');
    } catch (staticError) {
      console.error('❌ Static call failed:', staticError);
      throw new Error(`La proposition échouerait: ${staticError.reason || staticError.message}`);
    }

    // Estimation du gas
    let gasEstimate;
    try {
      gasEstimate = await contract.estimateGas.propose(
        targets,
        valuesInWei,
        calldatas,
        description
      );
      console.log('✅ Gas estimate successful:', gasEstimate.toString());
    } catch (estimateError) {
      console.error('❌ Gas estimation failed:', estimateError);
      
      // Utiliser une limite de gas plus élevée en fallback
      gasEstimate = ethers.BigNumber.from(1000000); // 1M gas
      console.warn('⚠️ Using fallback gas limit:', gasEstimate.toString());
    }

    // Envoi de la transaction
    const gasLimit = gasEstimate.mul(150).div(100); // 50% buffer

    console.log('🚀 Sending proposal transaction...');
    const tx = await contract.propose(
      targets,
      valuesInWei,
      calldatas,
      description,
      { 
        gasLimit: gasLimit,
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'),
        maxFeePerGas: ethers.utils.parseUnits('30', 'gwei')
      }
    );
    
    console.log('📤 Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Proposal created successfully:', receipt.transactionHash);
    
    return receipt;
  } catch (error) {
    console.error('❌ Error creating proposal:', error);
    
    // Gestion d'erreur améliorée
    let errorMessage = error.message;
    
    if (error.reason) {
      errorMessage = error.reason;
    }
    
    // Décodage des erreurs de revert
    if (error.data) {
      console.error('Raw revert data:', error.data);
      
      try {
        // Essayer de décoder comme un message d'erreur standard
        if (error.data.length >= 10) {
          const revertData = error.data.slice(10); // Enlever le selector
          
          // Essayer de décoder comme un string
          try {
            const revertReason = ethers.utils.defaultAbiCoder.decode(['string'], '0x' + revertData);
            if (revertReason[0]) {
              errorMessage = `Transaction reverted: ${revertReason[0]}`;
            }
          } catch (stringError) {
            // Si ce n'est pas un string, essayer de voir si c'est un custom error
            console.log('Not a string error, might be custom error');
          }
        }
      } catch (decodeError) {
        console.warn('Could not decode revert reason:', decodeError);
      }
    }
    
    // Messages d'erreur plus conviviaux
    if (errorMessage.includes('Governor: proposer votes below proposal threshold')) {
      errorMessage = 'Votre pouvoir de vote est insuffisant pour créer une proposition';
    } else if (errorMessage.includes('Governor: identical proposal action already active')) {
      errorMessage = 'Une proposition identique est déjà en cours';
    } else if (errorMessage.includes('execution reverted')) {
      errorMessage = 'La transaction a été rejetée par le contrat';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Vote on a proposal
 * @param {ethers.Contract} contract 
 * @param {string} proposalId 
 * @param {number} support - 0 = Against, 1 = For, 2 = Abstain
 * @param {string} reason - Optional reason for vote
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function castVote(contract, proposalId, support, reason = '') {
  try {
    let tx;
    if (reason) {
      tx = await contract.castVoteWithReason(proposalId, support, reason);
    } else {
      tx = await contract.castVote(proposalId, support);
    }
    
    console.log('Vote transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Vote recorded successfully');
    
    return receipt;
  } catch (error) {
    console.error('Error casting vote:', error);
    
    let errorMessage = error.message;
    if (error.reason) {
      errorMessage = error.reason;
    }
    
    if (errorMessage.includes('Governor: vote not currently active')) {
      errorMessage = 'Le vote n\'est pas actif pour cette proposition';
    } else if (errorMessage.includes('Governor: already voted')) {
      errorMessage = 'Vous avez déjà voté pour cette proposition';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Execute a proposal
 * @param {ethers.Contract} contract 
 * @param {string} proposalId 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function executeProposal(contract, proposalId) {
  try {
    // Get proposal details first
    const proposal = await getProposalById(contract, proposalId);
    
    const tx = await contract.execute(
      proposal.targets,
      proposal.values.map(v => ethers.utils.parseEther(v)),
      proposal.calldatas,
      ethers.utils.id(proposal.description)
    );
    
    console.log('Execute transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Proposal executed successfully');
    
    return receipt;
  } catch (error) {
    console.error('Error executing proposal:', error);
    
    let errorMessage = error.message;
    if (error.reason) {
      errorMessage = error.reason;
    }
    
    if (errorMessage.includes('Governor: proposal not successful')) {
      errorMessage = 'La proposition n\'a pas été approuvée';
    } else if (errorMessage.includes('Governor: proposal not queued')) {
      errorMessage = 'La proposition n\'est pas en attente d\'exécution';
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Get proposal state
 * @param {ethers.Contract} contract 
 * @param {string} proposalId 
 * @returns {Promise<number>}
 */
export async function getProposalState(contract, proposalId) {
  try {
    return await contract.state(proposalId);
  } catch (error) {
    console.error('Error getting proposal state:', error);
    return 2; // Canceled
  }
}

/**
 * Get proposal votes
 * @param {ethers.Contract} contract 
 * @param {string} proposalId 
 * @returns {Promise<{againstVotes: string, forVotes: string, abstainVotes: string}>}
 */
export async function getProposalVotes(contract, proposalId) {
  try {
    const votes = await contract.proposalVotes(proposalId);
    return {
      againstVotes: ethers.utils.formatEther(votes.againstVotes),
      forVotes: ethers.utils.formatEther(votes.forVotes),
      abstainVotes: ethers.utils.formatEther(votes.abstainVotes)
    };
  } catch (error) {
    console.error('Error getting proposal votes:', error);
    return {
      againstVotes: '0',
      forVotes: '0',
      abstainVotes: '0'
    };
  }
}

/**
 * Check if user has voted on a proposal
 * @param {ethers.Contract} contract 
 * @param {string} proposalId 
 * @param {string} account 
 * @returns {Promise<boolean>}
 */
export async function hasVoted(contract, proposalId, account) {
  try {
    return await contract.hasVoted(proposalId, account);
  } catch (error) {
    console.error('Error checking if voted:', error);
    return false;
  }
}

/**
 * Get voting power of an account - VERSION SIMPLIFIÉE
 * @param {ethers.Contract} contract 
 * @param {string} account 
 * @returns {Promise<string>}
 */
export async function getVotingPower(contract, account) {
  try {
    // Essayer d'abord sans numéro de bloc
    const votes = await contract.getVotes(account);
    return ethers.utils.formatEther(votes);
  } catch (error) {
    console.error('Error getting voting power:', error);
    return '0';
  }
}

/**
 * Get proposal deadline
 * @param {ethers.Contract} contract 
 * @param {string} proposalId 
 * @returns {Promise<number>}
 */
export async function getProposalDeadline(contract, proposalId) {
  try {
    const deadline = await contract.proposalDeadline(proposalId);
    return deadline.toNumber();
  } catch (error) {
    console.error('Error getting proposal deadline:', error);
    return 0;
  }
}

/**
 * Get quorum
 * @param {ethers.Contract} contract 
 * @returns {Promise<string>}
 */
export async function getQuorum(contract) {
  try {
    const blockNumber = await contract.provider.getBlockNumber();
    const quorum = await contract.quorum(blockNumber - 1);
    return ethers.utils.formatEther(quorum);
  } catch (error) {
    console.error('Error getting quorum:', error);
    return '0';
  }
}

/**
 * Get current voting power for account - VERSION SIMPLIFIÉE
 * @param {ethers.Contract} contract 
 * @param {string} account 
 * @returns {Promise<string>}
 */
export async function getCurrentVotingPower(contract, account) {
  try {
    return await getVotingPower(contract, account);
  } catch (error) {
    console.error('Error getting current voting power:', error);
    return '0';
  }
}

/**
 * Check if account can create proposal
 * @param {ethers.Contract} contract 
 * @param {string} account 
 * @returns {Promise<{canPropose: boolean, votingPower: string, threshold: string}>}
 */
export async function canCreateProposal(contract, account) {
  try {
    const [votingPower, threshold] = await Promise.all([
      getCurrentVotingPower(contract, account),
      getProposalThreshold(contract)
    ]);
    
    return {
      canPropose: parseFloat(votingPower) >= parseFloat(threshold),
      votingPower,
      threshold
    };
  } catch (error) {
    console.error('Error checking proposal eligibility:', error);
    return {
      canPropose: false,
      votingPower: '0',
      threshold: '0'
    };
  }
}

/**
 * Get proposal threshold
 * @param {ethers.Contract} contract 
 * @returns {Promise<string>}
 */
export async function getProposalThreshold(contract) {
  try {
    const threshold = await contract.proposalThreshold();
    return ethers.utils.formatEther(threshold);
  } catch (error) {
    console.error('Error getting proposal threshold:', error);
    return '0';
  }
}

export const PROPOSAL_STATES = {
  0: 'En attente',
  1: 'Actif',
  2: 'Annulé',
  3: 'Défait',
  4: 'Réussi',
  5: 'En file',
  6: 'Expiré',
  7: 'Exécuté'
};

export const VOTE_TYPES = {
  AGAINST: 0,
  FOR: 1,
  ABSTAIN: 2
};