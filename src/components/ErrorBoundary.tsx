import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import { env } from '@/utils/env';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, errorInfo);

    if (import.meta.env.PROD && env.VITE_ERROR_REPORTING_URL) {
      try {
        fetch(env.VITE_ERROR_REPORTING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify({
            message: error.message,
            name: error.name,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            {!import.meta.env.PROD && this.state.error && (
              <pre className="text-left text-xs bg-muted p-4 rounded mb-4 overflow-auto max-h-48">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleReset}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
