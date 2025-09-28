import { ethers } from 'ethers';
import { getContract } from '../blockchain';
import VaccineStockABI from '../../abi/VaccineStock.json';
import VaccineRegistryABI from '../../abi/VaccineRegistry.json';

/**
 * @fileoverview Role management service for blockchain contracts
 * @description Handles role-based access control operations
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
 * Get VaccineRegistry contract instance
 * @param {ethers.Signer} signer 
 * @returns {ethers.Contract}
 */
export function getVaccineRegistryContract(signer) {
  const address = process.env.NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS;
  return getContract(address, VaccineRegistryABI, signer);
}

/**
 * Role constants mapping
 */
export const ROLES = {
  ADMIN_ROLE: ethers.constants.HashZero, // 0x0000000000000000000000000000000000000000000000000000000000000000
  MEDICAL_AGENT_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MEDICAL_AGENT_ROLE')),
  LOGISTIC_MANAGER_ROLE: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('LOGISTIC_MANAGER_ROLE'))
};

/**
 * Get role hash from role name
 * @param {string} roleName 
 * @returns {string}
 */
export function getRoleHash(roleName) {
  if (roleName === 'ADMIN_ROLE' || roleName === 'DEFAULT_ADMIN_ROLE') {
    return ethers.constants.HashZero;
  }
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(roleName));
}

/**
 * Grant role to an account
 * @param {ethers.Contract} contract 
 * @param {string} role 
 * @param {string} account 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function grantRole(contract, role, account) {
  try {
    const roleHash = getRoleHash(role);
    const tx = await contract.grantRole(roleHash, account);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error granting role:', error);
    throw error;
  }
}

/**
 * Revoke role from an account
 * @param {ethers.Contract} contract 
 * @param {string} role 
 * @param {string} account 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function revokeRole(contract, role, account) {
  try {
    const roleHash = getRoleHash(role);
    const tx = await contract.revokeRole(roleHash, account);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error revoking role:', error);
    throw error;
  }
}

/**
 * Check if account has role
 * @param {ethers.Contract} contract 
 * @param {string} role 
 * @param {string} account 
 * @returns {Promise<boolean>}
 */
export async function hasRole(contract, role, account) {
  try {
    const roleHash = getRoleHash(role);
    return await contract.hasRole(roleHash, account);
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

/**
 * Get role admin
 * @param {ethers.Contract} contract 
 * @param {string} role 
 * @returns {Promise<string>}
 */
export async function getRoleAdmin(contract, role) {
  try {
    const roleHash = getRoleHash(role);
    return await contract.getRoleAdmin(roleHash);
  } catch (error) {
    console.error('Error getting role admin:', error);
    throw error;
  }
}

/**
 * Renounce role for caller
 * @param {ethers.Contract} contract 
 * @param {string} role 
 * @param {string} account 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function renounceRole(contract, role, account) {
  try {
    const roleHash = getRoleHash(role);
    const tx = await contract.renounceRole(roleHash, account);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error renouncing role:', error);
    throw error;
  }
}

/**
 * Get all roles for an account across contracts
 * @param {ethers.Signer} signer 
 * @param {string} account 
 * @returns {Promise<Object>}
 */
export async function getAllUserRoles(signer, account) {
  try {
    const registryContract = getVaccineRegistryContract(signer);
    const stockContract = getVaccineStockContract(signer);

    const roles = {
      registry: {},
      stock: {}
    };

    // Check registry roles
    const registryRoles = ['ADMIN_ROLE', 'MEDICAL_AGENT_ROLE'];
    for (const role of registryRoles) {
      roles.registry[role] = await hasRole(registryContract, role, account);
    }

    // Check stock roles
    const stockRoles = ['ADMIN_ROLE', 'LOGISTIC_MANAGER_ROLE'];
    for (const role of stockRoles) {
      roles.stock[role] = await hasRole(stockContract, role, account);
    }

    return roles;
  } catch (error) {
    console.error('Error getting all user roles:', error);
    throw error;
  }
}

/**
 * Check if user is admin in any contract
 * @param {ethers.Signer} signer 
 * @param {string} account 
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin(signer, account) {
  try {
    const roles = await getAllUserRoles(signer, account);
    return roles.registry.ADMIN_ROLE || roles.stock.ADMIN_ROLE;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}