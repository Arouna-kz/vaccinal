// hooks/useDashboardData.ts (version complète)
import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';
import { 
  getVaccineStockContract, 
  getAllCenters,
  getStock 
} from '@/services/contracts/vaccineStock';
import { 
  getVaccineRegistryContract, 
  getAllPatients,
  getAllVaccinationTypes,
  getPatientVaccinationStatus
} from '@/services/contracts/vaccineRegistry';
import { ethers } from 'ethers';

export interface DashboardData {
  totalCenters: number;
  totalPatients: number;
  totalDoses: number;
  totalStocks: number;
  loading: boolean;
  error: string | null;
}

export function useDashboardData() {
  const { isConnected, signer } = useWallet();
  const [data, setData] = useState<DashboardData>({
    totalCenters: 0,
    totalPatients: 0,
    totalDoses: 0,
    totalStocks: 0,
    loading: false,
    error: null
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isConnected || !signer) {
        setData(prev => ({ ...prev, loading: false }));
        return;
      }

      setData(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Récupérer les centres
        const stockContract = getVaccineStockContract(signer);
        const centers = await getAllCenters(stockContract);
        
        // Récupérer les patients
        const registryContract = getVaccineRegistryContract(signer);
        const patients = await getAllPatients(registryContract);

        // Récupérer les types de vaccins
        const vaccineTypes = await getAllVaccinationTypes(registryContract);

        // Calculer le total des doses
        let totalDoses = 0;
        for (const patient of patients) {
          for (const vaccineType of vaccineTypes) {
            try {
              const status = await getPatientVaccinationStatus(
                registryContract, 
                patient.uniquePatientCode, 
                vaccineType.name
              );
              totalDoses += status.administeredDoses.length;
            } catch (error) {
              // Ignorer les erreurs pour les vaccins non administrés
              continue;
            }
          }
        }

        // Calculer le total des stocks
        let totalStocks = 0;
        for (const center of centers) {
          for (const vaccineType of vaccineTypes) {
            try {
              const stock = await getStock(stockContract, center, vaccineType.name);
              if (stock && stock.currentQuantity) {
                totalStocks += stock.currentQuantity;
              }
            } catch (error) {
              // Ignorer les erreurs pour les stocks non configurés
              continue;
            }
          }
        }

        setData({
          totalCenters: centers.length,
          totalPatients: patients.length,
          totalDoses,
          totalStocks,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Erreur lors du chargement des données'
        }));
      }
    }

    fetchDashboardData();

    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [isConnected, signer]);

  return data;
}