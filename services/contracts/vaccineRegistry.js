import { ethers } from 'ethers';
import { getContract } from '../blockchain';
import VaccineRegistryABI from '../../abi/VaccineRegistry.json';
import { getJSONFromIPFS } from '@/services/pinata';

/**
 * @fileoverview VaccineRegistry contract interactions
 * @description Service for managing patient registration and vaccination records
 */

/**
 * Get VaccineRegistry contract instance
 * @param {ethers.Signer} signer 
 * @returns {ethers.Contract}
 */
export function getVaccineRegistryContract(signer) {
  const address = process.env.NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS;
  return getContract(address, VaccineRegistryABI, signer);
}

/**
 * Add a new vaccination type
 * @param {ethers.Contract} contract 
 * @param {string} name 
 * @param {number} requiredDoses 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function addVaccinationType(contract, name, requiredDoses) {
  try {
    const tx = await contract.addVaccinationType(name, requiredDoses);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error adding vaccination type:', error);
    throw error;
  }
}

/**
 * Register a new patient
 * @param {ethers.Contract} contract 
 * @param {string} patientAddress 
 * @param {string} uniquePatientCode 
 * @param {string} professionalCategory 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function registerPatient(contract, patientAddress, uniquePatientCode, professionalCategory) {
  try {
    console.log('Checking if patient exists:', uniquePatientCode);
    const exists = await checkPatientExists(contract, uniquePatientCode);
    
    if (exists) {
      throw new Error(`Patient ${uniquePatientCode} already registered`);
    }

    console.log('Registering new patient:', uniquePatientCode);
    const tx = await contract.registerPatient(
      patientAddress, 
      uniquePatientCode, 
      professionalCategory
    );
    
    console.log('Transaction sent, waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('Patient registered successfully:', receipt.transactionHash);
    
    return tx;
  } catch (error) {
    console.error('Error in registerPatient:', error);
    
    // Enhanced error messages
    if (error.message.includes('already registered')) {
      throw error; // Already handled
    } else if (error.message.includes('PAT-A1') || error.reason === 'PAT-A1') {
      throw new Error(`Patient code ${uniquePatientCode} is invalid or already exists`);
    } else if (error.message.includes('AccessControl')) {
      throw new Error('Permission denied: Your account cannot register patients');
    } else if (error.message.includes('reverted')) {
      throw new Error('Transaction failed: Please check patient data and permissions');
    }
    
    throw new Error(`Failed to register patient: ${error.message}`);
  }
}

/**
 * Check if a patient already exists
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @returns {Promise<boolean>}
 */
export async function checkPatientExists(contract, uniquePatientCode) {
  try {
    const patientInfo = await contract.getPatientInfo(uniquePatientCode);
    return patientInfo.exists;
  } catch (error) {
    if (error.message.includes('PatientNotFound') || error.errorName === 'PatientNotFound') {
      return false;
    }
    console.error('Error checking patient existence:', error);
    throw error;
  }
}

/**
 * Check if a vaccination type exists
 * @param {ethers.Contract} contract 
 * @param {string} vaccineType 
 * @returns {Promise<boolean>}
 */
export async function checkVaccinationTypeExists(contract, vaccineType) {
  try {
    // Remplacer formatBytes32String par keccak256
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    
    const typeInfo = await contract.getVaccinationTypeInfo(vaccinationTypeId);
    return typeInfo.exists;
  } catch (error) {
    if (error.message.includes('VaccinationTypeNotFound') || error.errorName === 'VaccinationTypeNotFound') {
      return false;
    }
    console.error('Error checking vaccination type existence:', error);
    
    // Gestion spécifique de l'erreur "bad result from backend"
    if (error.message.includes('bad result from backend') || error.code === 'SERVER_ERROR') {
      console.warn('Backend error, assuming vaccination type does not exist');
      return false;
    }
    
    throw error;
  }
}


// export async function checkVaccinationTypeExists(contract, vaccineType) {
//   try {
//     const vaccineTypeBytes32 = ethers.utils.formatBytes32String(vaccineType);
//     const typeInfo = await contract.getVaccinationTypeInfo(vaccineTypeBytes32);
//     return typeInfo.exists;
//   } catch (error) {
//     if (error.message.includes('VaccinationTypeNotFound') || error.errorName === 'VaccinationTypeNotFound') {
//       return false;
//     }
//     console.error('Error checking vaccination type existence:', error);
//     throw error;
//   }
// }

