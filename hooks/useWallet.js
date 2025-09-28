// hooks/useWallet.js - Version corrigée
'use client';

import { useState, useEffect, useCallback } from 'react';
import { initializeWeb3, checkNetwork, switchNetwork, formatAddress } from '../services/blockchain';
import toast from 'react-hot-toast';

export function useWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [network, setNetwork] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkCurrentNetwork = useCallback(async (provider) => {
    try {
      const correct = await checkNetwork(provider);
      setIsCorrectNetwork(correct);
      return correct;
    } catch (error) {
      console.error('Error checking network:', error);
      setIsCorrectNetwork(false);
      return false;
    }
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      const { provider, signer, address } = await initializeWeb3();
      
      const networkCorrect = await checkCurrentNetwork(provider);
      if (!networkCorrect) {
        await switchNetwork(provider);
        await checkCurrentNetwork(provider);
      }

      const network = await provider.getNetwork();
      
      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setNetwork(network);
      setIsConnected(true);
      
      // Émettre un événement pour notifier la connexion
      window.dispatchEvent(new Event('walletConnected'));
      
      toast.success(`Connected to ${formatAddress(address)}`);
      window.location.reload();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [checkCurrentNetwork]);

  // const disconnect = useCallback(() => {
  //   setProvider(null);
  //   setSigner(null);
  //   setAddress('');
  //   setNetwork(null);
  //   setIsConnected(false);
  //   setIsCorrectNetwork(false);
    
  //   // Émettre un événement pour notifier la déconnexion
  //   window.dispatchEvent(new Event('walletDisconnected'));
    
  //   toast.success('Wallet disconnected');
  // }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress('');
    setNetwork(null);
    setIsConnected(false);
    setIsCorrectNetwork(false);
    toast.success('Wallet disconnected');

    // AJOUTÉ : Forcer le rechargement pour nettoyer l'état et revenir à l'accueil
    window.location.reload();
    
  }, []);

  const switchToCorrectNetwork = useCallback(async () => {
    if (!provider) return;
    
    try {
      await switchNetwork(provider);
      await checkCurrentNetwork(provider);
      toast.success('Network switched successfully');
    } catch (error) {
      console.error('Error switching network:', error);
      toast.error('Failed to switch network');
    }
  }, [provider, checkCurrentNetwork]);

  // Vérifier la connexion existante - CORRIGÉ
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts.length > 0) {
            // Toujours réinitialiser la connexion au chargement
            const { provider, signer, address } = await initializeWeb3();
            const network = await provider.getNetwork();
            await checkCurrentNetwork(provider);
            
            setProvider(provider);
            setSigner(signer);
            setAddress(address);
            setNetwork(network);
            setIsConnected(true);
          }
        } catch (error) {
          console.log('No existing wallet connection');
        } finally {
          setIsInitialized(true);
        }
      } else {
        setIsInitialized(true);
      }
    };

    checkExistingConnection();
  }, [checkCurrentNetwork]); // Retirer isConnected des dépendances

  // Écouter les changements de compte
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else if (accounts[0] !== address) {
          setAddress(accounts[0]);
          // Rafraîchir les données
          window.dispatchEvent(new Event('walletAccountChanged'));
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [address, disconnect]);

  return {
    isConnected,
    address,
    provider,
    signer,
    network,
    isLoading,
    isCorrectNetwork,
    isInitialized,
    connect,
    disconnect,
    switchToCorrectNetwork,
    formattedAddress: formatAddress(address)
  };
}