'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Building, Syringe, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { 
  getVaccineStockContract, 
  addCenter, 
  getAllCenters 
} from '@/services/contracts/vaccineStock';
import { 
  getVaccineRegistryContract, 
  addVaccinationType, 
  getAllVaccinationTypes 
} from '@/services/contracts/vaccineRegistry';
import { hasRole } from '@/services/contracts/roleManagement';
import toast from 'react-hot-toast';

/**
 * Configuration management component for centers and vaccine types
 * @returns {JSX.Element}
 */
export default function ConfigurationManagement() {
  const { signer, address, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('centers');
  const [centers, setCenters] = useState([]);
  const [vaccineTypes, setVaccineTypes] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingVaccineTypes, setLoadingVaccineTypes] = useState(false);
  const [userRoles, setUserRoles] = useState({});
  const [checkingRoles, setCheckingRoles] = useState(false);

  // Form states
  const [centerForm, setCenterForm] = useState({
    centerId: ''
  });
  const [vaccineTypeForm, setVaccineTypeForm] = useState({
    name: '',
    requiredDoses: '2'
  });

  /**
   * Check user roles
   */
  const checkUserRoles = async () => {
    if (!signer || !address) {
      setUserRoles({});
      return;
    }

    setCheckingRoles(true);
    try {
      const stockContract = getVaccineStockContract(signer);
      const registryContract = getVaccineRegistryContract(signer);

      const roles = {
        isStockAdmin: await hasRole(stockContract, 'ADMIN_ROLE', address),
        isLogisticManager: await hasRole(stockContract, 'LOGISTIC_MANAGER_ROLE', address),
        isRegistryAdmin: await hasRole(registryContract, 'ADMIN_ROLE', address),
        isMedicalAgent: await hasRole(registryContract, 'MEDICAL_AGENT_ROLE', address)
      };

      setUserRoles(roles);
    } catch (error) {
      console.error('Error checking user roles:', error);
      setUserRoles({});
    } finally {
      setCheckingRoles(false);
    }
  };

  /**
   * Load centers from blockchain
   */
  const loadCenters = async () => {
    if (!signer) {
      setCenters([]);
      return;
    }

    setLoadingCenters(true);
    try {
      const contract = getVaccineStockContract(signer);
      const blockchainCenters = await getAllCenters(contract);
      setCenters(blockchainCenters.map(center => ({ id: center, name: center })));
    } catch (error) {
      console.error('Error loading centers:', error);
      toast.error('Erreur lors du chargement des centres');
      setCenters([]);
    } finally {
      setLoadingCenters(false);
    }
  };

  /**
   * Load vaccine types from blockchain
   */
  const loadVaccineTypes = async () => {
    if (!signer) {
      setVaccineTypes([]);
      return;
    }

    setLoadingVaccineTypes(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      const blockchainVaccineTypes = await getAllVaccinationTypes(contract);
      setVaccineTypes(blockchainVaccineTypes);
    } catch (error) {
      console.error('Error loading vaccine types:', error);
      toast.error('Erreur lors du chargement des types de vaccins');
      setVaccineTypes([]);
    } finally {
      setLoadingVaccineTypes(false);
    }
  };

  /**
   * Handle center addition
   */
  const handleAddCenter = async () => {
    if (!signer || !centerForm.centerId.trim()) {
      toast.error('Veuillez saisir un ID de centre valide');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineStockContract(signer);
      await addCenter(contract, centerForm.centerId.trim());
      
      toast.success(`Centre "${centerForm.centerId}" ajouté avec succès`);
      setCenterForm({ centerId: '' });
      
      // Reload centers
      await loadCenters();
    } catch (error) {
      console.error('Error adding center:', error);
      if (error.message.includes('CenterAlreadyExists')) {
        toast.error('Ce centre existe déjà');
      } else {
        toast.error('Échec de l\'ajout du centre: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle vaccine type addition
   */
  const handleAddVaccineType = async () => {
    if (!signer || !vaccineTypeForm.name.trim() || !vaccineTypeForm.requiredDoses) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    const requiredDoses = parseInt(vaccineTypeForm.requiredDoses);
    if (requiredDoses < 1 || requiredDoses > 10) {
      toast.error('Le nombre de doses doit être entre 1 et 10');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      await addVaccinationType(contract, vaccineTypeForm.name.trim(), requiredDoses);
      
      toast.success(`Type de vaccin "${vaccineTypeForm.name}" ajouté avec succès`);
      setVaccineTypeForm({ name: '', requiredDoses: '2' });
      
      // Reload vaccine types
      await loadVaccineTypes();
    } catch (error) {
      console.error('Error adding vaccine type:', error);
      toast.error('Échec de l\'ajout du type de vaccin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user can manage centers
   */
  const canManageCenters = () => {
    return userRoles.isStockAdmin || userRoles.isLogisticManager;
  };

  /**
   * Check if user can manage vaccine types
   */
  const canManageVaccineTypes = () => {
    return userRoles.isRegistryAdmin || userRoles.isMedicalAgent;
  };

  // Load data when component mounts and wallet is connected
  useEffect(() => {
    if (!isConnected || !signer || !address) {
      // Reset data when disconnected
      setCenters([]);
      setVaccineTypes([]);
      setUserRoles({});
      setCenterForm({ centerId: '' });
      setVaccineTypeForm({ name: '', requiredDoses: '2' });
      setActiveTab('centers');
      return;
    }
    
    // Load data when connected
    if (isConnected && signer && address) {
      checkUserRoles();
      loadCenters();
      loadVaccineTypes();
    }
  }, [isConnected, signer, address]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          Veuillez connecter votre portefeuille pour accéder à la configuration
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Vos permissions de configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkingRoles ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-gray-600">Vérification des permissions...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                <span className="text-sm">Gestion des centres:</span>
                {canManageCenters() ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Autorisé
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Non autorisé
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Syringe className="w-4 h-4 text-primary" />
                <span className="text-sm">Gestion des types de vaccins:</span>
                {canManageVaccineTypes() ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Autorisé
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Non autorisé
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={activeTab === 'centers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('centers')}
          className={activeTab === 'centers' ? 'bg-button text-white' : ''}
        >
          <Building className="w-4 h-4 mr-2" />
          Centres médicaux
        </Button>
        <Button
          variant={activeTab === 'vaccines' ? 'default' : 'outline'}
          onClick={() => setActiveTab('vaccines')}
          className={activeTab === 'vaccines' ? 'bg-button text-white' : ''}
        >
          <Syringe className="w-4 h-4 mr-2" />
          Types de vaccins
        </Button>
      </div>

      {/* Centers Tab */}
      {activeTab === 'centers' && (
        <div className="space-y-6">
          {/* Add Center Form */}
          {canManageCenters() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Ajouter un centre médical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="centerId">ID du centre</Label>
                    <Input
                      id="centerId"
                      value={centerForm.centerId}
                      onChange={(e) => setCenterForm({ centerId: e.target.value })}
                      placeholder="CENTRE_PARIS_01"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Utilisez un identifiant unique (ex: CENTRE_PARIS_01, HOPITAL_LYON_02)
                    </p>
                  </div>

                  <Button
                    onClick={handleAddCenter}
                    disabled={loading || !centerForm.centerId.trim()}
                    className="w-full bg-button hover:bg-primaryDark text-white"
                  >
                    {loading ? 'Ajout en cours...' : 'Ajouter le centre'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Centers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Centres médicaux configurés ({centers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCenters ? (
                <div className="text-center p-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="mt-2 text-gray-600">Chargement des centres depuis la blockchain...</p>
                </div>
              ) : centers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {centers.map((center) => (
                    <div key={center.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary" />
                        <span className="font-medium">{center.name}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        ID: {center.id}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun centre médical configuré</p>
                  {canManageCenters() && (
                    <p className="text-sm text-gray-500 mt-2">
                      Ajoutez votre premier centre ci-dessus
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!canManageCenters() && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-amber-800 font-medium">Permissions requises</p>
                    <p className="text-amber-700 text-sm">
                      Vous devez avoir le rôle ADMIN_ROLE ou LOGISTIC_MANAGER_ROLE pour gérer les centres médicaux.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vaccine Types Tab */}
      {activeTab === 'vaccines' && (
        <div className="space-y-6">
          {/* Add Vaccine Type Form */}
          {canManageVaccineTypes() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Ajouter un type de vaccin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vaccineName">Nom du vaccin</Label>
                    <Input
                      id="vaccineName"
                      value={vaccineTypeForm.name}
                      onChange={(e) => setVaccineTypeForm({ ...vaccineTypeForm, name: e.target.value })}
                      placeholder="MPOX"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Utilisez un nom court et descriptif (ex: MPOX, COVID-19, HEPATITIS_B)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="requiredDoses">Nombre de doses requises</Label>
                    <Input
                      id="requiredDoses"
                      type="number"
                      min="1"
                      max="10"
                      value={vaccineTypeForm.requiredDoses}
                      onChange={(e) => setVaccineTypeForm({ ...vaccineTypeForm, requiredDoses: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Nombre de doses nécessaires pour compléter la vaccination (1-10)
                    </p>
                  </div>

                  <Button
                    onClick={handleAddVaccineType}
                    disabled={loading || !vaccineTypeForm.name.trim() || !vaccineTypeForm.requiredDoses}
                    className="w-full bg-button hover:bg-primaryDark text-white"
                  >
                    {loading ? 'Ajout en cours...' : 'Ajouter le type de vaccin'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vaccine Types List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-primary" />
                Types de vaccins configurés ({vaccineTypes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingVaccineTypes ? (
                <div className="text-center p-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="mt-2 text-gray-600">Chargement des types de vaccins depuis la blockchain...</p>
                </div>
              ) : vaccineTypes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vaccineTypes.map((vaccineType) => (
                    <div key={vaccineType.typeId} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Syringe className="w-4 h-4 text-primary" />
                          <span className="font-medium">{vaccineType.name}</span>
                        </div>
                        <Badge variant="outline">
                          {vaccineType.requiredDoses} dose{vaccineType.requiredDoses > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        ID: {vaccineType.typeId.substring(0, 10)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Syringe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun type de vaccin configuré</p>
                  {canManageVaccineTypes() && (
                    <p className="text-sm text-gray-500 mt-2">
                      Ajoutez votre premier type de vaccin ci-dessus
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!canManageVaccineTypes() && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-amber-800 font-medium">Permissions requises</p>
                    <p className="text-amber-700 text-sm">
                      Vous devez avoir le rôle ADMIN_ROLE ou MEDICAL_AGENT_ROLE pour gérer les types de vaccins.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}