/**
 * Sentry error reporting initialization
 * Only initializes in production when VITE_ERROR_REPORTING_URL is set
 */

import * as Sentry from '@sentry/react';
import { env } from './env';

/**
 * Initialize Sentry for error reporting
 * Call this once at app startup before rendering
 */
export function initSentry() {
  // Only initialize with a valid DSN
  if (!env.VITE_ERROR_REPORTING_URL) {
    return;
  }

  Sentry.init({
    dsn: env.VITE_ERROR_REPORTING_URL,

    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,

    // Set environment
    environment: import.meta.env.MODE || 'production',

    // Performance monitoring - adjust sample rate as needed
    tracesSampleRate: 0.1, // 10% of transactions

    // Session replay - captures user interactions for debugging
    replaysSessionSampleRate: 0.1, // 10% of normal sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Wallet connection errors (these are expected and handled)
      'User rejected',
      'User denied',
      'MetaMask',
    ],

    // Don't send errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error | unknown, context?: Record<string, any>) {
  if (!env.VITE_ERROR_REPORTING_URL) {
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext('additional', context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!env.VITE_ERROR_REPORTING_URL) {
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error reports
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (!env.VITE_ERROR_REPORTING_URL) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  if (!env.VITE_ERROR_REPORTING_URL) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}