/**
 * Register a vaccination dose
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @param {string} vaccineType 
 * @param {string} centerId 
 * @param {string} batchNumber 
 * @param {string} metadataURI 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function registerDose(contract, uniquePatientCode, vaccineType, centerId, batchNumber, metadataURI) {
  try {

    // // 6. Encoder le type de vaccin (format cohérent)
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));

    // 8. Appeler la fonction réelle
    const tx = await contract.registerDose(
      uniquePatientCode,
      vaccinationTypeId, 
      centerId,
      batchNumber,
      metadataURI || '',
      { gasLimit: 500000 }
    );
    
    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.transactionHash);
    
    return tx;
  } catch (error) {
    console.error('Error in registerDose:', error);
    
    // Messages d'erreur spécifiques
    if (error.code === 'CALL_EXCEPTION') {
      if (error.receipt && error.receipt.status === 0) {
        let errorMessage = 'Transaction failed. ';
        
        if (error.errorName) errorMessage += `Error: ${error.errorName}. `;
        if (error.reason) errorMessage += `Reason: ${error.reason}. `;
        
        errorMessage += 'Possible causes: insufficient stock, invalid parameters, or permission issues.';
        throw new Error(errorMessage);
      }
    }
    
    // Gestion des erreurs spécifiques
    if (error.message.includes('VaccinationTypeNotFound')) {
      throw new Error(`Vaccine type ${vaccineType} not found. Please add it first.`);
    } else if (error.message.includes('InsufficientStock')) {
      throw new Error(`Insufficient stock for ${vaccineType} at center ${centerId}`);
    } else if (error.message.includes('VaccinationAlreadyComplete')) {
      throw new Error(`Patient ${uniquePatientCode} has already completed the ${vaccineType} vaccination scheme`);
    } else if (error.message.includes('DoseNumberExceedsRequirement')) {
      throw new Error(`Cannot register more doses than required for ${vaccineType}`);
    } else if (error.message.includes('MEDICAL_AGENT_ROLE')) {
      throw new Error('Permission denied: MEDICAL_AGENT_ROLE required');
    } else if (error.message.includes('PatientNotFound')) {
      throw new Error(`Patient ${uniquePatientCode} not found`);
    }
    
    throw new Error(`Failed to register dose: ${error.message}`);
  }
}


// export async function registerDose(contract, uniquePatientCode, vaccineType, centerId, batchNumber, metadataURI) {
//   try {
//     console.log('Starting dose registration with parameters:');
//     console.log('uniquePatientCode:', uniquePatientCode);
//     console.log('vaccineType:', vaccineType);
//     console.log('centerId:', centerId);
//     console.log('batchNumber:', batchNumber);
//     console.log('metadataURI:', metadataURI || '');

//     // Vérifier d'abord si le patient existe
//     const patientExists = await checkPatientExists(contract, uniquePatientCode);
//     if (!patientExists) {
//       throw new Error(`Patient with code ${uniquePatientCode} does not exist. Register the patient first.`);
//     }
//     console.log('✓ Patient exists');

//     // Vérifier si le type de vaccin existe
//     const vaccineTypeExists = await checkVaccinationTypeExists(contract, vaccineType);
//     if (!vaccineTypeExists) {
//       throw new Error(`Vaccine type ${vaccineType} does not exist. Add it first in the vaccine types tab.`);
//     }
//     console.log('✓ Vaccine type exists');

//     // Vérifier le statut de vaccination actuel
//     const vaccinationStatus = await getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType);
//     console.log('Current vaccination status:', vaccinationStatus);
    
//     // Vérifier si la vaccination est déjà complète
//     if (vaccinationStatus.isComplete) {
//       throw new Error(`Patient ${uniquePatientCode} has already completed the ${vaccineType} vaccination scheme`);
//     }

//     // Encoder le type de vaccin
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
//     console.log('Vaccination type ID:', vaccinationTypeId);

//     // Appeler la fonction avec un gas limit plus élevé
//     const tx = await contract.registerDose(
//       uniquePatientCode,
//       vaccinationTypeId, 
//       centerId,
//       batchNumber,
//       metadataURI || '',
//       {
//         gasLimit: 500000  // Augmenter le gas limit
//       }
//     );
    
//     console.log('Transaction sent:', tx.hash);
//     const receipt = await tx.wait();
//     console.log('Transaction confirmed:', receipt.transactionHash);
    
//     return tx;
//   } catch (error) {
//     console.error('Error in registerDose:', error);
    
//     // Messages d'erreur spécifiques
//     if (error.code === 'CALL_EXCEPTION') {
//       // La transaction a été minee mais a échoué
//       if (error.receipt && error.receipt.status === 0) {
//         throw new Error('Transaction executed but failed. Possible reasons: insufficient stock, invalid parameters, or access denied.');
//       }
//     }
    
//     if (error.message.includes('VaccinationTypeNotFound')) {
//       throw new Error(`Vaccine type ${vaccineType} not found. Please add it first.`);
//     } else if (error.message.includes('InsufficientStock')) {
//       throw new Error(`Insufficient stock for ${vaccineType} at center ${centerId}`);
//     } else if (error.message.includes('VaccinationAlreadyComplete')) {
//       throw new Error(`Patient ${uniquePatientCode} has already completed the ${vaccineType} vaccination scheme`);
//     } else if (error.message.includes('DoseNumberExceedsRequirement')) {
//       throw new Error(`Cannot register more doses than required for ${vaccineType}`);
//     }
    
//     throw new Error(`Failed to register dose: ${error.message}`);
//   }
// }


// **************************************************************************************************************

export async function checkMedicalAgentRole(contract, address = null) {
  try {
    const signerAddress = address || await contract.signer.getAddress();
    const MEDICAL_AGENT_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MEDICAL_AGENT_ROLE"));
    
    return await contract.hasRole(MEDICAL_AGENT_ROLE, signerAddress);
  } catch (error) {
    console.error('Error checking medical agent role:', error);
    return false;
  }
}

export async function checkVaccineStock(contract, centerId, vaccineType) {
  try {
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    
    // Importer dynamiquement pour éviter les dépendances circulaires
    const { getVaccineStockContract, getStock } = await import('@/services/contracts/vaccineStock');
    
    const stockContract = getVaccineStockContract(contract.signer);
    const stockResult = await getStock(stockContract, centerId, vaccinationTypeId);
    
    console.log('Stock check result:', { centerId, vaccineType, stockResult });
    
    // Vérifier si le stock existe et retourner la quantité actuelle
    if (stockResult && typeof stockResult === 'object' && 'currentQuantity' in stockResult) {
      return stockResult.currentQuantity;
    }
    
    // Si le stock n'est pas configuré ou format invalide
    return 0;
  } catch (error) {
    console.error('Error checking vaccine stock:', error);
    return 0;
  }
}

// export async function checkVaccineStock(contract, centerId, vaccineType) {
//   try {
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    
//     // Importer dynamiquement pour éviter les dépendances circulaires
//     const { getVaccineStockContract, getStock } = await import('@/services/contracts/vaccineStock');
    
//     const stockContract = getVaccineStockContract(contract.signer);
//     const stock = await getStock(stockContract, centerId, vaccinationTypeId);
    
//     return stock.toNumber();
//   } catch (error) {
//     console.error('Error checking vaccine stock:', error);
//     return 0;
//   }
// }


/**
 * Get token metadata URI for a specific certificate
 * @param {ethers.Contract} contract 
 * @param {number} tokenId 
 * @returns {Promise<string>}
 */
export async function getCertificateMetadataURI(contract, tokenId) {
  try {
    const tokenURI = await contract.tokenURI(tokenId);
    return tokenURI;
  } catch (error) {
    console.error('Error getting certificate metadata URI:', error);
    throw error;
  }
}

// **************************************************************************************************************

/**
 * Declare a MAPI (adverse event)
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @param {string} description 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function declareMAPI(contract, uniquePatientCode, description) {
  try {
    const tx = await contract.declareMAPI(uniquePatientCode, description);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error declaring MAPI:', error);
    throw error;
  }
}

/**
 * Get patient information
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @returns {Promise<Object>}
 */
export async function getPatientInfo(contract, uniquePatientCode) {
  try {
    const patientInfo = await contract.getPatientInfo(uniquePatientCode);
    return {
      patientId: patientInfo.patientId.toNumber(),
      patientAddress: patientInfo.patientAddress,
      uniquePatientCode: patientInfo.uniquePatientCode,
      professionalCategory: patientInfo.professionalCategory,
      exists: patientInfo.exists
    };
  } catch (error) {
    console.error('Error getting patient info:', error);
    throw error;
  }
}

/**
 * Get patient vaccination status
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @param {string} vaccineType 
 * @returns {Promise<Object>}
 */
/**
 * Get patient vaccination status
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @param {string} vaccineType 
 * @returns {Promise<Object>}
 */
