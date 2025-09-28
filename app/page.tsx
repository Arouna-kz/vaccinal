'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Users, 
  Package, 
  Coins,
  FileText,
  Upload,
  Vote,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WalletConnectButton from '@/components/WalletConnectButton';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import RoleBasedContent from '@/components/RoleBasedContent';
import StockDashboard from '@/components/StockDashboard';
import VaccineTokenBalance from '@/components/VaccineTokenBalance';
import VaccineRegistryForm from '@/components/VaccineRegistryForm';
import MetadataUpload from '@/components/MetadataUpload';
import RoleManagement from '@/components/RoleManagement';
import DAOGovernance from '@/components/DAOGovernance';
import ContractManagement from '@/components/ContractManagement';
import ConfigurationManagement from '@/components/ConfigurationManagement';
import { useWallet } from '@/hooks/useWallet';
import { useVGOVBalance } from '@/hooks/useVGOVBalance';

// Interfaces au niveau du module
interface WalletState {
  isConnected: boolean;
  address: string;
  provider: any;
  signer: any;
  network: any;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  formattedAddress: string;
}

interface VGOVBalanceState {
  formattedBalance: string;
  balance: string;
  isLoading: boolean;
}

// Hook pour la traduction simple
export function useSimpleTranslation() {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedLanguage = localStorage.getItem('selectedLanguage') as 'fr' | 'en' || 'fr';
    setLanguage(savedLanguage);
  }, []);

  // const [language, setLanguage] = useState('fr');
  // const [isClient, setIsClient] = useState(false);

  // useEffect(() => {
  //   setIsClient(true);
  //   const savedLanguage = localStorage.getItem('selectedLanguage') || 'fr';
  //   setLanguage(savedLanguage);
  // }, []);

  const translations = {
    fr: {
      title: 'Registre Vaccinal Blockchain',
      subtitle: 'Système de gestion des vaccins décentralisé et sécurisé',
      connectWallet: 'Connectez votre portefeuille MetaMask pour commencer',
      dashboard: 'Tableau de bord',
      stocks: 'Gestion des stocks',
      patients: 'Patients',
      tokens: 'Jetons VGOV',
      dao: 'Gouvernance DAO',
      contracts: 'Gestion Contrats',
      stocksCard: 'Stocks',
      centersActive: 'Centres actifs',
      patientsCard: 'Patients',
      registered: 'Enregistrés',
      doses: 'Doses',
      administered: 'Administrées',
      tokensCard: 'Jetons VGOV',
      inCirculation: 'En circulation',
      availableFeatures: 'Fonctionnalités disponibles',
      stockManagement: 'Gestion des stocks de vaccins',
      patientRegistration: 'Enregistrement des patients',
      nftCertification: 'Certification NFT des vaccinations',
      ipfsStorage: 'Stockage IPFS des métadonnées',
      govTokens: 'Jetons de gouvernance VGOV',
      daoGovernance: 'Gouvernance DAO décentralisée',
      userRoles: 'Rôles utilisateur',
      medicalAgent: 'Agent Médical',
      medicalAgentDesc: 'Enregistrement des patients, administration des doses, déclaration des MAPI',
      centerAdmin: 'Administrateur Centre',
      centerAdminDesc: 'Gestion des centres, configuration des types de vaccins',
      logisticManager: 'Gestionnaire Logistique',
      logisticManagerDesc: 'Gestion des stocks, ajout/retrait de vaccins, alertes de seuil',
      daoMember: 'Membre DAO',
      daoMemberDesc: 'Participation aux votes, propositions de gouvernance',
      daoInDevelopment: 'Fonctionnalité de gouvernance DAO en développement'
    },
    en: {
      title: 'Blockchain Vaccine Registry',
      subtitle: 'Decentralized and secure vaccine management system',
      connectWallet: 'Connect your MetaMask wallet to get started',
      dashboard: 'Dashboard',
      stocks: 'Stock Management',
      patients: 'Patients',
      tokens: 'VGOV Tokens',
      dao: 'DAO Governance',
      contracts: 'Contract Management',
      stocksCard: 'Stocks',
      centersActive: 'Active centers',
      patientsCard: 'Patients',
      registered: 'Registered',
      doses: 'Doses',
      administered: 'Administered',
      tokensCard: 'VGOV Tokens',
      inCirculation: 'In circulation',
      availableFeatures: 'Available features',
      stockManagement: 'Vaccine stock management',
      patientRegistration: 'Patient registration',
      nftCertification: 'NFT vaccination certification',
      ipfsStorage: 'IPFS metadata storage',
      govTokens: 'VGOV governance tokens',
      daoGovernance: 'Decentralized DAO governance',
      userRoles: 'User roles',
      medicalAgent: 'Medical Agent',
      medicalAgentDesc: 'Patient registration, dose administration, AEFI reporting',
      centerAdmin: 'Center Administrator',
      centerAdminDesc: 'Center management, vaccine type configuration',
      logisticManager: 'Logistic Manager',
      logisticManagerDesc: 'Stock management, vaccine addition/removal, threshold alerts',
      daoMember: 'DAO Member',
      daoMemberDesc: 'Voting participation, governance proposals',
      daoInDevelopment: 'DAO governance functionality in development'
    }
  };

  type TranslationKey = keyof typeof translations.fr;

  const t = (key: TranslationKey) => translations[language]?.[key] || key;
  // const t = (key: string) => translations[language]?.[key] || key;

  return { t, language, setLanguage, isClient };
}

