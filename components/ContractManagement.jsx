'use client';

import { useState, useEffect } from 'react';
import { Settings, Link, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { getVaccineRegistryContract, setStockContract } from '@/services/contracts/vaccineRegistry';
import { getVaccineDAOContract, setRegistry, setStock } from '@/services/contracts/vaccineDAO';
import { hasRole } from '@/services/contracts/roleManagement';
import toast from 'react-hot-toast';

/**
 * Contract management component for admin operations
 * @returns {JSX.Element}
 */
export default function ContractManagement() {
  const { signer, address, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [stockContractForm, setStockContractForm] = useState({
    stockAddress: ''
  });
  const [daoConfigForm, setDaoConfigForm] = useState({
    registryAddress: '',
    stockAddress: ''
  });
  const [contractAddresses, setContractAddresses] = useState({
    registry: 'Chargement...',
    stock: 'Chargement...',
    govToken: 'Chargement...',
    dao: 'Chargement...'
  });

  /**
   * Load contract addresses from environment variables
   */
  const loadContractAddresses = () => {
    setContractAddresses({
      registry: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS || 'Non configuré',
      stock: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_STOCK_ADDRESS || 'Non configuré',
      govToken: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_GOV_TOKEN_ADDRESS || 'Non configuré',
      dao: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS || 'Non configuré'
    });
  };

  /**
   * Check if current user is admin
   */
  const checkAdminRole = async () => {
    if (!signer || !address) {
      setIsAdmin(false);
      return;
    }

    setCheckingAdmin(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      const adminRole = await hasRole(contract, 'ADMIN_ROLE', address);
      setIsAdmin(adminRole);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  /**
   * Handle setting stock contract address
   */
  const handleSetStockContract = async () => {
    if (!signer || !stockContractForm.stockAddress) {
      toast.error('Veuillez saisir une adresse de contrat valide');
      return;
    }

    // Basic address validation
    if (!stockContractForm.stockAddress.startsWith('0x') || stockContractForm.stockAddress.length !== 42) {
      toast.error('Format d\'adresse invalide. L\'adresse doit commencer par 0x et faire 42 caractères');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      await setStockContract(contract, stockContractForm.stockAddress);
      
      toast.success('Contrat de stock configuré avec succès');
      setStockContractForm({ stockAddress: '' });
    } catch (error) {
      console.error('Error setting stock contract:', error);
      toast.error('Échec de la configuration du contrat: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle DAO registry configuration
   */
  const handleSetDAORegistry = async () => {
    if (!signer || !daoConfigForm.registryAddress) {
      toast.error('Veuillez saisir une adresse de contrat valide');
      return;
    }

    // Basic address validation
    if (!daoConfigForm.registryAddress.startsWith('0x') || daoConfigForm.registryAddress.length !== 42) {
      toast.error('Format d\'adresse invalide. L\'adresse doit commencer par 0x et faire 42 caractères');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineDAOContract(signer);
      await setRegistry(contract, daoConfigForm.registryAddress);
      
      toast.success('Contrat Registry configuré dans la DAO avec succès');
      setDaoConfigForm({ ...daoConfigForm, registryAddress: '' });
    } catch (error) {
      console.error('Error setting DAO registry:', error);
      toast.error('Échec de la configuration du Registry dans la DAO: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle DAO stock configuration
   */
  const handleSetDAOStock = async () => {
    if (!signer || !daoConfigForm.stockAddress) {
      toast.error('Veuillez saisir une adresse de contrat valide');
      return;
    }

    // Basic address validation
    if (!daoConfigForm.stockAddress.startsWith('0x') || daoConfigForm.stockAddress.length !== 42) {
      toast.error('Format d\'adresse invalide. L\'adresse doit commencer par 0x et faire 42 caractères');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineDAOContract(signer);
      await setStock(contract, daoConfigForm.stockAddress);
      
      toast.success('Contrat Stock configuré dans la DAO avec succès');
      setDaoConfigForm({ ...daoConfigForm, stockAddress: '' });
    } catch (error) {
      console.error('Error setting DAO stock:', error);
      toast.error('Échec de la configuration du Stock dans la DAO: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy address to clipboard
   */
  const copyToClipboard = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Adresse copiée dans le presse-papiers');
  };

  /**
   * Format address for display
   */
  const formatAddress = (address) => {
    if (!address || address === 'Non configuré') return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Check if address is configured
   */
  const isAddressConfigured = (address) => {
    return address && address !== 'Non configuré' && address.startsWith('0x');
  };

  // Check admin role when wallet connects
  useEffect(() => {
    // Load contract addresses on component mount
    loadContractAddresses();
    
    if (!isConnected || !signer || !address) {
      setIsAdmin(false);
      setStockContractForm({ stockAddress: '' });
      setDaoConfigForm({ registryAddress: '', stockAddress: '' });
      return;
    }
    
    checkAdminRole();
  }, [isConnected, signer, address]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          Veuillez connecter votre portefeuille pour accéder à la gestion des contrats
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Statut administrateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkingAdmin ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-gray-600">Vérification des permissions...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">Vous avez les droits d'administrateur</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-700 font-medium">Droits d'administrateur requis pour cette section</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Addresses Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            Adresses des contrats déployés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(contractAddresses).map(([contractName, address]) => (
              <div key={contractName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isAddressConfigured(address) ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-medium capitalize">
                      {contractName === 'registry' ? 'Registry' :
                       contractName === 'stock' ? 'Stock' :
                       contractName === 'govToken' ? 'Gov Token' :
                       contractName === 'dao' ? 'DAO' : contractName}
                    </span>
                  </div>
                  <Badge variant={isAddressConfigured(address) ? "default" : "secondary"}>
                    {isAddressConfigured(address) ? 'Configuré' : 'Non configuré'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border">
                    {formatAddress(address)}
                  </code>
                  {isAddressConfigured(address) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(address)}
                    >
                      Copier
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Contract Configuration */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configuration du contrat de stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-medium">Configuration importante</p>
                    <p className="text-blue-700 text-sm mt-1">
                      Cette fonction lie le contrat VaccineRegistry au contrat VaccineStock. 
                      Elle doit être appelée après le déploiement pour permettre la vérification des stocks lors de l'administration des doses.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="stockAddress">Adresse du contrat VaccineStock</Label>
                <Input
                  id="stockAddress"
                  value={stockContractForm.stockAddress}
                  onChange={(e) => setStockContractForm({ stockAddress: e.target.value })}
                  placeholder="0x..."
                  className="mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Adresse actuelle configurée: {contractAddresses.stock}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStockContractForm({ stockAddress: contractAddresses.stock })}
                  variant="outline"
                  disabled={!isAddressConfigured(contractAddresses.stock)}
                  className="flex-1"
                >
                  Utiliser l'adresse par défaut
                </Button>
                <Button
                  onClick={handleSetStockContract}
                  disabled={loading || !stockContractForm.stockAddress}
                  className="flex-1 bg-button hover:bg-primaryDark text-white"
                >
                  {loading ? 'Configuration...' : 'Configurer le contrat'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DAO Contract Configuration */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configuration des contrats dans la DAO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-medium">Configuration DAO</p>
                    <p className="text-blue-700 text-sm mt-1">
                      Ces fonctions permettent à la DAO de configurer les adresses des contrats Registry et Stock. 
                      Elles ne peuvent être appelées que par la gouvernance DAO (modifier onlyGovernance).
                    </p>
                  </div>
                </div>
              </div>

              {/* Registry Configuration */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Configuration du contrat Registry</h4>
                <div>
                  <Label htmlFor="daoRegistryAddress">Adresse du contrat VaccineRegistry</Label>
                  <Input
                    id="daoRegistryAddress"
                    value={daoConfigForm.registryAddress}
                    onChange={(e) => setDaoConfigForm({ ...daoConfigForm, registryAddress: e.target.value })}
                    placeholder="0x..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Adresse actuelle: {contractAddresses.registry}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setDaoConfigForm({ ...daoConfigForm, registryAddress: contractAddresses.registry })}
                    variant="outline"
                    disabled={!isAddressConfigured(contractAddresses.registry)}
                    className="flex-1"
                  >
                    Utiliser l'adresse Registry par défaut
                  </Button>
                  <Button
                    onClick={handleSetDAORegistry}
                    disabled={loading || !daoConfigForm.registryAddress}
                    className="flex-1 bg-button hover:bg-primaryDark text-white"
                  >
                    {loading ? 'Configuration...' : 'Configurer Registry dans DAO'}
                  </Button>
                </div>
              </div>

              {/* Stock Configuration */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Configuration du contrat Stock</h4>
                <div>
                  <Label htmlFor="daoStockAddress">Adresse du contrat VaccineStock</Label>
                  <Input
                    id="daoStockAddress"
                    value={daoConfigForm.stockAddress}
                    onChange={(e) => setDaoConfigForm({ ...daoConfigForm, stockAddress: e.target.value })}
                    placeholder="0x..."
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Adresse actuelle: {contractAddresses.stock}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setDaoConfigForm({ ...daoConfigForm, stockAddress: contractAddresses.stock })}
                    variant="outline"
                    disabled={!isAddressConfigured(contractAddresses.stock)}
                    className="flex-1"
                  >
                    Utiliser l'adresse Stock par défaut
                  </Button>
                  <Button
                    onClick={handleSetDAOStock}
                    disabled={loading || !daoConfigForm.stockAddress}
                    className="flex-1 bg-button hover:bg-primaryDark text-white"
                  >
                    {loading ? 'Configuration...' : 'Configurer Stock dans DAO'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Actions Info */}
      {!isAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-amber-800 font-medium">Accès administrateur requis</p>
                <p className="text-amber-700 text-sm">
                  Vous devez avoir le rôle ADMIN_ROLE pour configurer les contrats. 
                  Contactez un administrateur système pour obtenir les permissions nécessaires.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            État de l'intégration des contrats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium">Registry ↔ Stock</span>
                <Badge variant={isAddressConfigured(contractAddresses.stock) ? "default" : "secondary"}>
                  {isAddressConfigured(contractAddresses.stock) ? 'Lié' : 'Non lié'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Permet la vérification des stocks lors de l'administration des doses
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium">DAO ↔ Contracts</span>
                <Badge variant={isAddressConfigured(contractAddresses.dao) ? "default" : "secondary"}>
                  {isAddressConfigured(contractAddresses.dao) ? 'Lié' : 'Non lié'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Permet la gouvernance décentralisée des contrats
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}