export async function getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType) {
  try {
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    console.log('🔍 [getPatientVaccinationStatus] Appel avec:', { uniquePatientCode, vaccinationTypeId });

    // Appel de la fonction du smart contrat
    const status = await contract.getPatientVaccinationStatus(uniquePatientCode, vaccinationTypeId);
    console.log('📊 [getPatientVaccinationStatus] Réponse brute du contrat:', status);

    // ✅ CORRECTION : La structure retournée est un tableau avec 3 éléments :
    // status[0] = administeredDoses (tableau de doses)
    // status[1] = certificateTokenId (BigNumber)
    // status[2] = isComplete (booléen)

    // Extraire les données correctement
    const administeredDoses = status[0] || [];
    const doseCount = administeredDoses.length;
    const certificateTokenId = status[1] ? status[1].toNumber() : 0;
    const isComplete = Boolean(status[2]); // Convertir en booléen explicite

    console.log('✅ Données extraites:', {
      doseCount,
      administeredDosesCount: administeredDoses.length,
      certificateTokenId,
      isComplete
    });

    // Formater les doses pour l'affichage
    const formattedDoses = administeredDoses.map((dose, index) => {
      // La dose est un tableau [date, centerId, batchNumber]
      return {
        date: dose[0] ? new Date(dose[0].toNumber() * 1000).toISOString() : null,
        centerId: dose[1] || 'Inconnu',
        batchNumber: dose[2] || 'Inconnu'
      };
    });

    const result = {
      administeredDoses: formattedDoses,
      doseCount: doseCount, // ← CORRECTION CRITIQUE : bien renvoyer le count
      certificateTokenId,
      isComplete
    };

    console.log(`✅ [getPatientVaccinationStatus] Résultat final pour ${vaccineType}:`, result);
    return result;

  } catch (error) {
    console.error(`❌ [getPatientVaccinationStatus] Erreur pour ${vaccineType}:`, error);
    
    // Retourner un objet par défaut en cas d'erreur
    return {
      administeredDoses: [],
      doseCount: 0,
      certificateTokenId: 0,
      isComplete: false
    };
  }
}



// export async function getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType) {
//   try {
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
//     console.log('🔍 [getPatientVaccinationStatus] Appel avec:', { uniquePatientCode, vaccinationTypeId });

//     // Appel de la fonction du smart contrat
//     const status = await contract.getPatientVaccinationStatus(uniquePatientCode, vaccinationTypeId);
//     console.log('📊 [getPatientVaccinationStatus] Réponse brute du contrat:', status);

//     // ✅ CORRECTION : Interprétation fiable de la structure renvoyée par ethers.js
//     // La structure PatientVaccination a 3 champs :
//     // [0]: Dose[] administeredDoses
//     // [1]: uint256 certificateTokenId
//     // [2]: bool isComplete
//     // Accéder par index est plus robuste que par nom de propriété.

//     const administeredDoses = status[0] || [];
//     const doseCount = administeredDoses.length;
//     const certificateTokenId = status[1] ? status[1].toNumber() : 0;
//     const isComplete = status[2] || false;

//     const result = {
//       // Mappe les doses pour une utilisation facile en JS (ex: conversion de la date)
//       administeredDoses: administeredDoses.map(dose => ({
//         date: dose.date ? new Date(dose.date.toNumber() * 1000).toISOString() : null,
//         centerId: dose.centerId,
//         batchNumber: dose.batchNumber
//       })),
//       doseCount,
//       certificateTokenId,
//       isComplete
//     };

//     console.log(`✅ [getPatientVaccinationStatus] Statut traité pour ${vaccineType}:`, result);
//     return result;

//   } catch (error) {
//     console.error(`❌ [getPatientVaccinationStatus] Erreur pour ${vaccineType}:`, error);

//     // Renvoyer un objet par défaut valide pour éviter les crashs de l'interface
//     return {
//       administeredDoses: [],
//       doseCount: 0,
//       certificateTokenId: 0,
//       isComplete: false
//     };
//   }
// }


// export async function getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType) {
//   try {
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    
//     console.log('🔍 [getPatientVaccinationStatus] Appel avec:', {
//       uniquePatientCode,
//       vaccineType,
//       vaccinationTypeId
//     });
    
//     const status = await contract.getPatientVaccinationStatus(uniquePatientCode, vaccinationTypeId);
//     console.log('📊 [getPatientVaccinationStatus] Réponse brute:', status);
    
//     // CORRECTION CRITIQUE ICI
//     let administeredDoses = [];
//     let doseCount = 0;
    
//     // Vérifier la structure réelle des données
//     if (status && typeof status === 'object') {
//       // Méthode 1: Si administeredDoses existe et est un tableau
//       if (status.administeredDoses && Array.isArray(status.administeredDoses)) {
//         administeredDoses = status.administeredDoses;
//         doseCount = administeredDoses.length;
//       } 
//       // Méthode 2: Si c'est un nombre direct (fallback)
//       else if (status.doseCount !== undefined) {
//         doseCount = status.doseCount.toNumber ? status.doseCount.toNumber() : status.doseCount;
//         administeredDoses = Array.from({length: doseCount}, (_, i) => ({
//           date: new Date().toISOString(),
//           centerId: 'Centre inconnu',
//           batchNumber: `Lot-${i + 1}`
//         }));
//       }
      
//       console.log(`✅ [getPatientVaccinationStatus] ${doseCount} dose(s) trouvée(s) pour ${vaccineType}`);
//     }
    
//     const result = {
//       administeredDoses,
//       doseCount: doseCount, // ← CORRECTION: Toujours renvoyer doseCount
//       certificateTokenId: status?.certificateTokenId?.toNumber() || 0,
//       isComplete: status?.isComplete || false
//     };
    
//     return result;
    
//   } catch (error) {
//     console.error('❌ [getPatientVaccinationStatus] Erreur:', error);
    
//     // Retourner un objet valide même en cas d'erreur
//     return {
//       administeredDoses: [],
//       doseCount: 0,
//       certificateTokenId: 0,
//       isComplete: false
//     };
//   }
// }


// export async function getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType) {
//   try {
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    
//     console.log('Calling getPatientVaccinationStatus with:', {
//       uniquePatientCode,
//       vaccineType,
//       vaccinationTypeId
//     });
    
//     const status = await contract.getPatientVaccinationStatus(uniquePatientCode, vaccinationTypeId);
//     console.log('Raw vaccination status from blockchain:', status);
    
//     // CORRECTION IMPORTANTE : Vérifier la structure réelle des données
//     let administeredDoses = [];
//     let certificateTokenId = 0;
//     let isComplete = false;
    
//     // Vérifier la structure des données retournées
//     if (status && typeof status === 'object') {
//       // Structure 1: status.administeredDoses existe
//       if (status.administeredDoses && Array.isArray(status.administeredDoses)) {
//         administeredDoses = status.administeredDoses.map(dose => ({
//           date: dose.date ? new Date(dose.date.toNumber() * 1000).toISOString() : new Date().toISOString(),
//           centerId: dose.centerId || 'Unknown',
//           batchNumber: dose.batchNumber || 'Unknown'
//         }));
//       }
      
