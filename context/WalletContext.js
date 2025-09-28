// contexts/WalletContext.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initializeWeb3, checkNetwork, switchNetwork, formatAddress } from '../services/blockchain';
import toast from 'react-hot-toast';

// Créer le contexte avec des valeurs par défaut
const WalletContext = createContext(undefined);

// Composant Provider du contexte
export function WalletProvider({ children }) {
  const [state, setState] = useState({
    isConnected: false,
    address: '',
    provider: null,
    signer: null,
    network: null,
    isLoading: false,
    isInitialized: false
  });

  // Fonction pour mettre à jour plusieurs propriétés d'état en une fois
  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const connect = useCallback(async () => {
    updateState({ isLoading: true });
    
    try {
      const { provider, signer, address } = await initializeWeb3();
      
      const isCorrectNetwork = await checkNetwork(provider);
      if (!isCorrectNetwork) {
        await switchNetwork(provider);
      }

      const network = await provider.getNetwork();
      
      updateState({
        isConnected: true,
        address,
        provider,
        signer,
        network,
        isLoading: false
      });
      
      toast.success(`Connected to ${formatAddress(address)}`);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet: ' + error.message);
      updateState({ isLoading: false });
    }
  }, []);

  const disconnect = useCallback(() => {
    updateState({
      isConnected: false,
      address: '',
      provider: null,
      signer: null,
      network: null,
      isLoading: false
    });
    toast.success('Wallet disconnected');
  }, []);

  const switchToCorrectNetwork = useCallback(async () => {
    if (!state.provider) return;
    
    try {
      await switchNetwork(state.provider);
      toast.success('Network switched successfully');
    } catch (error) {
      console.error('Error switching network:', error);
      toast.error('Failed to switch network');
    }
  }, [state.provider]);

  // Vérifier la connexion existante au chargement du composant
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts.length > 0 && !state.isConnected) {
            await connect();
          }
        } catch (error) {
          console.log('No existing wallet connection');
        } finally {
          updateState({ isInitialized: true });
        }
      } else {
        updateState({ isInitialized: true });
      }
    };

    checkExistingConnection();
  }, [connect, state.isConnected]);

  // Écouter les changements de compte
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else if (accounts[0] !== state.address) {
          updateState({ address: accounts[0] });
          toast.info(`Account changed to ${formatAddress(accounts[0])}`);
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
  }, [state.address, disconnect]);

  const value = {
    ...state,
    connect,
    disconnect,
    switchToCorrectNetwork,
    formattedAddress: formatAddress(state.address)
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte wallet
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}