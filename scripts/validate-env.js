#!/usr/bin/env node

/**
 * Build-time environment variable validation
 * This script validates required environment variables before build
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(root, '.env') });

const requiredEnvVars = [
  'VITE_API_URL',
  'VITE_AUTH_URL',
  'VITE_WALLETCONNECT_PROJECT_ID',
  'VITE_EVM_ROUTER_ADDRESS',
  'VITE_EVM_TOKEN_FACTORY_ADDRESS',
  'VITE_EVILWETH_ADDRESS',
];

const optionalEnvVars = [
  'VITE_WEBSOCKET_URL',
  'VITE_BASE_VAULT_ADDRESS',
  'VITE_DEPLOYMENT_FEE_ETH',
];

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
function isValidEthAddress(value) {
  return typeof value === 'string' && ETH_ADDRESS_REGEX.test(value);
}

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // Validate required variables
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`${varName} is required but not set`);
    } else if (varName.includes('URL')) {
      try {
        new URL(value);
      } catch {
        errors.push(`${varName} must be a valid URL (got: ${value})`);
      }
    } else if (varName.includes('ADDRESS')) {
      if (!isValidEthAddress(value)) {
        errors.push(`${varName} must be a valid 0x-prefixed 40-char hex address`);
      }
    }
  }

  // Check for localhost in production
  if (isProduction) {
    if (process.env.VITE_API_URL?.includes('localhost')) {
      warnings.push('VITE_API_URL contains localhost - this should not be used in production');
    }
    if (process.env.VITE_AUTH_URL?.includes('localhost')) {
      warnings.push('VITE_AUTH_URL contains localhost - this should not be used in production');
    }
  }

  // Report errors
  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:\n');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nPlease set the required environment variables.\n');
    process.exit(1);
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:\n');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Success
  if (errors.length === 0) {
    console.log('✅ Environment variables validated successfully');
  }
}

validateEnv();
