
# 🛡️ Blockchain Vaccinal

[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

A complete decentralized application (dApp) for transparent and secure management of vaccine registries on the Hedera blockchain.

<!-- ***************Deploy and configure smart contracts******************* -->
The contracts are in the contract folder, which you can import into Remix and deploy by copying and pasting the smart contract addresses into the .env file:
# VaccineStock Contract
NEXT_PUBLIC_CONTRACT_VACCINE_STOCK_ADDRESS=

# VaccineGovToken Contract  
NEXT_PUBLIC_CONTRACT_VACCINE_GOV_TOKEN_ADDRESS=

# VaccineDAO Contract
NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS=

# VaccineRegistry Contract
NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS=

Copy-paste the smart contract ABIs also into the files abi/VaccineDAO.json, abi/VaccineGovToken.json, abi/VaccineRegistry.json and abi/VaccineStock.json

<!-- ****************************************************************************** -->


## 🌟 Key Features

### 📋 Patient Management
- **Secure** patient registration on the blockchain
- **Track administered doses** with full history
- **NFT certification** of complete vaccinations
- **AEFI** (Adverse Events Following Immunization) management

### 📦 Inventory Management
- **Real-time** monitoring of multi-center inventories
- **Automatic alerts** for critical thresholds
- **Intuitive replenishment interface**
- **Dashboards** with real-time metrics

### 🏛️ DAO Governance
- **Decentralized voting system** with VGOV tokens
- **Proposal creation and management**
- **Configurable quorum and thresholds**
- **Decision history**

### 🔐 Security and Roles
- Role-Based Access Control (RBAC)
- Specialized Roles (Medical, Logistics, Administration)
- Granular Permissions per Contract
- Immutable Audit Trail on the Blockchain

## 🚀 Quick Start

### Requirements

- Node.js 18.x or higher
- MetaMask Wallet installed
- Hedera account with gas funds
- IPFS access (Pinata recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/Arouna-kz/vaccinal.git
cd vaccinal

# Install dependencies
npm install

# Environment configuration
cp .env.example .env.local

# ================================================
# BLOCKCHAIN ​​CONFIGURATION (HEDERA TESTNET)
# ================================================

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