//       // Structure 2: Peut-être que administeredDoses est un simple nombre
//       else if (status.doseCount !== undefined) {
//         const doseCount = status.doseCount.toNumber ? status.doseCount.toNumber() : status.doseCount;
//         administeredDoses = Array.from({length: doseCount}, (_, i) => ({
//           date: new Date().toISOString(),
//           centerId: 'Unknown',
//           batchNumber: `Dose-${i + 1}`
//         }));
//       }
      
//       // Récupérer le tokenId
//       if (status.certificateTokenId !== undefined) {
//         certificateTokenId = status.certificateTokenId.toNumber ? status.certificateTokenId.toNumber() : status.certificateTokenId;
//       }
      
//       // Déterminer si c'est complet
//       if (status.isComplete !== undefined) {
//         isComplete = status.isComplete;
//       } else {
//         // Déduire du nombre de doses si isComplete n'est pas disponible
//         const requiredDoses = await getRequiredDosesForVaccine(contract, vaccineType);
//         isComplete = administeredDoses.length >= requiredDoses;
//       }
//     }
    
//     const result = {
//       administeredDoses,
//       certificateTokenId,
//       isComplete,
//       dosesCount: administeredDoses.length // Ajout explicite du compteur
//     };
    
//     console.log('Processed vaccination status:', result);
//     return result;
    
//   } catch (error) {
//     console.error('Detailed error in getPatientVaccinationStatus:', {
//       message: error.message,
//       code: error.code,
//       errorName: error.errorName,
//       reason: error.reason,
//       data: error.data
//     });
    
//     // Gestion des erreurs spécifiques
//     if (error.reason === 'VaccinationTypeNotFound' || 
//         error.errorName === 'VaccinationTypeNotFound' ||
//         (error.data && error.data === '0xce5fe224')) {
//       console.warn(`Vaccination type ${vaccineType} not found for patient ${uniquePatientCode}`);
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false,
//         dosesCount: 0
//       };
//     }
    
//     if (error.reason === 'PatientNotFound' || error.errorName === 'PatientNotFound') {
//       console.warn(`Patient ${uniquePatientCode} not found`);
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false,
//         dosesCount: 0
//       };
//     }
    
//     if (error.message.includes('bad result from backend') || error.code === 'SERVER_ERROR') {
//       console.warn('Backend error, returning empty vaccination status');
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false,
//         dosesCount: 0
//       };
//     }
    
//     throw error;
//   }
// }

/**
 * Helper function to get required doses for a vaccine type
 */
async function getRequiredDosesForVaccine(contract, vaccineType) {
  try {
    const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    const typeInfo = await contract.getVaccinationTypeInfo(vaccinationTypeId);
    return typeInfo.requiredDoses.toNumber();
  } catch (error) {
    console.warn(`Could not get required doses for ${vaccineType}, defaulting to 2`);
    return 2; // Valeur par défaut
  }
}

// export async function getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType) {
//   try {
//     // CHANGEMENT ICI: Utiliser keccak256 au lieu de formatBytes32String
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    
//     console.log('Calling getPatientVaccinationStatus with:', {
//       uniquePatientCode,
//       vaccineType,
//       vaccinationTypeId
//     });
    
//     const status = await contract.getPatientVaccinationStatus(uniquePatientCode, vaccinationTypeId);
//     console.log('Fetched vaccination status:', status);
//     return {
//       administeredDoses: status.administeredDoses.map(dose => ({
//         date: new Date(dose.date.toNumber() * 1000).toISOString(),
//         centerId: dose.centerId,
//         batchNumber: dose.batchNumber
//       })),
//       certificateTokenId: status.certificateTokenId.toNumber(),
//       isComplete: status.isComplete
//     };
//   } catch (error) {
//     console.error('Detailed error in getPatientVaccinationStatus:', {
//       message: error.message,
//       code: error.code,
//       errorName: error.errorName,
//       reason: error.reason,
//       data: error.data
//     });
    
//     // Handle specific custom errors
//     if (error.reason === 'VaccinationTypeNotFound' || 
//         error.errorName === 'VaccinationTypeNotFound' ||
//         (error.data && error.data === '0xce5fe224')) { // Error selector for VaccinationTypeNotFound
//       console.warn(`Vaccination type ${vaccineType} not found for patient ${uniquePatientCode}`);
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false
//       };
//     }
    
//     if (error.reason === 'PatientNotFound' || error.errorName === 'PatientNotFound') {
//       console.warn(`Patient ${uniquePatientCode} not found`);
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false
//       };
//     }
    
//     // Gestion spécifique de l'erreur "bad result from backend"
//     if (error.message.includes('bad result from backend') || error.code === 'SERVER_ERROR') {
//       console.warn('Backend error, returning empty vaccination status');
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false
//       };
//     }
    
//     // For other errors, re-throw
//     throw error;
//   }
// }

// export async function getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType) {
//   try {
//     // CHANGEMENT ICI: Utiliser keccak256 au lieu de formatBytes32String
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
    
//     const status = await contract.getPatientVaccinationStatus(uniquePatientCode, vaccinationTypeId);
    
//     return {
//       administeredDoses: status.administeredDoses.map(dose => ({
//         date: new Date(dose.date.toNumber() * 1000).toISOString(),
//         centerId: dose.centerId,
//         batchNumber: dose.batchNumber
//       })),
//       certificateTokenId: status.certificateTokenId.toNumber(),
//       isComplete: status.isComplete
//     };
//   } catch (error) {
//     // Handle VaccinationTypeNotFound gracefully
//     if (error.errorName === 'VaccinationTypeNotFound' || error.message.includes('VaccinationTypeNotFound')) {
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false
//       };
//     }
//     console.error('Error getting patient vaccination status:', error);
    
//     // Gestion spécifique de l'erreur "bad result from backend"
//     if (error.message.includes('bad result from backend') || error.code === 'SERVER_ERROR') {
//       console.warn('Backend error, returning empty vaccination status');
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false
//       };
//     }
    
//     throw error;
//   }
// }


// export async function getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType) {
//   try {
//     const vaccinationTypeId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(vaccineType));
//     const status = await contract.getPatientVaccinationStatus(uniquePatientCode, vaccinationTypeId);
    
//     return {
//       administeredDoses: status.administeredDoses.map(dose => ({
//         date: new Date(dose.date.toNumber() * 1000).toISOString(),
//         centerId: dose.centerId,
//         batchNumber: dose.batchNumber
//       })),
//       certificateTokenId: status.certificateTokenId.toNumber(),
//       isComplete: status.isComplete
//     };
//   } catch (error) {
//     // Handle VaccinationTypeNotFound gracefully
//     if (error.errorName === 'VaccinationTypeNotFound') {
//       return {
//         administeredDoses: [],
//         certificateTokenId: 0,
//         isComplete: false
//       };
//     }
//     console.error('Error getting patient vaccination status:', error);
//     throw error;
//   }
// }

