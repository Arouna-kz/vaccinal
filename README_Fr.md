
# 🛡️ Blockchain Vaccinal

[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Une application décentralisée (dApp) complète pour la gestion transparente et sécurisée des registres vaccinaux sur la blockchain Hedera.

<!-- ***************Deployer et configurer les smart contracts******************* -->
Les contrats sont dans le dossier contract que vous pourrez importer dans remix et les deployé ensuite copier-coller les adresse des smart contracts dans le fichier .env:
# VaccineStock Contract
NEXT_PUBLIC_CONTRACT_VACCINE_STOCK_ADDRESS=

# VaccineGovToken Contract  
NEXT_PUBLIC_CONTRACT_VACCINE_GOV_TOKEN_ADDRESS=

# VaccineDAO Contract
NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS=

# VaccineRegistry Contract
NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS=

Copier-coller les ABI des smart contracts aussi dans les fichiers abi/VaccineDAO.json, abi/VaccineGovToken.json, abi/VaccineRegistry.json et abi/VaccineStock.json

<!-- **********************FIN******************************************************** -->


## 🌟 Fonctionnalités Principales

### 📋 Gestion des Patients
- **Enregistrement sécurisé** des patients sur la blockchain
- **Suivi des doses administrées** avec historique complet
- **Certification NFT** des vaccinations complètes
- **Gestion des MAPI** (Événements indésirables post-vaccinaux)

### 📦 Gestion des Stocks
- **Surveillance en temps réel** des stocks multi-centres
- **Alertes automatiques** pour les seuils critiques
- **Interface de réapprovisionnement** intuitive
- **Tableaux de bord** avec métriques en temps réel

### 🏛️ Gouvernance DAO
- **Système de vote décentralisé** avec tokens VGOV
- **Création et gestion de propositions**
- **Quorum et seuils configurables**
- **Historique des décisions**

### 🔐 Sécurité et Rôles
- **Contrôle d'accès basé sur les rôles** (RBAC)
- **Rôles spécialisés** (Médical, Logistique, Administration)
- **Permissions granulaires** par contrat
- **Audit trail** immuable sur la blockchain

## 🚀 Démarrage Rapide

### Prérequis

- **Node.js** 18.x ou supérieur
- **Wallet MetaMask** installé
- **Compte Hedera** avec des fonds pour le gas
- **Accès IPFS** (Pinata recommandé)

### Installation

```bash
# Cloner le repository
git clone https://github.com/Arouna-kz/vaccinal.git
cd vaccinal

# Installer les dépendances
npm install


# Configuration de l'environnement
cp .env.example .env.local

# ===========================================
# BLOCKCHAIN CONFIGURATION (HEDERA TESTNET)
# ===========================================

# Network Configuration
NEXT_PUBLIC_NETWORK=hedera-testnet
NEXT_PUBLIC_CHAIN_ID=0x128
NEXT_PUBLIC_CHAIN_ID_INT=296
NEXT_PUBLIC_NETWORK_NAME=Hedera Testnet
NEXT_PUBLIC_NETWORK_RPC=https://testnet.hashio.io/api
NEXT_PUBLIC_NETWORK_EXPLORER=https://hashscan.io/testnet

# ===========================================
# SMART CONTRACTS ADDRESSES
# ===========================================

# VaccineStock Contract
NEXT_PUBLIC_CONTRACT_VACCINE_STOCK_ADDRESS=

# VaccineGovToken Contract  
NEXT_PUBLIC_CONTRACT_VACCINE_GOV_TOKEN_ADDRESS=

# VaccineDAO Contract
NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS=

# VaccineRegistry Contract
NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS=

# ===========================================
# IPFS CONFIGURATION (PINATA)
# ===========================================

# Pinata API Configuration
PINATA_API_KEY=
PINATA_SECRET_API_KEY=
PINATA_JWT=

# Public Pinata Configuration (for frontend)
NEXT_PUBLIC_PINATA_API_KEY=
NEXT_PUBLIC_PINATA_SECRET_API_KEY=

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================

# Application Environment
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# Default Gas Settings
NEXT_PUBLIC_DEFAULT_GAS_LIMIT=500000
NEXT_PUBLIC_DEFAULT_GAS_PRICE=20000000000

# ===========================================
# DEVELOPMENT SETTINGS
# ===========================================

# Enable debug mode
NEXT_PUBLIC_DEBUG=true

# API Base URL (if needed for future backend integration)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# ===========================================
# DEVELOPERS CERTIFICAT
# ===========================================
- Zié Arouna Koné : https://certs.hashgraphdev.com/89d7e7a7-58d0-43cb-b0be-2a2b8286001b.pdf

- Marie Claire Kabran epse guehi : https://certs.hashgraphdev.com/0a33e7e7-02ac-4321-b0e2-ee65be8907d0.pdf 

- Monné Estelle Dro epse Kouassi : https://certs.hashgraphdev.com/4cf797cf-1fa4-45c3-a4cd-a69fdd7021de.pdf 