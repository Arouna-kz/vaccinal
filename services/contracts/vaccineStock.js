import { ethers } from 'ethers';
import { getContract } from '../blockchain';
import VaccineStockABI from '../../abi/VaccineStock.json';

/**
 * @fileoverview VaccineStock contract interactions
 * @description Service for managing vaccine stock operations
 */

/**
 * Get VaccineStock contract instance
 * @param {ethers.Signer} signer 
 * @returns {ethers.Contract}
 */
export function getVaccineStockContract(signer) {
  const address = process.env.NEXT_PUBLIC_CONTRACT_VACCINE_STOCK_ADDRESS;
  return getContract(address, VaccineStockABI, signer);
}

/**
 * Add a new vaccination center
 * @param {ethers.Contract} contract 
 * @param {string} centerId 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function addCenter(contract, centerId) {
  try {
    const tx = await contract.addCenter(centerId);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error adding center:', error);
    throw error;
  }
}

/**
 * Configure vaccine stock for a center
 * @param {ethers.Contract} contract 
 * @param {string} centerId 
 * @param {string} vaccineType 
 * @param {number} initialQuantity 
 * @param {number} criticalThreshold 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function configureVaccineStock(contract, centerId, vaccineType, initialQuantity, criticalThreshold) {
  try {
    // First, ensure the center exists by adding it
    try {
      await addCenter(contract, centerId);
    } catch (centerError) {
      // If center already exists, this will fail but we can continue
      console.log('Center may already exist, continuing with configuration...');
    }
    
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    const tx = await contract.configureVaccineStock(
      centerId, 
      vaccinationTypeId, 
      initialQuantity, 
      criticalThreshold
    );
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error configuring vaccine stock:', error);
    throw error;
  }
}

/**
 * Add stock to a center
 * @param {ethers.Contract} contract 
 * @param {string} centerId 
 * @param {string} vaccineType 
 * @param {number} quantity 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function addStock(contract, centerId, vaccineType, quantity) {
  try {
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    const tx = await contract.addStock(centerId, vaccinationTypeId, quantity);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error adding stock:', error);
    throw error;
  }
}

/**
 * Remove stock from a center
 * @param {ethers.Contract} contract 
 * @param {string} centerId 
 * @param {string} vaccineType 
 * @param {number} quantity 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function removeStock(contract, centerId, vaccineType, quantity) {
  try {
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    const tx = await contract.removeStock(centerId, vaccinationTypeId, quantity);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error removing stock:', error);
    throw error;
  }
}

/**
 * Get stock information for a center and vaccine type
 * @param {ethers.Contract} contract 
 * @param {string} centerId 
 * @param {string} vaccineType 
 * @returns {Promise<{currentQuantity: ethers.BigNumber, criticalThreshold: ethers.BigNumber}>}
 */
export async function getStock(contract, centerId, vaccineType) {
  try {
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    const [currentQuantity, criticalThreshold] = await contract.getStock(centerId, vaccinationTypeId);
    return {
      currentQuantity: currentQuantity.toNumber(),
      criticalThreshold: criticalThreshold.toNumber()
    };
  } catch (error) {
    // Return null for any contract revert (including unconfigured vaccine types)
    // This allows the UI to display "Non configuré" gracefully
    return null;
  }
}

/**
 * Get all centers from blockchain
 * @param {ethers.Contract} contract 
 * @returns {Promise<string[]>}
 */
export async function getAllCenters(contract) {
  try {
    const centers = await contract.getAllCenters();
    return centers;
  } catch (error) {
    // Return empty array for any contract revert (including when no centers exist)
    // This allows  the UI to display an empty list gracefully
    console.log('No centers found or contract call reverted, returning empty array');
    return [];
  }
}