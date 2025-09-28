import { ethers } from 'ethers';
import { getContract } from '../blockchain';
import VaccineGovTokenABI from '../../abi/VaccineGovToken.json';

/**
 * @fileoverview VaccineGovToken contract interactions
 * @description Service for managing VGOV token operations
 */

/**
 * Get VaccineGovToken contract instance
 * @param {ethers.Signer} signer 
 * @returns {ethers.Contract}
 */
export function getVaccineGovTokenContract(signer) {
  const address = process.env.NEXT_PUBLIC_CONTRACT_VACCINE_GOV_TOKEN_ADDRESS;
  return getContract(address, VaccineGovTokenABI, signer);
}

/**
 * Get token balance for an address
 * @param {ethers.Contract} contract 
 * @param {string} address 
 * @returns {Promise<string>}
 */
export async function getTokenBalance(contract, address) {
  try {
    const balance = await contract.balanceOf(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
}

/**
 * Transfer tokens to another address
 * @param {ethers.Contract} contract 
 * @param {string} to 
 * @param {string} amount 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function transferTokens(contract, to, amount) {
  try {
    const parsedAmount = ethers.utils.parseEther(amount.toString());
    const tx = await contract.transfer(to, parsedAmount);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
}

/**
 * Burn tokens (only for owner/DAO or token holders)
 * @param {ethers.Contract} contract 
 * @param {string} amount 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function burnTokens(contract, amount) {
  try {
    const parsedAmount = ethers.utils.parseEther(amount.toString());
    const tx = await contract.burn(parsedAmount);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error burning tokens:', error);
    
    // Check for specific revert reasons
    if (error.reason && error.reason.includes('ERC20InsufficientBalance')) {
      throw new Error('Cannot burn tokens: Insufficient balance');
    } else if (error.data && error.data.message && error.data.message.includes('execution reverted')) {
      throw new Error('Transaction failed: Contract execution reverted.');
    } else {
      throw new Error('Failed to burn tokens: ' + (error.reason || error.message || 'Unknown error'));
    }
  }
}

/**
 * Burn tokens from a specific address (only for owner/DAO)
 * @param {ethers.Contract} contract 
 * @param {string} from 
 * @param {string} amount 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function burnFromTokens(contract, from, amount) {
  try {
    const parsedAmount = ethers.utils.parseEther(amount.toString());
    const tx = await contract.burnFrom(from, parsedAmount);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error burning tokens from address:', error);
    
    if (error.reason && error.reason.includes('Ownable: caller is not the owner')) {
      throw new Error('Only the contract owner can burn tokens from other addresses');
    } else if (error.reason && error.reason.includes('ERC20InsufficientAllowance')) {
      throw new Error('Insufficient allowance to burn tokens from this address');
    } else {
      throw new Error('Failed to burn tokens: ' + (error.reason || error.message || 'Unknown error'));
    }
  }
}

/**
 * Approve spending allowance for another address
 * @param {ethers.Contract} contract 
 * @param {string} spender 
 * @param {string} amount 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function approveTokens(contract, spender, amount) {
  try {
    const parsedAmount = ethers.utils.parseEther(amount.toString());
    const tx = await contract.approve(spender, parsedAmount);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error approving tokens:', error);
    throw error;
  }
}

/**
 * Get token information
 * @param {ethers.Contract} contract 
 * @returns {Promise<{name: string, symbol: string, decimals: number, totalSupply: string}>}
 */
export async function getTokenInfo(contract) {
  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply()
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply: ethers.utils.formatEther(totalSupply)
    };
  } catch (error) {
    console.error('Error getting token info:', error);
    throw error;
  }
}

/**
 * Get contract owner address
 * @param {ethers.Contract} contract 
 * @returns {Promise<string>}
 */
export async function getContractOwner(contract) {
  try {
    const owner = await contract.owner();
    return owner;
  } catch (error) {
    console.error('Error getting contract owner:', error);
    throw error;
  }
}

/**
 * Mint new tokens (only for owner/DAO)
 * @param {ethers.Contract} contract 
 * @param {string} to 
 * @param {string} amount 
 * @returns {Promise<ethers.ContractTransaction>}
 */
/**
 * Mint new tokens (only for owner/DAO)
 * @param {ethers.Contract} contract 
 * @param {string} to 
 * @param {string} amount 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function mintTokens(contract, to, amount) {
  try {
    const parsedAmount = ethers.utils.parseEther(amount.toString());
    
    // Use manual gas limit
    const tx = await contract.mint(to, parsedAmount, {
      gasLimit: 100000 // Set appropriate gas limit
    });
    
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
}
