/**
 * Production-safe logging utility
 * Logs are stripped in production builds or gated by environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private shouldLog(level: LogLevel): boolean {
    // In production, only log errors and warnings
    if (this.isProduction) {
      return level === 'error' || level === 'warn';
    }
    // In development, log everything
    return true;
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Log WebSocket events (only in development)
   */
  websocket(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log('[WebSocket]', ...args);
    }
  }

  /**
   * Log trade/debugging info (only in development)
   */
  trade(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log('[Trade]', ...args);
    }
  }

  /**
   * Log API calls (only in development)
   */
  api(...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log('[API]', ...args);
    }
  }
}

export const logger = new Logger();
