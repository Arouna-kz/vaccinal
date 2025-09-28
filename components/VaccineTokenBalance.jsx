'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { Coins, Send, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/useWallet';
import { useVGOVBalance } from '@/hooks/useVGOVBalance';
import { 
  getVaccineGovTokenContract, 
  getTokenBalance, 
  getTokenInfo, 
  transferTokens, 
  mintTokens, 
  burnTokens,
  burnFromTokens,
  getContractOwner 
} from '@/services/contracts/vaccineGovToken';
import toast from 'react-hot-toast';

/**
 * VGOV token balance and transfer component
 * @returns {JSX.Element}
 */
export default function VaccineTokenBalance() {
  const { t } = useTranslation('common');
  const { signer, address, isConnected } = useWallet();
  const { balance, tokenInfo, loading: balanceLoading, refreshBalance } = useVGOVBalance();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('transfer');
  const [isContractOwner, setIsContractOwner] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(false);
  const [transferData, setTransferData] = useState({
    recipient: '',
    amount: ''
  });
  const [mintData, setMintData] = useState({
    recipient: '',
    amount: ''
  });
  const [burnData, setBurnData] = useState({
    amount: ''
  });

  // Reset form data when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setTransferData({ recipient: '', amount: '' });
      setMintData({ recipient: '', amount: '' });
      setBurnData({ amount: '' });
      setActiveTab('transfer');
      setIsContractOwner(false);
    }
  }, [isConnected]);

  /**
   * Check if current user is contract owner
   */
  useEffect(() => {
    const checkOwnership = async () => {
      if (!signer || !address) {
        setIsContractOwner(false);
        return;
      }

      setCheckingOwner(true);
      try {
        const contract = getVaccineGovTokenContract(signer);
        const owner = await getContractOwner(contract);
        setIsContractOwner(owner.toLowerCase() === address.toLowerCase());
      } catch (error) {
        console.error('Error checking contract ownership:', error);
        setIsContractOwner(false);
      } finally {
        setCheckingOwner(false);
      }
    };

    checkOwnership();
  }, [signer, address]);

  /**
   * Handle token transfer
   */
  const handleTransfer = async () => {
    if (!signer || !transferData.recipient || !transferData.amount) {
      toast.error('Please fill all fields');
      return;
    }

    if (parseFloat(transferData.amount) > parseFloat(balance)) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineGovTokenContract(signer);
      await transferTokens(contract, transferData.recipient, transferData.amount);
      
      toast.success(`Successfully transferred ${transferData.amount} ${tokenInfo?.symbol || 'VGOV'}`);
      setTransferData({ recipient: '', amount: '' });
      
      // Refresh balance
      setTimeout(refreshBalance, 2000);
    } catch (error) {
      console.error('Error transferring tokens:', error);
      toast.error('Failed to transfer tokens: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle token minting
   */
  const handleMint = async () => {
    if (!signer || !mintData.recipient || !mintData.amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineGovTokenContract(signer);
      await mintTokens(contract, mintData.recipient, mintData.amount);
      
      toast.success(`${mintData.amount} ${tokenInfo?.symbol || 'VGOV'} créés avec succès`);
      setMintData({ recipient: '', amount: '' });
      
      // Refresh balance
      setTimeout(refreshBalance, 2000);
    } catch (error) {
      console.error('Error minting tokens:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle token burning
   */
  const handleBurn = async () => {
    if (!signer || !burnData.amount) {
      toast.error('Veuillez remplir le montant');
      return;
    }

    if (parseFloat(burnData.amount) > parseFloat(balance)) {
      toast.error('Solde insuffisant');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineGovTokenContract(signer);
      await burnTokens(contract, burnData.amount);
      
      toast.success(`${burnData.amount} ${tokenInfo?.symbol || 'VGOV'} brûlés avec succès`);
      setBurnData({ amount: '' });
      
      // Refresh balance
      setTimeout(refreshBalance, 2000);
    } catch (error) {
      console.error('Error burning tokens:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">
          {t('wallet.not_connected')} {t('wallet connect')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            {t('tokens.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balanceLoading && !tokenInfo ? (
            <div className="text-center p-4">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="mt-2 text-gray-600">{t('common.loading')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">{t('tokens.balance')}</p>
                    <p className="text-2xl font-bold text-textPrimary">
                      {parseFloat(balance).toFixed(2)} {tokenInfo?.symbol || 'VGOV'}
                    </p>
                  </div>
                  <Coins className="w-8 h-8 text-primary" />
                </div>
              </div>

              {tokenInfo && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nom du token:</span>
                    <p className="font-medium">{tokenInfo.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Symbole:</span>
                    <p className="font-medium">{tokenInfo.symbol}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Offre totale:</span>
                    <p className="font-medium">{parseFloat(tokenInfo.totalSupply).toLocaleString('fr-FR')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Décimales:</span>
                    <p className="font-medium">{tokenInfo.decimals}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={activeTab === 'transfer' ? 'default' : 'outline'}
          onClick={() => setActiveTab('transfer')}
          className={activeTab === 'transfer' ? 'bg-button text-white' : ''}
        >
          <Send className="w-4 h-4 mr-2" />
          Transférer
        </Button>
        
        {isContractOwner && (
          <Button
            variant={activeTab === 'mint' ? 'default' : 'outline'}
            onClick={() => setActiveTab('mint')}
            className={activeTab === 'mint' ? 'bg-button text-white' : ''}
            disabled={checkingOwner}
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer
          </Button>
        )}
        
        {/* <Button
          variant={activeTab === 'burn' ? 'default' : 'outline'}
          onClick={() => setActiveTab('burn')}
          className={activeTab === 'burn' ? 'bg-button text-white' : ''}
        >
          <Minus className="w-4 h-4 mr-2" />
          Brûler
        </Button> */}
      </div>

      {/* Transfer Tab */}
      {activeTab === 'transfer' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {t('tokens.transfer')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">{t('tokens.recipient')}</Label>
                <Input
                  id="recipient"
                  value={transferData.recipient}
                  onChange={(e) => setTransferData({ ...transferData, recipient: e.target.value })}
                  placeholder="0x..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="amount">{t('tokens.amount')}</Label>
                <div className="relative mt-1">
                  <Input
                    id="amount"
                    type="number"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {tokenInfo?.symbol || 'VGOV'}
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Solde disponible: {parseFloat(balance).toFixed(2)} {tokenInfo?.symbol || 'VGOV'}
                </p>
              </div>

              <Button
                onClick={handleTransfer}
                disabled={loading || !transferData.recipient || !transferData.amount}
                className="w-full bg-button hover:bg-primaryDark text-white"
              >
                {loading ? t('common.loading') : t('tokens.transfer')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mint Tab */}
      {activeTab === 'mint' && isContractOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Créer des tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="mintRecipient">Adresse destinataire</Label>
                <Input
                  id="mintRecipient"
                  value={mintData.recipient}
                  onChange={(e) => setMintData({ ...mintData, recipient: e.target.value })}
                  placeholder="0x..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="mintAmount">Montant à créer</Label>
                <div className="relative mt-1">
                  <Input
                    id="mintAmount"
                    type="number"
                    value={mintData.amount}
                    onChange={(e) => setMintData({ ...mintData, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {tokenInfo?.symbol || 'VGOV'}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleMint}
                disabled={loading || !mintData.recipient || !mintData.amount}
                className="w-full bg-button hover:bg-primaryDark text-white"
              >
                {loading ? t('common.loading') : 'Créer les tokens'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Burn Tab */}
      {activeTab === 'burn' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5 text-primary" />
              Brûler des tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="burnAmount">Montant à brûler</Label>
                <div className="relative mt-1">
                  <Input
                    id="burnAmount"
                    type="number"
                    value={burnData.amount}
                    onChange={(e) => setBurnData({ amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {tokenInfo?.symbol || 'VGOV'}
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Solde disponible: {parseFloat(balance).toFixed(2)} {tokenInfo?.symbol || 'VGOV'}
                </p>
              </div>

              <Button
                onClick={handleBurn}
                disabled={loading || !burnData.amount || parseFloat(burnData.amount) <= 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? t('common.loading') : 'Brûler les tokens'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}