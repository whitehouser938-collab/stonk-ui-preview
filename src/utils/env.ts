/**
 * Environment variable validation and access
 * Validates required environment variables at build time
 */

import { logger } from './logger';

interface EnvConfig {
  VITE_API_URL: string;
  VITE_AUTH_URL: string;
  VITE_WALLETCONNECT_PROJECT_ID: string;
  VITE_WEBSOCKET_URL?: string;
}

function validateEnv(): EnvConfig {
  const apiUrl = import.meta.env.VITE_API_URL;
  const authUrl = import.meta.env.VITE_AUTH_URL;
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

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

  if (errors.length > 0) {
    const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;
    
    if (import.meta.env.PROD) {
      // In production, throw error to fail build
      throw new Error(errorMessage);
    } else {
      // In development, warn but don't fail
      logger.warn(errorMessage);
      logger.warn('Using fallback values. Set environment variables in .env file');
    }
  }

  return {
    VITE_API_URL: apiUrl || 'http://localhost:3000',
    VITE_AUTH_URL: authUrl || 'http://localhost:3001',
    VITE_WALLETCONNECT_PROJECT_ID: walletConnectProjectId || '',
    VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL,
  };
}

// Validate on module load
export const env = validateEnv();
