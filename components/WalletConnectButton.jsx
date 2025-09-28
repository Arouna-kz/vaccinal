// components/WalletConnectButton.js - Version améliorée
'use client';

import { useState, useEffect } from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';

export default function WalletConnectButton() {
  const { 
    isConnected, 
    formattedAddress, 
    isLoading, 
    connect, 
    disconnect,
    isCorrectNetwork,
    switchToCorrectNetwork,
    isInitialized
  } = useWallet();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    await connect();
    // La redirection est maintenant gérée par les événements
  };

  const handleDisconnect = () => {
    disconnect();
    // La réinitialisation est maintenant gérée par les événements
  };

  if (!mounted || !isInitialized) {
    return (
      <Button disabled className="bg-button text-white">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading...
        </div>
      </Button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-textPrimary">
            {formattedAddress}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="text-xs"
        >
          Déconnexion
        </Button>
        {!isCorrectNetwork && (
          <div className="flex items-center gap-1 text-alert">
            <AlertCircle className="w-4 h-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToCorrectNetwork}
              className="text-xs text-alert hover:text-alert-dark hover:bg-alert/10"
            >
              Changer de réseau
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      className="bg-button hover:bg-primaryDark text-white"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Connexion...
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Connecter Wallet
        </div>
      )}
    </Button>
  );
}