/**
 * Get vaccination type information
 * @param {ethers.Contract} contract 
 * @param {string} vaccineType 
 * @returns {Promise<Object>}
 */
export async function getVaccinationTypeInfo(contract, vaccineType) {
  try {
    // Convertir le nom du vaccin en bytes32
    const vaccineTypeBytes32 = ethers.utils.formatBytes32String(vaccineType);
    
    const typeInfo = await contract.getVaccinationTypeInfo(vaccineTypeBytes32);
    return {
      typeId: typeInfo.typeId,
      name: ethers.utils.parseBytes32String(typeInfo.name), // Convertir bytes32 en string
      requiredDoses: typeInfo.requiredDoses,
      exists: typeInfo.exists
    };
  } catch (error) {
    if (error.errorName === 'VaccinationTypeNotFound') {
      return {
        typeId: vaccineType,
        name: vaccineType,
        requiredDoses: 0,
        exists: false
      };
    }
    console.error('Error getting vaccination type info:', error);
    throw error;
  }
}

/**
 * Set stock contract address (admin only)
 * @param {ethers.Contract} contract 
 * @param {string} stockAddress 
 * @returns {Promise<ethers.ContractTransaction>}
 */
export async function setStockContract(contract, stockAddress) {
  try {
    const tx = await contract.setStockContract(stockAddress);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error setting stock contract:', error);
    throw error;
  }
}

/**
 * Get all patients from blockchain events
 * @param {ethers.Contract} contract 
 * @returns {Promise<Array>}
 */
/**
 * Get all patients from blockchain
 * @param {ethers.Contract} contract 
 * @returns {Promise<Array>}
 */
export async function getAllPatients(contract) {
  try {
    // Méthode préférée: utiliser la fonction getAllPatients du contrat
    const blockchainPatients = await contract.getAllPatients();
    
    return blockchainPatients.map((patient, index) => ({
      id: index + 1,
      patientId: index + 1,
      patientAddress: patient.patientAddress,
      uniquePatientCode: patient.uniquePatientCode,
      professionalCategory: patient.professionalCategory,
      registrationDate: new Date(patient.registrationDate.toNumber() * 1000), // Conversion timestamp Unix -> Date
      registrationTimestamp: patient.registrationDate.toNumber(), // Timestamp Unix en secondes
      exists: patient.exists
    })).filter(patient => patient.exists);
    
  } catch (error) {
    console.error('Error using getAllPatients contract function:', error);
    
    // Fallback: méthode par événements
    try {
      const currentBlock = await contract.provider.getBlockNumber();
      const fromBlock = 0; // Depuis le début
      
      const filter = contract.filters.PatientRegistered();
      const events = await contract.queryFilter(filter, fromBlock, 'latest');
      
      const patients = [];
      
      for (const event of events) {
        try {
          const { patientId, uniquePatientCode, registrationDate } = event.args;
          
          const patientInfo = await contract.getPatientInfo(uniquePatientCode);
          
          if (patientInfo.exists) {
            patients.push({
              id: patientId.toNumber(),
              patientId: patientId.toNumber(),
              uniquePatientCode,
              patientAddress: patientInfo.patientAddress,
              professionalCategory: patientInfo.professionalCategory,
              registrationDate: new Date(registrationDate.toNumber() * 1000), // Conversion timestamp Unix -> Date
              registrationTimestamp: registrationDate.toNumber(), // Timestamp Unix en secondes
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash
            });
          }
        } catch (error) {
          console.warn(`Could not fetch details for event ${event.transactionHash}:`, error);
        }
      }
      
      return patients.sort((a, b) => b.blockNumber - a.blockNumber);
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      return [];
    }
  }
}


// export async function getAllPatients(contract) {
//   try {
//     // Get current block number to limit the query range
//     const currentBlock = await contract.provider.getBlockNumber();
//     const fromBlock = Math.max(0, currentBlock - 10000); // Query last 10,000 blocks only
    
//     // Get all PatientRegistered events
//     const filter = contract.filters.PatientRegistered();
//     const events = await contract.queryFilter(filter, fromBlock, 'latest');
    
//     const patients = [];
    
//     for (const event of events) {
//       const { patientId, uniquePatientCode } = event.args;
      
//       try {
//         // Get detailed patient info
//         const patientInfo = await getPatientInfo(contract, uniquePatientCode);
        
//         if (patientInfo.exists) {
//           patients.push({
//             id: patientId.toNumber(),
//             patientId: patientId.toNumber(),
//             uniquePatientCode,
//             patientAddress: patientInfo.patientAddress,
//             professionalCategory: patientInfo.professionalCategory,
//             blockNumber: event.blockNumber,
//             transactionHash: event.transactionHash
//           });
//         }
//       } catch (error) {
//         console.warn(`Could not fetch details for patient ${uniquePatientCode}:`, error);
//       }
//     }
    
//     return patients.sort((a, b) => b.blockNumber - a.blockNumber); // Most recent first
//   } catch (error) {
//     console.error('Error getting all patients:', error);
//     throw error;
//   }
// }

/**
 * Get all vaccination types from blockchain events
 * @param {ethers.Contract} contract 
 * @returns {Promise<Array>}
 */
export async function getAllVaccinationTypes(contract) {
  try {
    // Use the new getAllVaccinationTypes function from the smart contract
    const vaccineTypesData = await contract.getAllVaccinationTypes();
    
    return vaccineTypesData.map(type => ({
      typeId: type.typeId,
      name: type.name,
      requiredDoses: type.requiredDoses,
      exists: type.exists
    })).filter(type => type.exists).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting all vaccination types:', error);
    return [];
  }
}

// export async function getAllVaccinationTypes(contract) {
//   try {
//     const vaccineTypesData = await contract.getAllVaccinationTypes();
//     console.log('Fetched vaccine types from contract:', vaccineTypesData);
    
//     return vaccineTypesData.map(type => ({
//       typeId: type.typeId,
//       name: ethers.utils.parseBytes32String(type.name), // Convertir bytes32 en string
//       requiredDoses: type.requiredDoses,
//       exists: type.exists
//     })).filter(type => type.exists).sort((a, b) => a.name.localeCompare(b.name));
//   } catch (error) {
//     console.error('Error getting all vaccination types:', error);
//     return [];
//   }
// }

/**
 * Récupère tous les certificats NFT d'un patient pour les types de vaccins disponibles.
 * @param {ethers.Contract} contract - L'instance du contrat VaccineRegistry.
 * @param {string} uniquePatientCode - Le code unique du patient.
 * @param {Array} availableVaccineTypes - Un tableau des types de vaccins à vérifier (objets avec une propriété `name`).
 * @returns {Promise<Array>} Une promesse qui se résout en un tableau d'objets de certificats.
 */

