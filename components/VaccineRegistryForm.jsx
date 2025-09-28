'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { UserPlus, Syringe, Users, Search, Eye, AlertTriangle, Award, Calendar, MapPin, Hash, Printer, Download, } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { VaccineProgress } from '@/components/VaccineProgress'; 
import { uploadFileToPinata, uploadJSONToPinata, getJSONFromIPFS } from '@/services/pinata';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWallet } from '@/hooks/useWallet';
import { 
  getVaccineRegistryContract, 
  registerPatient, 
  registerDose, 
  addVaccinationType, 
  getAllPatients,
  getPatientCertificates,
  getPatientVaccinationHistory,
  getAllVaccinationTypes,
  getPatientVaccinationStatus,
  checkPatientExists,
  checkVaccinationTypeExists,
  getPatientMAPIEvents,
  declareMAPI
} from '@/services/contracts/vaccineRegistry';
import toast from 'react-hot-toast';

/**
 * Patient and dose registration form component
 * @returns {JSX.Element}
 */
export default function VaccineRegistryForm() {
  const { t } = useTranslation('common');
  const { signer, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [activeTab, setActiveTab] = useState('patient');
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientCertificates, setPatientCertificates] = useState([]);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [vaccineTypes, setVaccineTypes] = useState([]);
  const [loadingVaccineTypes, setLoadingVaccineTypes] = useState(false);
  const [centers, setCenters] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);

  const [showMetadataFields, setShowMetadataFields] = useState(false);
  const [nftGenerationOption, setNftGenerationOption] = useState('generate');
  const [nftImage, setNftImage] = useState(null);
  const [generatedNFT, setGeneratedNFT] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [patientVaccineProgress, setPatientVaccineProgress] = useState({});

  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certificateImage, setCertificateImage] = useState(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [showMAPIForm, setShowMAPIForm] = useState(false);
  const [selectedMAPIPatient, setSelectedMAPIPatient] = useState(null);
  const [mapiData, setMapiData] = useState({
    vaccineType: '',
    description: ''
  });
  const [mapiLoading, setMapiLoading] = useState(false);
  const [showMAPIList, setShowMAPIList] = useState(false);

  const [formData, setFormData] = useState({
    centerId: '',
    vaccineType: '',
    quantity: '',
    criticalThreshold: ''
  });

  const [patientData, setPatientData] = useState({
    patientAddress: '',
    uniquePatientCode: '',
    professionalCategory: ''
  });

  const [doseData, setDoseData] = useState({
    uniquePatientCode: '',
    vaccineType: '',
    centerId: '',
    batchNumber: '',
    metadataURI: ''
  });

  const [vaccineTypeData, setVaccineTypeData] = useState({
    name: '',
    requiredDoses: '2'
  });

  // Reset form data when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setPatientData({
        patientAddress: '',
        uniquePatientCode: '',
        professionalCategory: ''
      });
      setDoseData({
        uniquePatientCode: '',
        vaccineType: 'MPOX',
        centerId: '',
        batchNumber: '',
        metadataURI: ''
      });
      setVaccineTypeData({
        name: '',
        requiredDoses: '2'
      });
      setActiveTab('patient');
      setPatients([]);
      setSearchTerm('');
      setSelectedPatient(null);
      setPatientCertificates([]);
      setPatientHistory([]);
      setVaccineTypes([]);
    }
  }, [isConnected]);

  // Load patients and vaccine types when component mounts and wallet is connected
  useEffect(() => {
    if (isConnected && signer) {
      const loadInitialData = async () => {
        setLoadingPatients(true);
        await loadCenters();
        
        const loadedVaccineTypes = await loadVaccineTypes();
        
        if (loadedVaccineTypes) {
          await loadPatients(loadedVaccineTypes);
        }
        setLoadingPatients(false);
      };

      loadInitialData();
    }
  }, [isConnected, signer]);

  // *************Template NFT **************************************
  const generateVaccineNFT = async (patientCode, vaccineType, centerId) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    // Arrière-plan gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bordure
    ctx.strokeStyle = '#00796b';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Titre
    ctx.fillStyle = '#00796b';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICAT VACCINAL NUMÉRIQUE', canvas.width / 2, 80);

    // Logo ou icône
    ctx.font = '48px Arial';
    ctx.fillText('💉', canvas.width / 2, 150);

    // Informations
    ctx.fillStyle = '#333';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    
    const infoYStart = 220;
    const lineHeight = 35;
    
    ctx.fillText(`🔖 Code Patient: ${patientCode}`, 100, infoYStart);
    ctx.fillText(`💊 Vaccin: ${vaccineType}`, 100, infoYStart + lineHeight);
    ctx.fillText(`🏥 Centre: ${centerId}`, 100, infoYStart + lineHeight * 2);
    ctx.fillText(`📅 Date: ${new Date().toLocaleDateString('fr-FR')}`, 100, infoYStart + lineHeight * 3);
    
    // QR Code area (placeholder)
    ctx.fillStyle = '#ddd';
    ctx.fillRect(500, 200, 200, 200);
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code du certificat', 600, 430);

    // Statut
    ctx.fillStyle = '#2e7d32';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✅ VACCINATION COMPLÈTE', canvas.width / 2, 500);

    // Footer
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText('Certificat sécurisé sur la blockchain - Émis via VaccineRegistry', canvas.width / 2, 570);

    return canvas.toDataURL('image/png');
  };

  /**
   * Uploads a Data URL of an image to IPFS via Pinata
   */
  const uploadNFTToIPFS = async (imageDataUrl, patientCode, vaccineType) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `certificate-${patientCode}-${vaccineType}.png`, {
        type: 'image/png'
      });

      setUploadProgress(30);
      
      const imageResult = await uploadFileToPinata(
        file, 
        `vaccine-certificate-${patientCode}-${vaccineType}`
      );

      setUploadProgress(60);

      const metadata = {
        name: `Certificat Vaccinal - ${patientCode}`,
        description: `Certificat de vaccination complète pour ${vaccineType}`,
        image: `ipfs://${imageResult.ipfsHash}`,
        attributes: [
          {
            trait_type: "Vaccin",
            value: vaccineType
          },
          {
            trait_type: "Patient",
            value: patientCode
          },
          {
            trait_type: "Centre",
            value: doseData.centerId
          },
          {
            trait_type: "Date d'émission",
            value: new Date().toISOString()
          },
          {
            trait_type: "Statut",
            value: "Complet"
          }
        ],
        external_url: "https://vaccineregistry.com"
      };

      setUploadProgress(80);

      const metadataResult = await uploadJSONToPinata(
        metadata,
        `metadata-${patientCode}-${vaccineType}`
      );

      setUploadProgress(100);

      return `ipfs://${metadataResult.ipfsHash}`;
      
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      toast.error('Error uploading to IPFS');
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Fetch certificate image from IPFS
   */
  const fetchCertificateImage = async (tokenURI) => {
    try {
      let ipfsHash;
      if (tokenURI.startsWith('ipfs://')) {
        ipfsHash = tokenURI.replace('ipfs://', '');
      } else if (tokenURI.includes('ipfs')) {
        const urlParts = tokenURI.split('/');
        ipfsHash = urlParts[urlParts.length - 1];
      }
      
      if (!ipfsHash) {
        throw new Error('Invalid IPFS URI');
      }
      
      const metadata = await getJSONFromIPFS(ipfsHash);
      
      if (!metadata || !metadata.image) {
        throw new Error('No image in metadata');
      }
      
      let imageIpfsHash;
      if (metadata.image.startsWith('ipfs://')) {
        imageIpfsHash = metadata.image.replace('ipfs://', '');
      } else if (metadata.image.includes('ipfs')) {
        const imageUrlParts = metadata.image.split('/');
        imageIpfsHash = imageUrlParts[imageUrlParts.length - 1];
      }
      
      if (!imageIpfsHash) {
        throw new Error('Invalid image IPFS URI');
      }
      
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${imageIpfsHash}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image from IPFS');
      }
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching certificate image:', error);
      throw error;
    }
  };

  // Fonction pour visualiser un certificat
  const handleViewCertificate = async (patient, certificate) => {
    setGeneratingCertificate(true);
    setSelectedCertificate({ patient, certificate });
    
    try {
      let imageData;
      
      if (certificate.imageUrl) {
        try {
          const response = await fetch(certificate.imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            imageData = URL.createObjectURL(blob);
          }
        } catch (error) {
          console.warn('Could not fetch image from URL:', error);
        }
      }
      
      if (!imageData) {
        console.log('Generating fallback certificate image');
        imageData = await generateVaccineNFT(
          patient.uniquePatientCode,
          certificate.vaccineType,
          "Centre Médical"
        );
      }
      
      setCertificateImage(imageData);
    } catch (error) {
      console.error('Erreur lors de la génération du certificat:', error);
      toast.error('Erreur lors de la génération du certificat');
    } finally {
      setGeneratingCertificate(false);
    }
  };

  // Fonction pour télécharger un certificat
  const handleDownloadCertificate = () => {
    if (!certificateImage) return;
    
    const link = document.createElement('a');
    link.href = certificateImage;
    link.download = `certificat-${selectedCertificate.patient.uniquePatientCode}-${selectedCertificate.certificate.vaccineType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fonction pour déclarer un MAPI
  const handleDeclareMAPI = (patient) => {
    setSelectedMAPIPatient(patient);
    setShowMAPIForm(true);
    
    const availableVaccines = patient.certificates && patient.certificates.length > 0 
      ? patient.certificates.map(cert => cert.vaccineType)
      : vaccineTypes.map(vt => vt.name);
    
    setMapiData({
      vaccineType: availableVaccines.length > 0 ? availableVaccines[0] : '',
      description: ''
    });
  };

  // Fonction pour visualiser les MAPI d'un patient
  const loadMAPIForPatient = async (patient) => {
    if (!signer) return;

    try {
      const contract = getVaccineRegistryContract(signer);
      const mapiEvents = await getPatientMAPIEvents(contract, patient.uniquePatientCode);
      
      setPatients(prev => prev.map(p => 
        p.uniquePatientCode === patient.uniquePatientCode 
          ? { 
              ...p, 
              mapiEvents: mapiEvents || [],
              mapiCount: mapiEvents ? mapiEvents.length : 0
            } 
          : p
      ));
      
      return mapiEvents;
    } catch (error) {
      console.error('Erreur lors du chargement des MAPI:', error);
      toast.error('Erreur lors du chargement des MAPI');
      return [];
    }
  };

  const handleViewMAPI = async (patient) => {
    setSelectedMAPIPatient(patient);
    
    try {
      const mapiEvents = await loadMAPIForPatient(patient);
      setShowMAPIList(true);
    } catch (error) {
      console.error('Erreur lors du chargement des MAPI:', error);
    }
  };

  // Soumission du formulaire MAPI
  const handleMapiSubmit = async (e) => {
    e.preventDefault();
    
    if (!signer || !selectedMAPIPatient) {
      toast.error('Patient non sélectionné');
      return;
    }

    setMapiLoading(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      
      await declareMAPI(
        contract, 
        selectedMAPIPatient.uniquePatientCode, 
        `${mapiData.vaccineType}: ${mapiData.description}`
      );
      
      toast.success('MAPI déclaré avec succès');
      
      setMapiData({
        vaccineType: '',
        description: ''
      });
      setShowMAPIForm(false);
      
      await loadPatients();
      
    } catch (error) {
      console.error('Erreur lors de la déclaration du MAPI:', error);
      toast.error('Erreur lors de la déclaration du MAPI: ' + error.message);
    } finally {
      setMapiLoading(false);
    }
  };
    
  // *****************Progress********************************
  /**
   * Loads vaccine progress from blockchain
   */
  const loadVaccineProgress = async (patientsList = patients) => {
    if (!signer || !patientsList.length || !vaccineTypes.length) {
      console.log('❌ Conditions non remplies pour loadVaccineProgress:', {
        hasSigner: !!signer,
        patientsCount: patientsList.length,
        vaccineTypesCount: vaccineTypes.length
      });
      return;
    }
    
    try {
      const contract = getVaccineRegistryContract(signer);
      const progress = {};
      
      console.log('🔄 Chargement de la progression pour', patientsList.length, 'patients');
      console.log('Patients:', patientsList.map(p => p.uniquePatientCode));
      
      for (const patient of patientsList) {
        console.log(`📊 Traitement du patient: ${patient.uniquePatientCode}`);
        progress[patient.uniquePatientCode] = {};
        
        for (const vaccine of vaccineTypes) {
          try {
            console.log(`🔍 Vérification vaccin: ${vaccine.name} pour ${patient.uniquePatientCode}`);
            
            const vaccinationStatus = await getPatientVaccinationStatus(
              contract,
              patient.uniquePatientCode,
              vaccine.name
            );
            
            console.log(`✅ Statut pour ${patient.uniquePatientCode} - ${vaccine.name}:`, {
              doseCount: vaccinationStatus.doseCount,
              isComplete: vaccinationStatus.isComplete
            });
            
            progress[patient.uniquePatientCode][vaccine.name] = {
              doseCount: vaccinationStatus.doseCount,
              isComplete: vaccinationStatus.isComplete
            };
            
          } catch (error) {
            console.warn(`❌ Erreur pour ${patient.uniquePatientCode} - ${vaccine.name}:`, error);
            progress[patient.uniquePatientCode][vaccine.name] = {
              doseCount: 0,
              isComplete: false
            };
          }
        }
      }
      
      console.log('✅ Données de progression finales:', progress);
      setPatientVaccineProgress(progress);
      
    } catch (error) {
      console.error('💥 Erreur lors du chargement de la progression:', error);
    }
  };


//   const loadVaccineProgress = async (patientsList = patients) => {
//   if (!signer || !patientsList.length || !vaccineTypes.length) return;
  
//   try {
//     const contract = getVaccineRegistryContract(signer);
//     const progress = {};
    
//     console.log('🔄 Chargement de la progression pour', patientsList.length, 'patients');
    
//     for (const patient of patientsList) {
//       progress[patient.uniquePatientCode] = {};
      
//       for (const vaccine of vaccineTypes) {
//         try {
//           const vaccinationStatus = await getPatientVaccinationStatus(
//             contract,
//             patient.uniquePatientCode,
//             vaccine.name
//           );
          
//           // DEBUG: Afficher les données reçues
//           console.log(`📈 Progression ${patient.uniquePatientCode} - ${vaccine.name}:`, {
//             doseCount: vaccinationStatus.doseCount,
//             administeredDoses: vaccinationStatus.administeredDoses,
//             isComplete: vaccinationStatus.isComplete
//           });
          
//           progress[patient.uniquePatientCode][vaccine.name] = {
//             doseCount: vaccinationStatus.doseCount,
//             isComplete: vaccinationStatus.isComplete
//           };
          
//         } catch (error) {
//           console.warn(`⚠️ Erreur pour ${patient.uniquePatientCode} - ${vaccine.name}:`, error);
//           progress[patient.uniquePatientCode][vaccine.name] = {
//             doseCount: 0,
//             isComplete: false
//           };
//         }
//       }
//     }
    
//     console.log('✅ Données de progression finales:', progress);
//     setPatientVaccineProgress(progress);
    
//   } catch (error) {
//     console.error('💥 Erreur lors du chargement de la progression:', error);
//   }
// };


// const loadVaccineProgress = async (patientsList = patients) => {
//   if (!signer || !patientsList.length || !vaccineTypes.length) return;
  
//   try {
//     const contract = getVaccineRegistryContract(signer);
//     const progress = {};
    
//     console.log('Loading vaccine progress for', patientsList.length, 'patients');
    
//     // Créer toutes les promesses en parallèle
//     const promises = [];
    
//     for (const patient of patientsList) {
//       progress[patient.uniquePatientCode] = {};
      
//       for (const vaccine of vaccineTypes) {
//         promises.push(
//           (async () => {
//             try {
//               const vaccinationStatus = await getPatientVaccinationStatus(
//                 contract,
//                 patient.uniquePatientCode,
//                 vaccine.name
//               );
              
//               console.log(`Progress for ${patient.uniquePatientCode}, ${vaccine.name}:`, vaccinationStatus);
              
//               // CORRECTION ICI : Utiliser la bonne propriété pour le nombre de doses
//               const doseCount = vaccinationStatus.dosesCount !== undefined 
//                 ? vaccinationStatus.dosesCount 
//                 : vaccinationStatus.administeredDoses.length;
              
//               return {
//                 patientCode: patient.uniquePatientCode,
//                 vaccineName: vaccine.name,
//                 doseCount: doseCount,
//                 isComplete: vaccinationStatus.isComplete
//               };
//             } catch (error) {
//               console.warn(`Could not get status for ${patient.uniquePatientCode}, ${vaccine.name}:`, error);
//               return {
//                 patientCode: patient.uniquePatientCode,
//                 vaccineName: vaccine.name,
//                 doseCount: 0,
//                 isComplete: false
//               };
//             }
//           })()
//         );
//       }
//     }
    
//     // Attendre toutes les requêtes
//     const results = await Promise.all(promises);
    
//     // Organiser les résultats
//     results.forEach(({ patientCode, vaccineName, doseCount, isComplete }) => {
//       if (!progress[patientCode]) {
//         progress[patientCode] = {};
//       }
//       progress[patientCode][vaccineName] = {
//         doseCount: doseCount,
//         isComplete: isComplete
//       };
//     });
    
//     console.log('Final progress data:', progress); 
//     setPatientVaccineProgress(progress);
    
//   } catch (error) {
//     console.error('Error loading vaccine progress:', error);
//   }
// };

// const loadVaccineProgress = async (patientsList = patients) => {
//   if (!signer || !patientsList.length || !vaccineTypes.length) return;
  
//   try {
//     const contract = getVaccineRegistryContract(signer);
//     const progress = {};
    
//     console.log('Loading vaccine progress for', patientsList.length, 'patients');
    
//     // Créer toutes les promesses en parallèle
//     const promises = [];
    
//     for (const patient of patientsList) {
//       progress[patient.uniquePatientCode] = {};
      
//       for (const vaccine of vaccineTypes) {
//         promises.push(
//           (async () => {
//             try {
//               const vaccinationStatus = await getPatientVaccinationStatus(
//                 contract,
//                 patient.uniquePatientCode,
//                 vaccine.name
//               );
              
//               console.log(`Progress for ${patient.uniquePatientCode}, ${vaccine.name}:`, {
//                 dosesCount: vaccinationStatus.dosesCount,
//                 administeredDoses: vaccinationStatus.administeredDoses.length,
//                 isComplete: vaccinationStatus.isComplete
//               });
              
//               return {
//                 patientCode: patient.uniquePatientCode,
//                 vaccineName: vaccine.name,
//                 doseCount: vaccinationStatus.dosesCount || vaccinationStatus.administeredDoses.length
//               };
//             } catch (error) {
//               console.warn(`Could not get status for ${patient.uniquePatientCode}, ${vaccine.name}:`, error);
//               return {
//                 patientCode: patient.uniquePatientCode,
//                 vaccineName: vaccine.name,
//                 doseCount: 0
//               };
//             }
//           })()
//         );
//       }
//     }
    
//     // Attendre toutes les requêtes
//     const results = await Promise.all(promises);
    
//     // Organiser les résultats
//     results.forEach(({ patientCode, vaccineName, doseCount }) => {
//       if (!progress[patientCode]) {
//         progress[patientCode] = {};
//       }
//       progress[patientCode][vaccineName] = doseCount;
//     });
    
//     console.log('Final progress data:', progress); 
//     setPatientVaccineProgress(progress);
    
//   } catch (error) {
//     console.error('Error loading vaccine progress:', error);
//   }
// };

  // const loadVaccineProgress = async (patientsList = patients) => {
  //   if (!signer || !patientsList.length) return;
    
  //   try {
  //     const contract = getVaccineRegistryContract(signer);
  //     const progress = {};
      
  //     const promises = [];
      
  //     for (const patient of patientsList) {
  //       progress[patient.uniquePatientCode] = {};
        
  //       for (const vaccine of vaccineTypes) {
  //         promises.push(
  //           (async () => {
  //             try {
  //               const vaccinationStatus = await getPatientVaccinationStatus(
  //                 contract,
  //                 patient.uniquePatientCode,
  //                 vaccine.name
  //               );
  //               return {
  //                 patientCode: patient.uniquePatientCode,
  //                 vaccineName: vaccine.name,
  //                 doseCount: vaccinationStatus.administeredDoses.length
  //               };
  //             } catch (error) {
  //               console.warn(`Could not get status for ${patient.uniquePatientCode}, ${vaccine.name}:`, error);
  //               return {
  //                 patientCode: patient.uniquePatientCode,
  //                 vaccineName: vaccine.name,
  //                 doseCount: 0
  //               };
  //             }
  //           })()
  //         );
  //       }
  //     }
      
  //     const results = await Promise.all(promises);
      
  //     results.forEach(({ patientCode, vaccineName, doseCount }) => {
  //       if (!progress[patientCode]) {
  //         progress[patientCode] = {};
  //       }
  //       progress[patientCode][vaccineName] = doseCount;
  //     });
      
  //     setPatientVaccineProgress(progress);
  //   } catch (error) {
  //     console.error('Error loading vaccine progress:', error);
  //   }
  // };

  useEffect(() => {
    const checkIfLastDose = async () => {
      if (doseData.uniquePatientCode && doseData.vaccineType) {
        const vaccine = vaccineTypes.find(v => v.name === doseData.vaccineType);
        
        const currentDoses = patientVaccineProgress[doseData.uniquePatientCode]?.[doseData.vaccineType] || 0;
        
        if (vaccine && currentDoses + 1 >= vaccine.requiredDoses) {
          setShowMetadataFields(true);
        } else {
          setShowMetadataFields(false);
        }
      }
    };

    checkIfLastDose();
  }, [doseData.uniquePatientCode, doseData.vaccineType, patientVaccineProgress, vaccineTypes]);

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

      if (blockchainVaccineTypes.length > 0 && !doseData.vaccineType) {
        setDoseData(prev => ({ ...prev, vaccineType: blockchainVaccineTypes[0].name }));
      }
      return blockchainVaccineTypes;
    } catch (error) {
      console.error('Error loading vaccine types:', error);
      toast.error('Erreur lors du chargement des types de vaccins');
      const defaultTypes = [
        { name: 'MPOX', requiredDoses: 2, exists: true },
        { name: 'COVID-19', requiredDoses: 2, exists: true },
        { name: 'HEPATITIS_B', requiredDoses: 3, exists: true },
        { name: 'INFLUENZA', requiredDoses: 1, exists: true }
      ];
      setVaccineTypes(defaultTypes);
      return defaultTypes;
    } finally {
      setLoadingVaccineTypes(false);
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
      const { getVaccineStockContract, getAllCenters } = await import('@/services/contracts/vaccineStock');
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
   * Load patients list from blockchain
   */
  const loadPatients = async (types) => {
  if (!signer) {
    setPatients([]);
    return;
  }
  
  setLoadingPatients(true);
  try {
    const contract = getVaccineRegistryContract(signer);
    const blockchainPatients = await getAllPatients(contract);

    const patientsWithDetails = await Promise.all(
      blockchainPatients.map(async (patient) => {
          try {
            const [certificates, mapiEvents] = await Promise.all([
              getPatientCertificates(contract, patient.uniquePatientCode, types),
              getPatientMAPIEvents(contract, patient.uniquePatientCode)
            ]);

            console.log(`Patient ${patient.uniquePatientCode} certificates:`, certificates);
            console.log(`Patient ${patient.uniquePatientCode} certificates length:`, certificates ? certificates.length : 0);
            
            return {
              ...patient,
              certificates: certificates || [],
              certificatesCount: certificates ? certificates.length : 0,
              mapiEvents: mapiEvents || [],
              mapiCount: mapiEvents ? mapiEvents.length : 0,
              status: 'Actif'
            };
          } catch (error) {
            console.warn(`Could not fetch details for ${patient.uniquePatientCode}:`, error);
            return {
              ...patient,
              certificates: [],
              certificatesCount: 0,
              mapiEvents: [],
              mapiCount: 0,
              status: 'Actif'
            };
          }
        })
      );

      setPatients(patientsWithDetails);
      console.log('🔄 Appel de loadVaccineProgress après setPatients');
      await loadVaccineProgress(patientsWithDetails);

    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Erreur lors du chargement des patients depuis la blockchain');
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  /**
   * Load patient details
   */
  const loadPatientDetails = async (patientCode) => {
    console.log('Loading details for patient:', patientCode);
    if (!signer) return;

    setLoadingDetails(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      
      const [certificates, history] = await Promise.all([
        getPatientCertificates(contract, patientCode, vaccineTypes),
        getPatientVaccinationHistory(contract, patientCode, vaccineTypes)
      ]);
      
      console.log(`Patient ${patientCode} certificates:`, certificates);
      console.log(`Patient ${patientCode} certificates length:`, certificates ? certificates.length : 0);
      
      setPatientCertificates(certificates);
      setPatientHistory(history);
    } catch (error) {
      console.error('Error loading patient details:', error);
      toast.error('Erreur lors du chargement des détails du patient');
      setPatientCertificates([]);
      setPatientHistory([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  /**
   * Filter patients based on search term
   */
  console.log('Patients:', patients);
  const filteredPatients = patients.filter(patient =>
    patient.uniquePatientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.professionalCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patientAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Format address for display
   */
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Handle patient registration
   */
  const handlePatientRegistration = async (e) => {
    e.preventDefault();
    if (!signer || !patientData.patientAddress || !patientData.uniquePatientCode) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      await registerPatient(
        contract,
        patientData.patientAddress,
        patientData.uniquePatientCode,
        patientData.professionalCategory
      );

      toast.success('Patient registered successfully');
      setPatientData({
        patientAddress: '',
        uniquePatientCode: '',
        professionalCategory: ''
      });
      
      await loadPatients();
    } catch (error) {
      console.error('Error registering patient:', error);
      toast.error('Failed to register patient: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dose registration
   */
  const handleDoseRegistration = async (e) => {
    e.preventDefault();
    
    if (!signer || !doseData.uniquePatientCode || !doseData.vaccineType || 
        !doseData.centerId || !doseData.batchNumber) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    
    try {
      let finalMetadataURI = doseData.metadataURI;

      if (showMetadataFields && !finalMetadataURI && nftGenerationOption === 'generate') {
        const nftImageData = await generateVaccineNFT(
          doseData.uniquePatientCode,
          doseData.vaccineType,
          doseData.centerId
        );
        finalMetadataURI = await uploadNFTToIPFS(
          nftImageData,
          doseData.uniquePatientCode,
          doseData.vaccineType
        );
      }
      else if (showMetadataFields && !finalMetadataURI && nftGenerationOption === 'upload' && nftImage) {
        finalMetadataURI = await uploadNFTToIPFS(
          URL.createObjectURL(nftImage),
          doseData.uniquePatientCode,
          doseData.vaccineType
        );
      }

      const contract = getVaccineRegistryContract(signer);
      await registerDose(
        contract,
        doseData.uniquePatientCode,
        doseData.vaccineType,
        doseData.centerId,
        doseData.batchNumber,
        finalMetadataURI || ''
      );

      toast.success('Dose enregistrée avec succès !');
      
      setDoseData({
        uniquePatientCode: '',
        vaccineType: vaccineTypes.length > 0 ? vaccineTypes[0].name : '',
        centerId: '',
        batchNumber: '',
        metadataURI: ''
      });
      setGeneratedNFT(null);
      setNftImage(null);

      await loadPatients();
      
    } catch (error) {
      console.error('Error registering dose:', error);
      
      if (error.message.includes('does not exist')) {
        toast.error(`Erreur: ${error.message}`);
      } else if (error.message.includes('VaccinationTypeNotFound') || error.message.includes('Vaccine type')) {
        toast.error(error.message);
      } else if (error.message.includes('InsufficientStock')) {
        toast.error(error.message);
      } else if (error.message.includes('already completed')) {
        toast.error(error.message);
      } else if (error.message.includes('DoseNumberExceedsRequirement')) {
        toast.error(error.message);
      } else {
        toast.error('Erreur lors de l\'enregistrement: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkPrerequisites = async () => {
      if (doseData.uniquePatientCode && doseData.vaccineType && signer) {
        try {
          const contract = getVaccineRegistryContract(signer);
          
          const patientExists = await checkPatientExists(contract, doseData.uniquePatientCode);
          if (!patientExists) {
            console.warn(`Patient ${doseData.uniquePatientCode} n'existe pas`);
          }
          
          const vaccineTypeExists = await checkVaccinationTypeExists(contract, doseData.vaccineType);
          if (!vaccineTypeExists) {
            console.warn(`Vaccin ${doseData.vaccineType} n'existe pas`);
          }
        } catch (error) {
          // Ignorer les erreurs de vérification
        }
      }
    };

    checkPrerequisites();
  }, [doseData.uniquePatientCode, doseData.vaccineType, signer]);

  useEffect(() => {
    const testGetPatientCertificates = async () => {
      if (signer && vaccineTypes.length > 0) {
        try {
          console.log('🧪 TEST: Appel direct de getPatientCertificates');
          const contract = getVaccineRegistryContract(signer);
          const testCertificates = await getPatientCertificates(contract, 'PAT-A1', vaccineTypes);
          console.log('🧪 TEST RESULT:', testCertificates);
        } catch (error) {
          console.error('🧪 TEST ERROR:', error);
        }
      }
    };
    
    testGetPatientCertificates();
  }, [signer, vaccineTypes]);

  // Fonction pour télécharger l'image d'un certificat spécifique
  const handleDownloadCertificateImage = async (certificate) => {
    try {
      if (!certificate.imageUrl) {
        toast.error('Aucune image disponible pour ce certificat');
        return;
      }

      const response = await fetch(certificate.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificat-${selectedPatient.uniquePatientCode}-${certificate.vaccineType}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success('Image téléchargée avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
    }
  };
  
  /**
   * Handle vaccine type addition
   */
  const handleVaccineTypeAddition = async (e) => {
    e.preventDefault();
    if (!signer || !vaccineTypeData.name || !vaccineTypeData.requiredDoses) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const contract = getVaccineRegistryContract(signer);
      await addVaccinationType(
        contract,
        vaccineTypeData.name,
        parseInt(vaccineTypeData.requiredDoses)
      );

      toast.success('Vaccine type added successfully');
      setVaccineTypeData({
        name: '',
        requiredDoses: '2'
      });
      
      await loadVaccineTypes();
      await loadCenters();
    } catch (error) {
      console.error('Error adding vaccine type:', error);
      toast.error('Failed to add vaccine type: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Print patients list
   */
  const handlePrintPatients = () => {
    setIsPrinting(true);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Liste des Patients - Registre Vaccinal Blockchain</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #00796b;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #00796b;
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0 0 0;
              color: #666;
            }
            .summary {
              background: #f5f9f8;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #00796b;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .address {
              font-family: monospace;
              font-size: 12px;
              background: #f0f0f0;
              padding: 2px 4px;
              border-radius: 3px;
            }
            .certificate-badge {
              background: #e8f5e8;
              color: #2e7d32;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: bold;
            }
            .status-active {
              background: #e8f5e8;
              color: #2e7d32;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛡️ Registre Vaccinal Blockchain</h1>
            <p>Liste des Patients Enregistrés</p>
            <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          </div>
          
          <div class="summary">
            <strong>Résumé :</strong> ${filteredPatients.length} patient(s) ${searchTerm ? `trouvé(s) pour "${searchTerm}"` : 'au total'}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Code Patient</th>
                <th>Adresse Blockchain</th>
                <th>Catégorie Professionnelle</th>
                <th>Certificats NFT</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPatients.map(patient => `
                <tr>
                  <td><strong>${patient.uniquePatientCode}</strong></td>
                  <td><span class="address">${patient.patientAddress}</span></td>
                  <td>${patient.professionalCategory}</td>
                  <td>
                    ${patient.certificatesCount > 0 ? 
                      `<span class="certificate-badge">${patient.certificatesCount} certificat(s)</span><br>
                       <small>${patient.certificates.map(cert => cert.vaccineType).join(', ')}</small>` :
                      '<em>Aucun certificat</em>'
                    }
                  </td>
                  <td><span class="status-active">${patient.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Document généré automatiquement par le système de registre vaccinal blockchain</p>
            <p>Adresse du contrat : ${process.env.NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS || 'Non configurée'}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
        setIsPrinting(false);
      };
    };
  };

  const professionalCategories = [
    'Médecin',
    'Infirmier',
    'Pharmacien',
    'Personnel de santé',
    'Autre'
  ];

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
      <div className="flex space-x-4 mb-6">
        <Button
          variant={activeTab === 'patient' ? 'default' : 'outline'}
          onClick={() => setActiveTab('patient')}
          className={activeTab === 'patient' ? 'bg-button text-white' : ''}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('patient register')}
        </Button>
        <Button
          variant={activeTab === 'list' ? 'default' : 'outline'}
          onClick={() => setActiveTab('list')}
          className={activeTab === 'list' ? 'bg-button text-white' : ''}
        >
          <Users className="w-4 h-4 mr-2" />
          Liste des patients
        </Button>
        <Button
          variant={activeTab === 'dose' ? 'default' : 'outline'}
          onClick={() => setActiveTab('dose')}
          className={activeTab === 'dose' ? 'bg-button text-white' : ''}
        >
          <Syringe className="w-4 h-4 mr-2" />
          {t('patient register dose')}
        </Button>
        <Button
          variant={activeTab === 'vaccine-type' ? 'default' : 'outline'}
          onClick={() => setActiveTab('vaccine-type')}
          className={activeTab === 'vaccine-type' ? 'bg-button text-white' : ''}
        >
          Ajouter Type Vaccin
        </Button>
      </div>

      {activeTab === 'patient' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {t('patient register')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePatientRegistration} className="space-y-4">
              <div>
                <Label htmlFor="patientAddress">{t('common address')}</Label>
                <Input
                  id="patientAddress"
                  value={patientData.patientAddress}
                  onChange={(e) => setPatientData({ ...patientData, patientAddress: e.target.value })}
                  placeholder="0x..."
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="uniquePatientCode">{t('patient patient_code')}</Label>
                <Input
                  id="uniquePatientCode"
                  value={patientData.uniquePatientCode}
                  onChange={(e) => setPatientData({ ...patientData, uniquePatientCode: e.target.value })}
                  placeholder="PAT-001"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="professionalCategory">{t('patient professional category')}</Label>
                <select
                  id="professionalCategory"
                  value={patientData.professionalCategory}
                  onChange={(e) => setPatientData({ ...patientData, professionalCategory: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {professionalCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-button hover:bg-primaryDark text-white"
              >
                {loading ? t('common loading') : t('patient register')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Patients enregistrés sur la blockchain ({patients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher par code patient, catégorie ou adresse..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={handlePrintPatients}
                  disabled={isPrinting || filteredPatients.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {isPrinting ? 'Impression...' : 'Imprimer la liste'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Patients table */}
          <Card>
            <CardContent className="p-0">
              {loadingPatients ? (
                <div className="text-center p-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="mt-2 text-gray-600">Chargement des patients depuis la blockchain...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code Patient</TableHead>
                        <TableHead>Adresse</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Date d'enregistrement</TableHead>
                        <TableHead>Certificats</TableHead>
                        <TableHead>MAPI</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center p-8">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                              {searchTerm ? 'Aucun patient trouvé pour cette recherche' : 'Aucun patient enregistré sur la blockchain'}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPatients.map((patient) => (
                          <TableRow key={patient.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              {patient.uniquePatientCode}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {formatAddress(patient.patientAddress)}
                              </code>
                            </TableCell>
                            <TableCell>{patient.professionalCategory}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {new Date(patient.registrationDate).toLocaleDateString('fr-FR')}
                              </div>
                            </TableCell>
                            
                            {/* Colonne Certificats */}
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {patient.certificatesCount > 0 ? (
                                  patient.certificates.map((cert, index) => (
                                    <Badge 
                                      key={index}
                                      variant={cert.hasMetadata ? "default" : "outline"} 
                                      className={`text-xs cursor-pointer ${cert.hasMetadata ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                                      onClick={() => handleViewCertificate(patient, cert)}
                                    >
                                      <Award className="w-3 h-3 mr-1" />
                                      {cert.vaccineType}
                                      {!cert.hasMetadata && <span className="ml-1">⚠️</span>}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-500">Aucun</span>
                                )}
                              </div>
                            </TableCell>
                            
                            {/* Colonne MAPI */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {patient.mapiEvents && patient.mapiEvents.length > 0 ? (
                                  <>
                                    <Badge variant="destructive" className="text-xs">
                                      {patient.mapiEvents.length}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleViewMAPI(patient)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      Voir
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500">Aucun</span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeclareMAPI(patient)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Déclarer
                                </Button>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {patient.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  loadPatientDetails(patient.uniquePatientCode);
                                }}
                                disabled={loadingDetails}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Détails
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient details */}
          {selectedPatient && (
            <Card className="border-primary/20 bg-primary/5 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Détails du patient: {selectedPatient.uniquePatientCode}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadVaccineProgress([selectedPatient])}
                    >
                      🔄 Recharger la progression
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientCertificates([]);
                        setPatientHistory([]);
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
                        <CardContent>
                          {loadingDetails ? (
                            <div className="text-center p-8">
                              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                              <p className="mt-2 text-gray-600">Chargement des détails...</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Patient info */}
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Informations patient
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Code patient:</span>
                                    <p className="font-medium">{selectedPatient.uniquePatientCode}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Adresse blockchain:</span>
                                    <p className="font-mono text-xs">{selectedPatient.patientAddress}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Catégorie professionnelle:</span>
                                    <p>{selectedPatient.professionalCategory}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Date d'enregistrement:</span>
                                    <p>{new Date(selectedPatient.registrationDate).toLocaleDateString('fr-FR')}</p>
                                  </div>
                                </div>
                              </div>

                              <VaccineProgress
                                patientCode={selectedPatient.uniquePatientCode}
                                vaccineTypes={vaccineTypes}
                                patientVaccineProgress={patientVaccineProgress}
                              />

                              {/* NFT Certificates */}
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                  <Award className="w-4 h-4" />
                                  Certificats NFT ({patientCertificates.length})
                                </h4>
                                {patientCertificates.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Image</TableHead>
                                          <TableHead>Type de vaccin</TableHead>
                                          <TableHead>Token ID</TableHead>
                                          <TableHead>Statut</TableHead>
                                          <TableHead>Doses</TableHead>
                                          <TableHead>Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {patientCertificates.map((cert, index) => (
                                          <TableRow key={index}>
                                            <TableCell>
                                              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border">
                                                {cert.imageUrl ? (
                                                  <img 
                                                    src={cert.imageUrl} 
                                                    alt={`Certificat ${cert.vaccineType}`}
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => handleViewCertificate(selectedPatient, cert)}
                                                  />
                                                ) : (
                                                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                    <Award className="w-6 h-6 text-gray-400" />
                                                  </div>
                                                )}
                                              </div>
                                            </TableCell>
                                            
                                            <TableCell className="font-medium">{cert.vaccineType}</TableCell>
                                            
                                            <TableCell>
                                              <div className="flex items-center gap-1">
                                                <Hash className="w-3 h-3 text-gray-400" />
                                                <code className="text-xs">#{cert.tokenId}</code>
                                              </div>
                                            </TableCell>
                                            
                                            <TableCell>
                                              <Badge 
                                                variant={cert.isComplete ? "default" : "secondary"}
                                                className={cert.isComplete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                                              >
                                                {cert.isComplete ? 'Complet' : 'En cours'}
                                              </Badge>
                                            </TableCell>
                                            
                                            <TableCell>{cert.dosesCount} dose(s)</TableCell>
                                            
                                            <TableCell>
                                              <div className="flex gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handleViewCertificate(selectedPatient, cert)}
                                                  className="h-8 px-3 text-xs"
                                                >
                                                  <Eye className="w-3 h-3 mr-1" />
                                                  Voir
                                                </Button>
                                                
                                                {cert.imageUrl && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDownloadCertificateImage(cert)}
                                                    className="h-8 px-3 text-xs"
                                                  >
                                                    <Download className="w-3 h-3 mr-1" />
                                                    Télécharger
                                                  </Button>
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                                    <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600">Aucun certificat NFT émis</p>
                                  </div>
                                )}
                              </div>

                              {/* Vaccination History */}
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Historique complet ({patientHistory.length})
                                </h4>
                                {patientHistory.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Vaccin</TableHead>
                                          <TableHead>Détails</TableHead>
                                          <TableHead>Date</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {patientHistory.map((record, index) => (
                                          <TableRow key={index}>
                                            <TableCell>
                                              {record.type === 'mapi' ? (
                                                <Badge variant="destructive" className="text-xs">
                                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                                  MAPI
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline">
                                                  <Syringe className="w-3 h-3 mr-1" />
                                                  Dose {record.doseNumber}
                                                </Badge>
                                              )}
                                            </TableCell>
                                            <TableCell className="font-medium">{record.vaccineType}</TableCell>
                                            <TableCell>
                                              {record.type === 'mapi' ? (
                                                <span className="text-sm">{record.description}</span>
                                              ) : (
                                                <div className="text-xs">
                                                  <div>Centre: {record.centerId}</div>
                                                  <div>Lot: {record.batchNumber}</div>
                                                </div>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-gray-400" />
                                                {new Date(record.date).toLocaleDateString('fr-FR')}
                                                <span className="text-gray-400">
                                                  {new Date(record.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}
                                                </span>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                                    <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600">Aucun événement enregistré</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'dose' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              {t('patient.register_dose')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDoseRegistration} className="space-y-4">
              <div>
                <Label htmlFor="dosePatientCode">{t('patient.patient_code')}</Label>
                <Input
                  id="dosePatientCode"
                  value={doseData.uniquePatientCode}
                  onChange={(e) => setDoseData({ ...doseData, uniquePatientCode: e.target.value })}
                  placeholder="PAT-001"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="doseVaccineType">Type de vaccin</Label>
                {loadingVaccineTypes ? (
                  <div className="flex items-center gap-2 mt-1 p-2 border rounded-md">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-gray-600">Chargement des types de vaccins...</span>
                  </div>
                ) : (
                  <select
                    id="doseVaccineType"
                    value={doseData.vaccineType}
                    onChange={(e) => setDoseData({ ...doseData, vaccineType: e.target.value })}
                    className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner un type de vaccin</option>
                    {vaccineTypes.map(type => (
                      <option key={type.name} value={type.name}>
                        {type.name} ({type.requiredDoses} dose{type.requiredDoses > 1 ? 's' : ''} requise{type.requiredDoses > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                )}
                {vaccineTypes.length === 0 && !loadingVaccineTypes && (
                  <p className="text-xs text-amber-600 mt-1">
                    Aucun type de vaccin configuré. Ajoutez-en un dans l'onglet "Ajouter Type Vaccin".
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="centerId">Centre médical</Label>
                <select
                  id="centerId"
                  value={doseData.centerId}
                  onChange={(e) => setDoseData({ ...doseData, centerId: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sélectionner un centre</option>
                  {centers.map(center => (
                    <option key={center} value={center}>{center}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="batchNumber">Numéro de lot</Label>
                <Input
                  id="batchNumber"
                  value={doseData.batchNumber}
                  onChange={(e) => setDoseData({ ...doseData, batchNumber: e.target.value })}
                  placeholder="BATCH-2024-001"
                  className="mt-1"
                  required
                />
              </div>

              {showMetadataFields && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Award className="w-5 h-5" />
                    <h4 className="font-semibold">🎉 Dernière dose - Génération du certificat NFT</h4>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-600">
                        Upload vers IPFS... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 mb-4">
                    <Label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-100">
                      <input
                        type="radio"
                        value="generate"
                        checked={nftGenerationOption === 'generate'}
                        onChange={(e) => setNftGenerationOption(e.target.value)}
                        className="text-blue-600"
                      />
                      <div>
                        <p className="font-medium">Générer automatiquement</p>
                        <p className="text-xs text-gray-600">Certificat avec design prédéfini</p>
                      </div>
                    </Label>
                    
                    <Label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-100">
                      <input
                        type="radio"
                        value="upload"
                        checked={nftGenerationOption === 'upload'}
                        onChange={(e) => setNftGenerationOption(e.target.value)}
                        className="text-blue-600"
                      />
                      <div>
                        <p className="font-medium">Uploader une image</p>
                        <p className="text-xs text-gray-600">Image personnalisée</p>
                      </div>
                    </Label>
                  </div>

                  {nftGenerationOption === 'generate' && (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        onClick={() => generateVaccineNFT(
                          doseData.uniquePatientCode,
                          doseData.vaccineType,
                          doseData.centerId
                        ).then(setGeneratedNFT)}
                        variant="outline"
                        className="w-full"
                        disabled={!doseData.uniquePatientCode}
                      >
                        👀 Prévisualiser le certificat
                      </Button>
                      
                      {generatedNFT && (
                        <div className="p-3 bg-white rounded-lg border">
                          <img 
                            src={generatedNFT} 
                            alt="Prévisualisation du certificat" 
                            className="w-full rounded-lg border"
                          />
                          <p className="text-xs text-gray-600 mt-2 text-center">
                            Certificat NFT généré automatiquement
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {nftGenerationOption === 'upload' && (
                    <div>
                      <Label htmlFor="nftImage" className="block mb-2 font-medium">
                        Image du certificat NFT
                      </Label>
                      <Input
                        id="nftImage"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNftImage(e.target.files[0])}
                        className="cursor-pointer"
                      />
                      {nftImage && (
                        <div className="mt-2 p-2 bg-white rounded-lg border">
                          <img 
                            src={URL.createObjectURL(nftImage)} 
                            alt="Aperçu" 
                            className="w-32 h-32 object-cover rounded"
                          />
                          <p className="text-xs text-gray-600 mt-1">
                            {nftImage.name}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="metadataURI" className="block mb-2 font-medium">
                      URI IPFS personnalisée (optionnel)
                    </Label>
                    <Input
                      id="metadataURI"
                      value={doseData.metadataURI}
                      onChange={(e) => setDoseData({ ...doseData, metadataURI: e.target.value })}
                      placeholder="ipfs://..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Laissez vide pour générer automatiquement un certificat
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !doseData.vaccineType || loadingVaccineTypes}
                className="w-full bg-button hover:bg-primaryDark text-white"
              >
                {loading ? t('common loading') : t('patient register dose')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'vaccine-type' && (
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un type de vaccin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVaccineTypeAddition} className="space-y-4">
              <div>
                <Label htmlFor="vaccineTypeName">Nom du vaccin</Label>
                <Input
                  id="vaccineTypeName"
                  value={vaccineTypeData.name}
                  onChange={(e) => setVaccineTypeData({ ...vaccineTypeData, name: e.target.value })}
                  placeholder="MPOX"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="requiredDoses">Nombre de doses requises</Label>
                <Input
                  id="requiredDoses"
                  type="number"
                  min="1"
                  value={vaccineTypeData.requiredDoses}
                  onChange={(e) => setVaccineTypeData({ ...vaccineTypeData, requiredDoses: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-button hover:bg-primaryDark text-white"
              >
                {loading ? t('common.loading') : 'Ajouter le type de vaccin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Modal pour visualiser un certificat */}
      {selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Certificat: {selectedCertificate.certificate.vaccineType} - {selectedCertificate.patient.uniquePatientCode}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedCertificate(null);
                    setCertificateImage(null);
                  }}
                >
                  ✕
                </Button>
              </div>
              
              {generatingCertificate ? (
                <div className="text-center p-8">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-gray-600">Chargement du certificat...</p>
                </div>
              ) : certificateImage ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img 
                      src={certificateImage} 
                      alt={`Certificat ${selectedCertificate.certificate.vaccineType}`}
                      className="max-w-full max-h-[500px] rounded-lg border shadow-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <strong>Patient:</strong> {selectedCertificate.patient.uniquePatientCode}
                    </div>
                    <div>
                      <strong>Vaccin:</strong> {selectedCertificate.certificate.vaccineType}
                    </div>
                    <div>
                      <strong>Token ID:</strong> #{selectedCertificate.certificate.tokenId}
                    </div>
                    <div>
                      <strong>Doses:</strong> {selectedCertificate.certificate.dosesCount}
                    </div>
                    <div>
                      <strong>Statut:</strong> 
                      <Badge 
                        variant={selectedCertificate.certificate.isComplete ? "default" : "secondary"}
                        className="ml-2"
                      >
                        {selectedCertificate.certificate.isComplete ? 'Complet' : 'En cours'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={handleDownloadCertificate}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger l'image
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectedCertificate(null);
                        setCertificateImage(null);
                      }}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-gray-600">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>Erreur lors du chargement du certificat</p>
                  <Button 
                    variant="outline" 
                    onClick={() => handleViewCertificate(selectedCertificate.patient, selectedCertificate.certificate)}
                    className="mt-4"
                  >
                    Réessayer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal pour déclarer un MAPI */}
      {showMAPIForm && selectedMAPIPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Déclarer un MAPI pour {selectedMAPIPatient.uniquePatientCode}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowMAPIForm(false)}
                >
                  ✕
                </Button>
              </div>
              
              <form onSubmit={handleMapiSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="mapiVaccineType">Vaccin concerné</Label>
                  <select
                    id="mapiVaccineType"
                    value={mapiData.vaccineType}
                    onChange={(e) => setMapiData({...mapiData, vaccineType: e.target.value})}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Sélectionner un vaccin</option>
                    
                    {selectedMAPIPatient.certificates && selectedMAPIPatient.certificates.length > 0 ? (
                      selectedMAPIPatient.certificates.map((cert, index) => (
                        <option key={index} value={cert.vaccineType}>
                          {cert.vaccineType} {cert.isComplete ? '(Complet)' : '(En cours)'}
                        </option>
                      ))
                    ) : (
                      vaccineTypes.map((vaccineType, index) => (
                        <option key={index} value={vaccineType.name}>
                          {vaccineType.name}
                        </option>
                      ))
                    )}
                    
                    {(!selectedMAPIPatient.certificates || selectedMAPIPatient.certificates.length === 0) && 
                    vaccineTypes.length === 0 && (
                      <option value="AUTRE">Autre vaccin</option>
                    )}
                  </select>
                  
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedMAPIPatient.certificates && selectedMAPIPatient.certificates.length > 0 
                      ? `${selectedMAPIPatient.certificates.length} vaccin(s) trouvé(s) pour ce patient`
                      : `Utilisation des ${vaccineTypes.length} type(s) de vaccin disponible(s)`}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="mapiDescription">Description de l'événement indésirable</Label>
                  <Textarea
                    id="mapiDescription"
                    value={mapiData.description}
                    onChange={(e) => setMapiData({...mapiData, description: e.target.value})}
                    placeholder="Décrivez les symptômes ou effets indésirables observés..."
                    rows={4}
                    required
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={mapiLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {mapiLoading ? 'Déclaration en cours...' : 'Déclarer le MAPI'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setShowMAPIForm(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour visualiser les MAPI d'un patient */}
      {showMAPIList && selectedMAPIPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  📋 MAPI pour {selectedMAPIPatient.uniquePatientCode}
                  {selectedMAPIPatient.mapiEvents && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({selectedMAPIPatient.mapiEvents.length} événement(s))
                    </span>
                  )}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowMAPIList(false)}
                >
                  ✕
                </Button>
              </div>
              
              {selectedMAPIPatient.mapiEvents && selectedMAPIPatient.mapiEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedMAPIPatient.mapiEvents.map((mapi, index) => (
                    <div key={index} className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-amber-800">
                            💉 {mapi.vaccineType || 'Vaccin non spécifié'}
                          </h4>
                          <p className="text-xs text-amber-600 mt-1">
                            ID: {mapi.patientId || 'N/A'} | MAPI ID: {mapi.mapiId || 'N/A'}
                            {mapi.blockNumber && ` | Bloc: #${mapi.blockNumber}`}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          {mapi.date ? new Date(mapi.date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                          <br />
                          {mapi.date && new Date(mapi.date).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded">
                        {mapi.description || 'Aucune description'}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        Déclaré par: <code className="bg-gray-100 px-1 rounded">
                          {mapi.reportingAgent ? `${mapi.reportingAgent.slice(0, 6)}...${mapi.reportingAgent.slice(-4)}` : 'Inconnu'}
                        </code>
                      </div>
                      {mapi.transactionHash && (
                        <div className="mt-2 text-xs text-gray-500">
                          Transaction: <code className="bg-gray-100 px-1 rounded">
                            {mapi.transactionHash.slice(0, 10)}...{mapi.transactionHash.slice(-8)}
                          </code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-gray-600">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <p className="font-medium">Aucun MAPI déclaré pour ce patient</p>
                  <p className="text-sm mt-2">Tous les événements indésirables post-vaccinaux apparaîtront ici.</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-between items-center">
                <Button 
                  variant="outline"
                  onClick={() => handleDeclareMAPI(selectedMAPIPatient)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Déclarer un nouveau MAPI
                </Button>
                <Button 
                  onClick={() => setShowMAPIList(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* {showMAPIList && selectedMAPIPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  📋 MAPI pour {selectedMAPIPatient.uniquePatientCode}
                  {selectedMAPIPatient.mapiEvents && (
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({selectedMAPIPatient.mapiEvents.length} événement(s))
                    </span>
                  )}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowMAPIList(false)}
                >
                  ✕
                </Button>
              </div>
              
              {selectedMAPIPatient.mapiEvents && selectedMAPIPatient.mapiEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedMAPIPatient.mapiEvents.map((mapi, index) => (
                    <div key={index} className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-amber-800">
                            💉 {mapi.vaccineType}
                          </h4>
                          <p className="text-xs text-amber-600 mt-1">
                            ID: {mapi.patientId} | Bloc: #{mapi.blockNumber}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          {new Date(mapi.date).toLocaleDateString('fr-FR')}
                          <br />
                          {new Date(mapi.date).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded">
                        {mapi.description}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        Transaction: <code className="bg-gray-100 px-1 rounded">
                          {mapi.transactionHash.slice(0, 10)}...{mapi.transactionHash.slice(-8)}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-gray-600">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <p className="font-medium">Aucun MAPI déclaré pour ce patient</p>
                  <p className="text-sm mt-2">Tous les événements indésirables post-vaccinaux apparaîtront ici.</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-between items-center">
                <Button 
                  variant="outline"
                  onClick={() => handleDeclareMAPI(selectedMAPIPatient)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Déclarer un nouveau MAPI
                </Button>
                <Button 
                  onClick={() => setShowMAPIList(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}