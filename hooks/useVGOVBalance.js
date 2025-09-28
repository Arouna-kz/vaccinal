'use client';

import { useState, useEffect, useCallback } from 'react';
import { getVaccineGovTokenContract, getTokenBalance, getTokenInfo } from '@/services/contracts/vaccineGovToken';
import { useWallet } from './useWallet';

/**
 * Hook global pour gérer le solde VGOV
 * @returns {Object} État du solde VGOV
 */
export function useVGOVBalance() {
  const { signer, address, isConnected } = useWallet();
  const [balance, setBalance] = useState('0');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);

  /**
   * Récupérer le solde et les infos du token
   */
  const fetchBalance = useCallback(async (force = false) => {
    if (!signer || !address || !isConnected) {
      setBalance('0');
      setTokenInfo(null);
      setLastUpdate(0);
      return;
    }

    // Éviter les appels trop fréquents (sauf si forcé)
    const now = Date.now();
    if (!force && now - lastUpdate < 5000) return;

    setLoading(true);
    try {
      const contract = getVaccineGovTokenContract(signer);
      
      const [newBalance, info] = await Promise.all([
        getTokenBalance(contract, address),
        tokenInfo ? Promise.resolve(tokenInfo) : getTokenInfo(contract)
      ]);

      setBalance(newBalance);
      if (!tokenInfo) setTokenInfo(info);
      setLastUpdate(now);
    } catch (error) {
      console.error('Error fetching VGOV balance:', error);
      // Ne pas réinitialiser en cas d'erreur pour éviter les clignotements
    } finally {
      setLoading(false);
    }
  }, [signer, address, isConnected, lastUpdate, tokenInfo]);

  /**
   * Forcer la mise à jour du solde
   */
  const refreshBalance = useCallback(() => {
    fetchBalance(true);
  }, [fetchBalance]);

  // Récupérer le solde au montage et lors des changements
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Actualiser périodiquement le solde
  useEffect(() => {
    if (!isConnected || !address) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isConnected, address, fetchBalance]);

  // Écouter les événements de transfert pour mise à jour automatique
  useEffect(() => {
    if (!signer || !address) return;

    const contract = getVaccineGovTokenContract(signer);
    
    // Écouter les événements Transfer
    const transferFilter = contract.filters.Transfer();
    
    const handleTransfer = (from, to, value, event) => {
      // Si l'utilisateur est impliqué dans le transfert, actualiser
      if (from.toLowerCase() === address.toLowerCase() || 
          to.toLowerCase() === address.toLowerCase()) {
        setTimeout(() => refreshBalance(), 2000); // Délai pour confirmation
      }
    };

    contract.on(transferFilter, handleTransfer);

    return () => {
      contract.off(transferFilter, handleTransfer);
    };
  }, [signer, address, refreshBalance]);

  return {
    balance,
    tokenInfo,
    loading,
    refreshBalance,
    formattedBalance: parseFloat(balance).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  };
}