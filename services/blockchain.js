import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

/**
 * @fileoverview Blockchain service for Ethereum/Hedera integration
 * @description Handles Web3 provider, wallet connection, and contract interactions
 */

/**
 * Initialize Web3 provider and connect to MetaMask
 * @returns {Promise<{provider: ethers.providers.Web3Provider, signer: ethers.Signer, address: string}>}
 */
export async function initializeWeb3() {
  const ethereumProvider = await detectEthereumProvider();
  
  if (!ethereumProvider) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.providers.Web3Provider(ethereumProvider);
  await provider.send('eth_requestAccounts', []);
  
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
}

/**
 * Check if user is connected to the correct network
 * @param {ethers.providers.Web3Provider} provider 
 * @returns {Promise<boolean>}
 */
export async function checkNetwork(provider) {
  const network = await provider.getNetwork();
  const expectedNetworkId = process.env.NEXT_PUBLIC_CHAIN_ID_INT || '296';
  
  return network.chainId.toString() === expectedNetworkId;
}

/**
 * Switch to the correct network
 * @param {ethers.providers.Web3Provider} provider 
 */
export async function switchNetwork(provider) {
  const networkId = process.env.NEXT_PUBLIC_CHAIN_ID_INT || '296';
  
  try {
    await provider.send('wallet_switchEthereumChain', [
      { chainId: `0x${parseInt(networkId).toString(16)}` }
    ]);
  } catch (error) {
    if (error.code === 4902) {
      // Network not added, add it
      await provider.send('wallet_addEthereumChain', [
        {
          chainId: `0x${parseInt(networkId).toString(16)}`,
          chainName: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Hedera Testnet',
          rpcUrls: [process.env.NEXT_PUBLIC_NETWORK_RPC || 'https://testnet.hashio.io/api'],
          nativeCurrency: {
            name: 'HBAR',
            symbol: 'HBAR',
            decimals: 18
          }
        }
      ]);
    }
  }
}

/**
 * Get contract instance
 * @param {string} contractAddress 
 * @param {Array} abi 
 * @param {ethers.Signer} signer 
 * @returns {ethers.Contract}
 */
export function getContract(contractAddress, abi, signer) {
  if (!contractAddress || !abi || !signer) {
    throw new Error('Missing contract parameters');
  }
  
  return new ethers.Contract(contractAddress, abi, signer);
}

/**
 * Format Ethereum address for display
 * @param {string} address 
 * @returns {string}
 */
export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format token amount from wei
 * @param {ethers.BigNumber|string} amount 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatTokenAmount(amount, decimals = 18) {
  return ethers.utils.formatUnits(amount, decimals);
}

/**
 * Parse token amount to wei
 * @param {string} amount 
 * @param {number} decimals 
 * @returns {ethers.BigNumber}
 */
export function parseTokenAmount(amount, decimals = 18) {
  return ethers.utils.parseUnits(amount.toString(), decimals);
}