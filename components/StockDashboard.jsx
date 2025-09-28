'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { Package, AlertTriangle, Plus, Minus, ChevronLeft, ChevronRight, ArrowUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/useWallet';
import { getVaccineStockContract, getStock, addStock, removeStock, configureVaccineStock } from '@/services/contracts/vaccineStock';
import toast from 'react-hot-toast';

/**
 * Stock management dashboard component
 * @returns {JSX.Element}
 */
export default function StockDashboard() {
  const { t } = useTranslation('common');
  const { signer, isConnected } = useWallet();
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'alerts', 'configured'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [centersPerPage] = useState(6); // Nombre de centres par page
  const [centers, setCenters] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [formData, setFormData] = useState({
    centerId: '',
    vaccineType: '',
    quantity: '',
    criticalThreshold: ''
  });
  const [vaccineTypes, setVaccineTypes] = useState([]);
  const [loadingVaccineTypes, setLoadingVaccineTypes] = useState(false);

  // Test centers data
  const testCenters = ['Centre A', 'Centre B', 'Centre C', 'Centre D', 'Centre E', 'Centre F', 'Centre G', 'Centre H'];


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
      const { getVaccineStockContract, getAllCenters} = await import('@/services/contracts/vaccineStock');
      const contract = getVaccineStockContract(signer);
      const blockchainCenters = await getAllCenters(contract);
      setCenters(blockchainCenters);
      
    } catch (error) {
      console.error('Error loading centers:', error);
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
      const { getVaccineRegistryContract, getAllVaccinationTypes } = await import('@/services/contracts/vaccineRegistry');
      const contract = getVaccineRegistryContract(signer);
      const blockchainVaccineTypes = await getAllVaccinationTypes(contract);
      setVaccineTypes(blockchainVaccineTypes);
      
      // Set default vaccine type if available
      if (blockchainVaccineTypes.length > 0 && !formData.vaccineType) {
        setFormData(prev => ({ ...prev, vaccineType: blockchainVaccineTypes[0].name }));
      }
    } catch (error) {
      console.error('Error loading vaccine types:', error);
      setVaccineTypes([]);
    } finally {
      setLoadingVaccineTypes(false);
    }
  };

  /**
   * Fetch stock data for a specific center and vaccine type
   */
  const fetchStock = async (centerId, vaccineType) => {
    if (!signer) return;

    try {
      const contract = getVaccineStockContract(signer);
      const stock = await getStock(contract, centerId, vaccineType);
      
      setStockData(prev => ({
        ...prev,
        [`${centerId}_${vaccineType}`]: stock
      }));
    } catch (error) {
      console.error('Error fetching stock:', error);
    }
  };

  /**
   * Get center statistics for sorting
   */
  const getCenterStats = (center) => {
    const stocks = vaccineTypes.map(type => stockData[`${center}_${type.name || type}`]).filter(Boolean);
    const configuredCount = stocks.length;
    const alertsCount = stocks.filter(stock => stock.currentQuantity <= stock.criticalThreshold).length;
    
    return {
      configured: configuredCount,
      alerts: alertsCount,
      totalStock: stocks.reduce((sum, stock) => sum + stock.currentQuantity, 0)
    };
  };

  /**
   * Filter and sort centers
   */
  const getFilteredAndSortedCenters = () => {
    let filtered = centers.filter(center =>
      center.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const statsA = getCenterStats(a);
      const statsB = getCenterStats(b);
      
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.localeCompare(b);
          break;
        case 'alerts':
          comparison = statsA.alerts - statsB.alerts;
          break;
        case 'configured':
          comparison = statsA.configured - statsB.configured;
          break;
        case 'stock':
          comparison = statsA.totalStock - statsB.totalStock;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  /**
   * Get paginated centers
   */
  const getPaginatedCenters = () => {
    const filtered = getFilteredAndSortedCenters();
    const startIndex = (currentPage - 1) * centersPerPage;
    const endIndex = startIndex + centersPerPage;
    
    return {
      centers: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / centersPerPage),
      totalCenters: filtered.length
    };
  };

  /**
   * Handle sort change
   */
  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  /**
   * Configure vaccine stock for a center
   */
  const handleConfigureStock = async () => {
    if (!signer || !formData.centerId || !formData.vaccineType) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineStockContract(signer);
      await configureVaccineStock(
        contract,
        formData.centerId,
        formData.vaccineType,
        parseInt(formData.quantity) || 0,
        parseInt(formData.criticalThreshold) || 10
      );
      
      toast.success('Stock de vaccin configuré avec succès');
      await fetchStock(formData.centerId, formData.vaccineType);
      
      setFormData({
        centerId: '',
        vaccineType: 'MPOX',
        quantity: '',
        criticalThreshold: ''
      });
    } catch (error) {
      console.error('Error configuring stock:', error);
      toast.error('Échec de la configuration du stock: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add stock to a center
   */
  const handleAddStock = async (centerId, vaccineType, quantity) => {
    if (!signer) return;

    setLoading(true);
    try {
      const contract = getVaccineStockContract(signer);
      await addStock(contract, centerId, vaccineType, quantity);
      
      toast.success(`${quantity} vaccins ${vaccineType} ajoutés au ${centerId}`);
      await fetchStock(centerId, vaccineType);
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Échec de l\'ajout de stock: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove stock from a center
   */
  const handleRemoveStock = async (centerId, vaccineType, quantity) => {
    if (!signer) return;

    setLoading(true);
    try {
      const contract = getVaccineStockContract(signer);
      await removeStock(contract, centerId, vaccineType, quantity);
      
      toast.success(`${quantity} vaccins ${vaccineType} retirés du ${centerId}`);
      await fetchStock(centerId, vaccineType);
    } catch (error) {
      console.error('Error removing stock:', error);
      toast.error('Échec du retrait de stock: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Load initial stock data
  useEffect(() => {
    if (!isConnected || !signer) {
      // Reset data when disconnected
      setStockData({});
      setCurrentPage(1);
      setSearchTerm('');
      setVaccineTypes([]);
      setCenters([]); 
      return;
    }
    
    // Load data when connected
    if (isConnected && signer) {
      loadVaccineTypes();
      loadCenters();
    }
  }, [isConnected, signer]);

  // Load stock data when vaccine types are loaded
  useEffect(() => {
    if (vaccineTypes.length > 0 && signer) {
      centers.forEach(center => {
        vaccineTypes.forEach(type => {
          fetchStock(center, type.name);
        });
      });
    }
  }, [vaccineTypes, signer]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">
          Veuillez connecter votre portefeuille pour accéder à la gestion des stocks
        </p>
      </div>
    );
  }

  const { centers: paginatedCenters, totalPages, totalCenters } = getPaginatedCenters();

  return (
    <div className="space-y-6">
      {/* Configuration du stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Configuration des stocks de vaccins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="centerId">Centre médical</Label>
              <select
                id="centerId"
                value={formData.centerId}
                onChange={(e) => setFormData({ ...formData, centerId: e.target.value })}
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Sélectionner un centre</option>
                {centers.map(center => (
                  <option key={center} value={center}>{center}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="vaccineType">Type de vaccin</Label>
              {loadingVaccineTypes ? (
                <div className="flex items-center gap-2 mt-1 p-2 border rounded-md">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-gray-600">Chargement des types de vaccins...</span>
                </div>
              ) : (
                <select
                  id="vaccineType"
                  value={formData.vaccineType}
                  onChange={(e) => setFormData({ ...formData, vaccineType: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner un type de vaccin</option>
                  {vaccineTypes.map(type => (
                    <option key={type.name || type} value={type.name || type}>{type.name || type}</option>
                  ))}
                </select>
              )}
              {vaccineTypes.length === 0 && !loadingVaccineTypes && (
                <p className="text-xs text-amber-600 mt-1">
                  Aucun type de vaccin configuré. Ajoutez-en un dans la section Patients.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Stock initial</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="threshold">Seuil d'alerte</Label>
              <Input
                id="threshold"
                type="number"
                value={formData.criticalThreshold}
                onChange={(e) => setFormData({ ...formData, criticalThreshold: e.target.value })}
                placeholder="10"
              />
            </div>
          </div>

          <Button
            onClick={handleConfigureStock}
            disabled={loading || !formData.vaccineType || loadingVaccineTypes}
            className="bg-button hover:bg-primaryDark text-white"
          >
            {loading ? 'Configuration en cours...' : 'Configurer le stock de vaccin'}
          </Button>
        </CardContent>
      </Card>

      {/* Recherche et tri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Centres médicaux ({totalCenters})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Recherche */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un centre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Tri */}
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('name')}
                className="flex items-center gap-1"
              >
                Nom
                <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant={sortBy === 'alerts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('alerts')}
                className="flex items-center gap-1"
              >
                Alertes
                <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant={sortBy === 'configured' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('configured')}
                className="flex items-center gap-1"
              >
                Configurés
                <ArrowUpDown className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des centres */}
      <div className="space-y-6">
        {paginatedCenters.map(center => {
          const stats = getCenterStats(center);
          
          return (
            <Card key={center} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-lg">{center}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {stats.alerts > 0 && (
                      <div className="flex items-center gap-1 text-alert">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">{stats.alerts} alerte{stats.alerts > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {stats.configured}/{vaccineTypes.length} configurés
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-y divide-gray-200">
                  {vaccineTypes.map(vaccineType => {
                    const stock = stockData[`${center}_${vaccineType.name || vaccineType}`];
                    const isCritical = stock && stock.currentQuantity <= stock.criticalThreshold;

                    return (
                      <div key={`${center}_${vaccineType.name || vaccineType}`} className={`p-4 ${isCritical ? 'bg-red-50' : 'bg-white hover:bg-gray-50'} transition-colors`}>
                        <div className="space-y-3">
                          {/* En-tête du vaccin */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm text-gray-900">{vaccineType.name || vaccineType}</h4>
                              {stock && (
                                <div className="flex items-center gap-1 mt-1">
                                  {isCritical && <AlertTriangle className="w-3 h-3 text-alert" />}
                                  <span className={`text-xs ${isCritical ? 'text-alert' : 'text-gray-600'}`}>
                                    {isCritical ? 'Stock critique' : 'Stock normal'}
                                  </span>
                                </div>
                              )}
                            </div>
                            {stock && (
                              <div className="text-right">
                                <div className={`text-lg font-bold ${isCritical ? 'text-alert' : 'text-primary'}`}>
                                  {stock.currentQuantity}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Seuil: {stock.criticalThreshold}
                                </div>
                              </div>
                            )}
                          </div>

                          {stock ? (
                            <>
                              {/* Barre de progression du stock */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>Niveau de stock</span>
                                  <span>{Math.round((stock.currentQuantity / Math.max(stock.criticalThreshold * 3, stock.currentQuantity)) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${
                                      isCritical ? 'bg-red-500' : 
                                      stock.currentQuantity <= stock.criticalThreshold * 2 ? 'bg-yellow-500' : 
                                      'bg-green-500'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(100, (stock.currentQuantity / Math.max(stock.criticalThreshold * 3, stock.currentQuantity)) * 100)}%` 
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Actions rapides */}
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddStock(center, vaccineType.name || vaccineType, 10)}
                                  disabled={loading}
                                  className="flex-1 h-7 text-xs"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Ajouter 10
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveStock(center, vaccineType.name || vaccineType, 1)}
                                  disabled={loading || stock.currentQuantity === 0}
                                  className="flex-1 h-7 text-xs"
                                >
                                  <Minus className="w-3 h-3 mr-1" />
                                  Retirer 1
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <div className="text-gray-400 text-xs mb-2">Non configuré</div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setFormData({
                                  ...formData,
                                  centerId: center,
                                  vaccineType: vaccineType.name || vaccineType,
                                  quantity: '50',
                                  criticalThreshold: '10'
                                })}
                                className="h-6 text-xs text-primary hover:text-primary/80"
                              >
                                Configurer maintenant
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages} ({totalCenters} centres au total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
                
                {/* Numéros de page */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {paginatedCenters.length === 0 && (
        <Card>
          <CardContent className="text-center p-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'Aucun centre trouvé pour cette recherche' : 'Aucun centre disponible'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}