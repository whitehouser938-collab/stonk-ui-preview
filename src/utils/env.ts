/**
 * Environment variable validation and access
 * Validates required environment variables at build time
 */

import { logger } from './logger';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isEthAddress(value: string): boolean {
  return ETH_ADDRESS_REGEX.test(value);
}

export interface EnvConfig {
  VITE_API_URL: string;
  VITE_AUTH_URL: string;
  VITE_WALLETCONNECT_PROJECT_ID: string;
  VITE_WEBSOCKET_URL?: string;
  VITE_EVM_ROUTER_ADDRESS: string;
  VITE_EVM_TOKEN_FACTORY_ADDRESS: string;
  VITE_EVILWETH_ADDRESS: string;
  VITE_BASE_VAULT_ADDRESS?: string;
  VITE_DEPLOYMENT_FEE_ETH: string;
}

function validateEnv(): EnvConfig {
  const apiUrl = import.meta.env.VITE_API_URL;
  const authUrl = import.meta.env.VITE_AUTH_URL;
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
  const tokenFactoryAddress = import.meta.env.VITE_EVM_TOKEN_FACTORY_ADDRESS;
  const wethAddress = import.meta.env.VITE_EVILWETH_ADDRESS;
  const baseVaultAddress = import.meta.env.VITE_BASE_VAULT_ADDRESS;
  const deploymentFeeEth = import.meta.env.VITE_DEPLOYMENT_FEE_ETH;

  const errors: string[] = [];

  if (!apiUrl) {
    errors.push('VITE_API_URL is required');
  } else {
    try {
      new URL(apiUrl);
    } catch {
      errors.push('VITE_API_URL must be a valid URL');
    }
  }

  if (!authUrl) {
    errors.push('VITE_AUTH_URL is required');
  } else {
    try {
      new URL(authUrl);
    } catch {
      errors.push('VITE_AUTH_URL must be a valid URL');
    }
  }

  if (!walletConnectProjectId) {
    errors.push('VITE_WALLETCONNECT_PROJECT_ID is required');
  }

  if (!routerAddress) {
    errors.push('VITE_EVM_ROUTER_ADDRESS is required');
  } else if (!isEthAddress(routerAddress)) {
    errors.push('VITE_EVM_ROUTER_ADDRESS must be a valid 0x-prefixed 40-char hex address');
  }

  if (!tokenFactoryAddress) {
    errors.push('VITE_EVM_TOKEN_FACTORY_ADDRESS is required');
  } else if (!isEthAddress(tokenFactoryAddress)) {
    errors.push('VITE_EVM_TOKEN_FACTORY_ADDRESS must be a valid 0x-prefixed 40-char hex address');
  }

  if (!wethAddress) {
    errors.push('VITE_EVILWETH_ADDRESS is required');
  } else if (!isEthAddress(wethAddress)) {
    errors.push('VITE_EVILWETH_ADDRESS must be a valid 0x-prefixed 40-char hex address');
  }

  if (errors.length > 0) {
    const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;

    if (import.meta.env.PROD) {
      throw new Error(errorMessage);
    } else {
      logger.warn(errorMessage);
      logger.warn('Using fallback values. Set environment variables in .env file');
    }
  }

  return {
    VITE_API_URL: apiUrl || 'http://localhost:3000',
    VITE_AUTH_URL: authUrl || 'http://localhost:3001',
    VITE_WALLETCONNECT_PROJECT_ID: walletConnectProjectId || '',
    VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL,
    VITE_EVM_ROUTER_ADDRESS: routerAddress || '',
    VITE_EVM_TOKEN_FACTORY_ADDRESS: tokenFactoryAddress || '',
    VITE_EVILWETH_ADDRESS: wethAddress || '',
    VITE_BASE_VAULT_ADDRESS: baseVaultAddress,
    VITE_DEPLOYMENT_FEE_ETH: deploymentFeeEth ?? '0',
  };
}

// Validate on module load
export const env = validateEnv();