export async function getPatientCertificates(contract, uniquePatientCode, availableVaccineTypes = []) {
  try {
    console.log('🔍 [getPatientCertificates] Début - Patient:', uniquePatientCode, 'Vaccins disponibles:', availableVaccineTypes);
    
    const certificates = [];

    if (!Array.isArray(availableVaccineTypes)) {
      console.error("Erreur : 'availableVaccineTypes' n'est pas un tableau.", availableVaccineTypes);
      return [];
    }

    const vaccineTypeNames = availableVaccineTypes.map(vt => vt.name);
    console.log(`🔍 [getPatientCertificates] Recherche pour ${uniquePatientCode} - Types:`, vaccineTypeNames);

    for (const vaccineType of vaccineTypeNames) {
      try {
        console.log(`🔍 [getPatientCertificates] Vérification vaccin ${vaccineType} pour ${uniquePatientCode}`);
        
        const status = await getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType);
        console.log(`✅ [getPatientCertificates] Statut pour ${vaccineType}:`, status);
        
        if (status && status.isComplete) {
          console.log(`🎉 [getPatientCertificates] Certificat COMPLET trouvé pour ${vaccineType} (Token ID: ${status.certificateTokenId})`);
          let tokenURI = null;
          let metadata = null;
          let imageUrl = null;
          
          try {
            if (status.certificateTokenId === 0) {
              console.warn(`⚠️ [getPatientCertificates] Token ID 0 pour ${vaccineType}`);
              try {
                tokenURI = await contract.tokenURI(0);
              } catch (zeroError) {
                tokenURI = `ipfs://fallback-uri-for-token-0`;
              }
            } else {
              tokenURI = await contract.tokenURI(status.certificateTokenId);
            }
            
            console.log(`🔗 [getPatientCertificates] Token URI pour ${vaccineType}:`, tokenURI);
            
            if (tokenURI && !tokenURI.includes('fallback-uri-for-token-0')) {
              let ipfsHash;
              if (tokenURI.startsWith('ipfs://')) {
                ipfsHash = tokenURI.replace('ipfs://', '');
              } else if (tokenURI.includes('/ipfs/')) {
                const parts = tokenURI.split('/ipfs/');
                ipfsHash = parts[1];
              }

              if (ipfsHash) {
                metadata = await getJSONFromIPFS(ipfsHash);

                if (metadata && metadata.image) {
                  if (metadata.image.startsWith('ipfs://')) {
                    const imageHash = metadata.image.replace('ipfs://', '');
                    imageUrl = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
                  } else {
                    imageUrl = metadata.image;
                  }
                }
              }
            }
          } catch (ipfsError) {
            console.warn(`❌ [getPatientCertificates] Erreur métadonnées pour ${vaccineType}:`, ipfsError);
          }

          certificates.push({
            vaccineType,
            tokenId: status.certificateTokenId,
            isComplete: status.isComplete,
            dosesCount: status.administeredDoses.length,
            tokenURI,
            metadata,
            imageUrl,
            hasMetadata: !!metadata,
            hasImage: !!imageUrl,
          });
        } else {
          console.log(`❌ [getPatientCertificates] Aucun certificat complet pour ${vaccineType} (Complété: ${status.isComplete})`);
        }
      } catch (statusError) {
        console.warn(`⚠️ [getPatientCertificates] Erreur statut pour ${vaccineType}:`, statusError);
        continue;
      }
    }

    console.log(`📊 [getPatientCertificates] TOTAL certificats pour ${uniquePatientCode}: ${certificates.length}`, certificates);
    return certificates;

  } catch (error) {
    console.error(`💥 [getPatientCertificates] Erreur majeure pour ${uniquePatientCode}:`, error);
    return [];
  }
}


// export async function getPatientCertificates(contract, uniquePatientCode, availableVaccineTypes = []) {
//   try {
//     const certificates = [];

//     // 1. Valider l'entrée pour éviter les erreurs
//     if (!Array.isArray(availableVaccineTypes)) {
//       console.error("Erreur critique : 'availableVaccineTypes' n'est pas un tableau.", availableVaccineTypes);
//       return [];
//     }

//     const vaccineTypeNames = availableVaccineTypes.map(vt => vt.name);
//     console.log(`Recherche des certificats pour ${uniquePatientCode} pour les vaccins :`, vaccineTypeNames);

//     // 2. Itérer sur chaque type de vaccin pour vérifier le statut
//     for (const vaccineType of vaccineTypeNames) {
//       try {
//         const status = await getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType);
//         console.log(`Statut pour ${vaccineType}:`, status);
//         // 3. Si un tokenId existe, le certificat a été émis.
//         // if (status && status.certificateTokenId > 0) {
//         if (status) {
//           console.log(`Certificat trouvé pour ${vaccineType} (Token ID: ${status.certificateTokenId})`);

//           let tokenURI = null;
//           let metadata = null;
//           let imageUrl = null;
          
//           try {
//             // 4. Récupérer l'URI des métadonnées depuis la blockchain
//             tokenURI = await contract.tokenURI(status.certificateTokenId);
//             console.log(`Token URI pour le token ${status.certificateTokenId}:`, tokenURI);
//             // 5. Récupérer les métadonnées JSON depuis IPFS si l'URI existe
//             if (tokenURI) {
//               let ipfsHash;
//               if (tokenURI.startsWith('ipfs://')) {
//                 ipfsHash = tokenURI.replace('ipfs://', '');
//               } else if (tokenURI.includes('/ipfs/')) {
//                 // Gère les URL de passerelle comme https://gateway.pinata.cloud/ipfs/HASH
//                 const parts = tokenURI.split('/ipfs/');
//                 ipfsHash = parts[1];
//               }

//               if (ipfsHash) {
//                 metadata = await getJSONFromIPFS(ipfsHash);

//                 // 6. Extraire et formater l'URL de l'image depuis les métadonnées
//                 if (metadata && metadata.image) {
//                   if (metadata.image.startsWith('ipfs://')) {
//                     const imageHash = metadata.image.replace('ipfs://', '');
//                     imageUrl = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
//                   } else {
//                     imageUrl = metadata.image; // Au cas où l'URL est déjà une URL https
//                   }
//                 }
//               }
//             }
//           } catch (ipfsError) {
//             console.warn(`Impossible de récupérer les métadonnées pour le token ${status.certificateTokenId}:`, ipfsError);
//             // On continue même si les métadonnées ne sont pas trouvées, pour quand même afficher le certificat
//           }

