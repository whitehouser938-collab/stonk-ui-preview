#!/usr/bin/env node

/**
 * Build-time environment variable validation
 * This script validates required environment variables before build
 */

const requiredEnvVars = [
  'VITE_API_URL',
  'VITE_AUTH_URL',
  'VITE_WALLETCONNECT_PROJECT_ID',
];

const optionalEnvVars = [
  'VITE_WEBSOCKET_URL',
];

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
