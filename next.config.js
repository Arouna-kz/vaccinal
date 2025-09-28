/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config.js');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  i18n,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'hedera-testnet',
    NEXT_PUBLIC_CONTRACT_VACCINE_GOV_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_GOV_TOKEN_ADDRESS,
    NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS,
    NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_REGISTRY_ADDRESS,
    NEXT_PUBLIC_CONTRACT_VACCINE_STOCK_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_VACCINE_STOCK_ADDRESS,
    PINATA_API_KEY: process.env.PINATA_API_KEY,
    PINATA_API_SECRET: process.env.PINATA_API_SECRET,
  }
};

module.exports = nextConfig;