//           // 7. Ajouter l'objet certificat complet au tableau des résultats
//           certificates.push({
//             vaccineType,
//             tokenId: status.certificateTokenId,
//             isComplete: status.isComplete,
//             dosesCount: status.administeredDoses.length,
//             tokenURI,
//             metadata,
//             imageUrl, // URL directe de l'image pour un affichage facile
//             hasMetadata: !!metadata, // Indicateur de présence des métadonnées
//             hasImage: !!imageUrl, // Indicateur de présence de l'image
//           });
//         }
//       } catch (statusError) {
//         // Ignorer les erreurs si un vaccin n'est pas trouvé pour un patient, c'est normal
//         if (!statusError.message.includes('PatientNotFound') && !statusError.message.includes('VaccinationTypeNotFound')) {
//             console.warn(`Erreur lors de la récupération du statut pour le vaccin "${vaccineType}":`, statusError);
//         }
//         continue; // Passe au type de vaccin suivant
//       }
//     }

//     console.log(`Nombre total de certificats trouvés pour ${uniquePatientCode}: ${certificates.length}`);
//     return certificates;

//   } catch (error) {
//     console.error(`Erreur majeure dans getPatientCertificates pour ${uniquePatientCode}:`, error);
//     return []; // Retourner un tableau vide en cas d'erreur imprévue
//   }
// }


// export async function getPatientCertificates(contract, uniquePatientCode, availableVaccineTypes = []) {
//   try {
//     const certificates = [];
    
//     // const vaccineTypes = availableVaccineTypes.length > 0 
//     //   ? availableVaccineTypes.map(vt => vt.name)
//     //   : ['MPOX', 'COVID-19', 'HEPATITIS_B', 'INFLUENZA'];

//     const vaccineTypes = availableVaccineTypes.map(vt => vt.name)

//       console.log('Getting certificates for patient:', uniquePatientCode, 'vaccine types:', vaccineTypes);
    
//     for (const vaccineType of vaccineTypes) {
//       try {
//         const status = await getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType);
        
//         if (status.certificateTokenId > 0) {
//           console.log('Found certificate for', vaccineType, 'tokenId:', status.certificateTokenId);
//           try {
//             console.log('Checking vaccine type:', vaccineType);
//             // Get token URI from blockchain
//             const tokenURI = await contract.tokenURI(status.certificateTokenId);
            
//             // Try to fetch metadata from IPFS
//             let metadata = null;
//             let imageUrl = null;
            
//             if (tokenURI) {
//               try {
//                 // Extract IPFS hash from URI
//                 let ipfsHash;
//                 if (tokenURI.startsWith('ipfs://')) {
//                   ipfsHash = tokenURI.replace('ipfs://', '');
//                 } else if (tokenURI.includes('ipfs')) {
//                   const urlParts = tokenURI.split('/');
//                   ipfsHash = urlParts[urlParts.length - 1];
//                 }
                
//                 if (ipfsHash) {
//                   metadata = await getJSONFromIPFS(ipfsHash);
                  
//                   // Extract image URL from metadata
//                   if (metadata && metadata.image) {
//                     if (metadata.image.startsWith('ipfs://')) {
//                       const imageHash = metadata.image.replace('ipfs://', '');
//                       imageUrl = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
//                     } else {
//                       imageUrl = metadata.image;
//                     }
//                   }
//                 }
//               } catch (ipfsError) {
//                 console.warn(`Could not fetch metadata for token ${status.certificateTokenId}:`, ipfsError);
//               }
//             }
            
//             certificates.push({
//               vaccineType,
//               tokenId: status.certificateTokenId,
//               isComplete: status.isComplete,
//               dosesCount: status.administeredDoses.length,
//               tokenURI,
//               metadata,
//               imageUrl, // Add direct image URL
//               hasMetadata: !!metadata,
//               hasImage: !!imageUrl
//             });
//           } catch (tokenError) {
//             console.warn(`Could not fetch token URI for ${status.certificateTokenId}:`, tokenError);
//             certificates.push({
//               vaccineType,
//               tokenId: status.certificateTokenId,
//               isComplete: status.isComplete,
//               dosesCount: status.administeredDoses.length,
//               hasMetadata: false,
//               hasImage: false
//             });
//           }
//         }
//       } catch (error) {
//         continue;
//       }
//     }
    
//     return certificates;
//   } catch (error) {
//     console.error('Error getting patient certificates:', error);
//     return [];
//   }
// }


// export async function getPatientCertificates(contract, uniquePatientCode, availableVaccineTypes = []) {
//   try {
//     const certificates = [];
    
//     // Use blockchain vaccine types if available, otherwise fallback to defaults
//     const vaccineTypes = availableVaccineTypes.length > 0 
//       ? availableVaccineTypes.map(vt => vt.name)
//       : ['MPOX', 'COVID-19', 'HEPATITIS_B', 'INFLUENZA'];
    
//     for (const vaccineType of vaccineTypes) {
//       try {
//         const status = await getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType);
        
//         if (status.certificateTokenId > 0) {
//           try {
//             // Get token URI from blockchain
//             const tokenURI = await contract.tokenURI(status.certificateTokenId);
            
//             // Extract IPFS hash from URI (handle both ipfs:// and https:// formats)
//             let ipfsHash;
//             if (tokenURI.startsWith('ipfs://')) {
//               ipfsHash = tokenURI.replace('ipfs://', '');
//             } else if (tokenURI.includes('ipfs')) {
//               // Handle gateway URLs like https://gateway.pinata.cloud/ipfs/Qm...
//               const urlParts = tokenURI.split('/');
//               ipfsHash = urlParts[urlParts.length - 1];
//             }
            
//             // Try to fetch metadata from IPFS
//             let metadata = null;
//             if (ipfsHash) {
//               try {
//                 metadata = await getJSONFromIPFS(ipfsHash);
//               } catch (ipfsError) {
//                 console.warn(`Could not fetch metadata for token ${status.certificateTokenId}:`, ipfsError);
//                 // Continue without metadata
//               }
//             }
            
//             certificates.push({
//               vaccineType,
//               tokenId: status.certificateTokenId,
//               isComplete: status.isComplete,
//               dosesCount: status.administeredDoses.length,
//               tokenURI,
//               metadata,
//               hasMetadata: !!metadata
//             });
//           } catch (tokenError) {
//             console.warn(`Could not fetch token URI for ${status.certificateTokenId}:`, tokenError);
//             // Fallback to basic certificate info
//             certificates.push({
//               vaccineType,
//               tokenId: status.certificateTokenId,
//               isComplete: status.isComplete,
//               dosesCount: status.administeredDoses.length,
//               hasMetadata: false
//             });
//           }
//         }
//       } catch (error) {
//         // Ignore errors for non-configured vaccine types
//         continue;
//       }
//     }
    
//     return certificates;
//   } catch (error) {
//     console.error('Error getting patient certificates:', error);
//     return [];
//   }
// }


/**
 * Extract image URL from NFT metadata
 * @param {Object} certificate 
 * @returns {string|null}
 */
