import * as Sentry from '@sentry/react';

/**
 * Test button for Sentry error tracking
 * Add this to your app temporarily to test if Sentry is working
 * Remove after confirming Sentry integration
 */
export function SentryTestButton() {
  return (
    <button
      onClick={() => {
        throw new Error('This is your first error!');
      }}
      className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg font-mono text-sm transition-colors"
      title="Click to test Sentry error reporting"
    >
      Break the world
    </button>
  );
}
