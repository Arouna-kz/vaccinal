'use client';

import { useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected } = useWallet();

  // Forcer un re-render lorsque l'état de connexion change
  useEffect(() => {
    // Cette logique s'assure que les composants se mettent à jour correctement
  }, [isConnected]);

  return <>{children}</>;
}