export function getCertificateImageUrl(certificate) {
  if (certificate.imageUrl) {
    return certificate.imageUrl;
  }
  
  if (certificate.metadata && certificate.metadata.image) {
    const image = certificate.metadata.image;
    if (image.startsWith('ipfs://')) {
      const imageHash = image.replace('ipfs://', '');
      return `https://gateway.pinata.cloud/ipfs/${imageHash}`;
    }
    return image;
  }
  
  return null;
}

/**
 * Get MAPI events for a patient
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @returns {Promise<Array>}
 */
export async function getPatientMAPIEvents(contract, uniquePatientCode) {
  try {
    console.log('🔍 [getPatientMAPIEvents] Début pour:', uniquePatientCode);
    
    // Get patient info to get patientId
    const patientInfo = await getPatientInfo(contract, uniquePatientCode);
    console.log('📋 [getPatientMAPIEvents] Info patient:', patientInfo);
    
    if (!patientInfo.exists) {
      console.log('❌ [getPatientMAPIEvents] Patient non trouvé');
      return [];
    }
    
    // Utiliser la fonction du contrat si disponible
    try {
      const mapis = await contract.getMAPIsByPatient(uniquePatientCode);
      console.log('✅ [getPatientMAPIEvents] MAPIs depuis contrat:', mapis);
      
      return mapis.map((mapi, index) => ({
        patientId: mapi.patientId?.toNumber() || patientInfo.patientId,
        vaccineType: extractVaccineTypeFromDescription(mapi.description),
        description: mapi.description || 'Aucune description',
        date: new Date((mapi.declarationDate?.toNumber() || Date.now()/1000) * 1000),
        declarationDate: mapi.declarationDate?.toNumber() || Math.floor(Date.now()/1000),
        reportingAgent: mapi.reportingAgent || 'Inconnu',
        mapiId: mapi.mapiId?.toNumber() || index + 1,
        // Ces champs peuvent être absents quand on utilise la fonction directe du contrat
        blockNumber: null,
        transactionHash: null
      }));
    } catch (contractError) {
      console.warn('⚠️ [getPatientMAPIEvents] Erreur avec fonction contrat, fallback aux events:', contractError);
      
      // Fallback: méthode par événements
      const currentBlock = await contract.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000);
      
      // Get all MAPIDeclared events
      const filter = contract.filters.MAPIDeclared();
      const events = await contract.queryFilter(filter, fromBlock, 'latest');
      console.log('📋 [getPatientMAPIEvents] Événements trouvés:', events.length);
      
      const mapiEvents = [];
      
      for (const event of events) {
        try {
          const { patientId, description, declarationDate } = event.args;
          
          // Vérifier si cet événement concerne notre patient
          const eventPatientCode = await getPatientCodeFromId(contract, patientId.toNumber());
          
          if (eventPatientCode === uniquePatientCode) {
            const vaccineType = extractVaccineTypeFromDescription(description);
            
            mapiEvents.push({
              patientId: patientId.toNumber(),
              vaccineType,
              description: description || 'Aucune description',
              date: new Date(declarationDate.toNumber() * 1000),
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash,
              mapiId: mapiEvents.length + 1,
              reportingAgent: event.args.reportingAgent || 'Inconnu'
            });
          }
        } catch (eventError) {
          console.warn('⚠️ [getPatientMAPIEvents] Erreur traitement événement:', eventError);
        }
      }
      
      console.log('✅ [getPatientMAPIEvents] MAPIs finales:', mapiEvents);
      return mapiEvents.sort((a, b) => b.date - a.date);
    }
    
  } catch (error) {
    console.error('💥 [getPatientMAPIEvents] Erreur majeure:', error);
    return [];
  }
}

// Fonction helper pour extraire le code patient depuis l'ID
async function getPatientCodeFromId(contract, patientId) {
  try {
    return await contract.getPatientCodeById(patientId);
  } catch (error) {
    console.warn('⚠️ Impossible de récupérer le code patient depuis ID:', error);
    return null;
  }
}


function extractVaccineTypeFromDescription(description) {
  if (description.includes(':')) {
    return description.split(':')[0].trim();
  }
  
  
  const vaccineTypes = ['MPOX', 'COVID', 'HEPATITIS', 'INFLUENZA'];
  for (const type of vaccineTypes) {
    if (description.toUpperCase().includes(type)) {
      return type;
    }
  }
  
  return 'Inconnu';
}

/**
 * Get all vaccination events for a patient
 * @param {ethers.Contract} contract 
 * @param {string} uniquePatientCode 
 * @param {Array} availableVaccineTypes - Array of available vaccine types
 * @returns {Promise<Array>}
 */
// Dans services/contracts/vaccineRegistry.js - Correction de getPatientVaccinationHistory
export async function getPatientVaccinationHistory(contract, uniquePatientCode, availableVaccineTypes = []) {
  try {
    console.log('🔍 [getPatientVaccinationHistory] Début pour:', uniquePatientCode);
    
    // Get patient info first to get patientId
    const patientInfo = await getPatientInfo(contract, uniquePatientCode);
    
    if (!patientInfo.exists) {
      console.log('❌ [getPatientVaccinationHistory] Patient non trouvé');
      return [];
    }
    
    // Utiliser la méthode directe via getPatientVaccinationStatus
    const history = [];
    const vaccineTypes = availableVaccineTypes.map(vt => vt.name);
    
    for (const vaccineType of vaccineTypes) {
      try {
        const status = await getPatientVaccinationStatus(contract, uniquePatientCode, vaccineType);
        console.log(`📋 [getPatientVaccinationHistory] Statut pour ${vaccineType}:`, status);
        
        if (status && status.administeredDoses && status.administeredDoses.length > 0) {
          status.administeredDoses.forEach((dose, index) => {
            history.push({
              patientId: patientInfo.patientId,
              vaccineType: vaccineType,
              doseNumber: index + 1,
              date: dose.date,
              centerId: dose.centerId,
              batchNumber: dose.batchNumber,
              type: 'dose'
            });
          });
        }
      } catch (statusError) {
        console.warn(`⚠️ [getPatientVaccinationHistory] Erreur statut pour ${vaccineType}:`, statusError);
      }
    }
    
    // Ajouter aussi les événements MAPI dans l'historique
    try {
      const mapiEvents = await getPatientMAPIEvents(contract, uniquePatientCode);
      mapiEvents.forEach(mapi => {
        history.push({
          patientId: patientInfo.patientId,
          vaccineType: mapi.vaccineType,
          description: mapi.description,
          date: mapi.date,
          type: 'mapi',
          eventType: 'MAPI'
        });
      });
    } catch (mapiError) {
      console.warn('⚠️ [getPatientVaccinationHistory] Erreur récupération MAPI:', mapiError);
    }
    
    // Trier par date
    const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('✅ [getPatientVaccinationHistory] Historique final:', sortedHistory);
    
    return sortedHistory;
    
  } catch (error) {
    console.error('💥 [getPatientVaccinationHistory] Erreur majeure:', error);
    return [];
  }
}