export default function Home() {
  const { isConnected, isInitialized } = useWallet();
  const { t, language, setLanguage } = useSimpleTranslation();
  const { formattedBalance } = useVGOVBalance() as VGOVBalanceState;
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { totalCenters, totalPatients, totalDoses, totalStocks, loading, error } = useDashboardData();

   useEffect(() => {
    setMounted(true);
  }, []);

  // Réinitialiser au dashboard lors de la déconnexion
  useEffect(() => {
  if (mounted && !isConnected) {
    setSidebarOpen(false);
    // On supprime la ligne setActiveSection('dashboard') qui est inutile.
  }
}, [mounted, isConnected]);

  // useEffect(() => {
  //   if (mounted && !isConnected) {
  //     setActiveSection('dashboard');
  //     setSidebarOpen(false);
  //   }
  // }, [mounted, isConnected]);

 



  // Écouter les événements de connexion/déconnexion pour forcer le rafraîchissement
  useEffect(() => {
    const handleWalletConnected = () => {
      // Forcer le rafraîchissement des données
      window.location.reload();
    };

    const handleWalletDisconnected = () => {
      // Forcer le rafraîchissement des données
      window.location.reload();
    };

    window.addEventListener('walletConnected', handleWalletConnected);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);

    return () => {
      window.removeEventListener('walletConnected', handleWalletConnected);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected);
    };
  }, []);
  

  // Écouter les changements de langue depuis localStorage - CORRIGÉ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleStorageChange = () => {
        const newLanguage = localStorage.getItem('selectedLanguage') || 'fr';
        setLanguage(newLanguage);
      };
      
      window.addEventListener('storage', handleStorageChange);
      const interval = setInterval(handleStorageChange, 1000);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
  }, [setLanguage]);


  if (!mounted || !isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-textPrimary">Loading...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: Activity },
    { id: 'stocks', label: t('stocks'), icon: Package },
    { id: 'patients', label: t('patients'), icon: Users },
    { id: 'tokens', label: t('tokens'), icon: Coins },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'contracts', label: t('contracts'), icon: Settings },
    { id: 'dao', label: t('dao'), icon: Vote },
  ];

  const accessDeniedFallback = (
    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <Shield className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
      <p className="text-yellow-700 font-medium">
        {language === 'en' ? 'Access Denied' : 'Accès non autorisé'}
      </p>
      <p className="text-yellow-600 text-sm">
        {language === 'en' 
          ? 'You do not have the required permissions to access this section.'
          : 'Vous n\'avez pas les permissions nécessaires pour accéder à cette section.'
        }
      </p>
    </div>
  );

  const renderActiveSection = () => {
    // Afficher seulement le dashboard si déconnecté
    if (!isConnected) {
      return (
        <div className="space-y-6">
          <div className="text-center bg-gradient-to-r from-primary/10 to-primaryDark/10 rounded-lg p-8">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-textPrimary mb-2">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              {t('subtitle')}
            </p>
            <div className="bg-white/80 rounded-lg p-6 inline-block">
              <p className="text-gray-700 mb-4">
                {t('connectWallet')}
              </p>
              <WalletConnectButton />
            </div>
          </div>
        </div>
      );
    }

    // Sections accessibles seulement quand connecté
    switch (activeSection) {
      case 'stocks':
        return (
          <RoleBasedContent 
            allowedRoles={['LOGISTIC_MANAGER_ROLE']}
            fallback={accessDeniedFallback}
          >
            <StockDashboard />
          </RoleBasedContent>
        );
      case 'patients':
        return (
          <RoleBasedContent 
            allowedRoles={['MEDICAL_AGENT_ROLE']}
            fallback={accessDeniedFallback}
          >
            <VaccineRegistryForm />
          </RoleBasedContent>
        );
      case 'tokens':
        return <VaccineTokenBalance />;
      case 'metadata':
        return (
          <RoleBasedContent 
            allowedRoles={['MEDICAL_AGENT_ROLE']}
            fallback={accessDeniedFallback}
          >
            <MetadataUpload />
          </RoleBasedContent>
        );
      case 'roles':
        return <RoleManagement />;
      case 'configuration':
        return (
          <RoleBasedContent 
            allowedRoles={['ADMIN_ROLE', 'LOGISTIC_MANAGER_ROLE']}
            fallback={accessDeniedFallback}
          >
            <ConfigurationManagement />
          </RoleBasedContent>
        );
      case 'contracts':
        return (
          <RoleBasedContent 
            allowedRoles={['ADMIN_ROLE']}
            fallback={accessDeniedFallback}
          >
            <ContractManagement />
          </RoleBasedContent>
        );
      case 'dao':
        return <DAOGovernance />;
      default:
        return (
          <div className="space-y-6">
            <div className="text-center bg-gradient-to-r from-primary/10 to-primaryDark/10 rounded-lg p-8">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-textPrimary mb-2">
                {t('title')}
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                {t('subtitle')}
              </p>
              {!isConnected && (
                <div className="bg-white/80 rounded-lg p-6 inline-block">
                  <p className="text-gray-700 mb-4">
                    {t('connectWallet')}
                  </p>
                  <WalletConnectButton />
                </div>
              )}
            </div>

            {isConnected && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <Card className="bg-gradient-to-br from-primary to-primaryDark text-white">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            {t('stocksCard')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">{totalStocks}</p>
                          <p className="text-sm opacity-90">{t('centersActive')}: {totalCenters}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            {t('patientsCard')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-textPrimary">{totalPatients}</p>
                          <p className="text-sm text-gray-600">{t('registered')}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {t('doses')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-textPrimary">{totalDoses}</p>
                          <p className="text-sm text-gray-600">{t('administered')}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Coins className="w-5 h-5 text-primary" />
                            {t('tokensCard')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-textPrimary">{formattedBalance}</p>
                          <p className="text-sm text-gray-600">{t('inCirculation')}</p>
                        </CardContent>
                      </Card>
                    </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('availableFeatures')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-primary" />
                          <span>{t('stockManagement')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-primary" />
                          <span>{t('patientRegistration')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <span>{t('nftCertification')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Upload className="w-5 h-5 text-primary" />
                          <span>{t('ipfsStorage')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Coins className="w-5 h-5 text-primary" />
                          <span>{t('govTokens')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Vote className="w-5 h-5 text-primary" />
                          <span>{t('daoGovernance')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('userRoles')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-primary">{t('medicalAgent')}</h4>
                          <p className="text-sm text-gray-600">
                            {t('medicalAgentDesc')}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-primary">{t('centerAdmin')}</h4>
                          <p className="text-sm text-gray-600">
                            {t('centerAdminDesc')}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-primary">{t('logisticManager')}</h4>
                          <p className="text-sm text-gray-600">
                            {t('logisticManagerDesc')}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-primary">{t('daoMember')}</h4>
                          <p className="text-sm text-gray-600">
                            {t('daoMemberDesc')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        );
    }
  };

return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-bold text-textPrimary">
                {language === 'en' ? 'Vaccine Registry' : 'Registre Vaccinal'}
              </h1>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              <WalletConnectButton />
            </div>

            <div className="md:hidden flex items-center gap-2">
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="space-y-6">
            <div className="text-center bg-gradient-to-r from-primary/10 to-primaryDark/10 rounded-lg p-8">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-textPrimary mb-2">
                {t('title')}
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                {t('subtitle')}
              </p>
              <div className="bg-white/80 rounded-lg p-6 inline-block">
                <p className="text-gray-700 mb-4">
                  {t('connectWallet')}
                </p>
                <WalletConnectButton />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex">
            {/* Sidebar Overlay for mobile */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div className={`
              fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
              transform transition-transform duration-300 ease-in-out md:transform-none
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
              <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
                  <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary" />
                    <span className="font-semibold text-textPrimary">Menu</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant={activeSection === item.id ? 'default' : 'ghost'}
                        className={`w-full justify-start ${
                          activeSection === item.id
                            ? 'bg-primary text-white hover:bg-primaryDark'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setActiveSection(item.id);
                          setSidebarOpen(false); // Close sidebar on mobile after selection
                        }}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </Button>
                    );
                  })}
                </nav>

                {/* Sidebar Footer - Wallet info on mobile */}
                <div className="p-4 border-t border-gray-200 md:hidden">
                  <WalletConnectButton />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 md:ml-0 min-h-screen">
              {/* Page content */}
              {renderActiveSection()}
            </div>
          </div>
        )}

        {!isConnected && renderActiveSection()}
      </div>
    </div>
  );
}