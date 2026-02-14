import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppKitAccount } from "@reown/appkit/react";
import { logger } from "@/utils/logger";

/**
 * Hook to ensure user is authenticated before performing an action.
 * Automatically triggers sign-in flow if wallet is connected but not authenticated.
 */
export function useAuthenticatedAction() {
  const { isAuthenticated, signIn, isAuthenticating } = useAuth();
  const { isConnected } = useAppKitAccount({ namespace: "eip155" });

  /**
   * Wraps an action to ensure authentication first.
   * @param action - The action to perform after authentication
   * @param onError - Optional error handler
   */
  const requireAuth = useCallback(
    async (action: () => void | Promise<void>, onError?: (error: Error) => void) => {
      // If already authenticated, just run the action
      if (isAuthenticated) {
        try {
          await action();
        } catch (error) {
          logger.error("Action failed:", error);
          onError?.(error as Error);
        }
        return;
      }

      // If wallet not connected, user needs to connect first
      if (!isConnected) {
        const message = "Please connect your wallet first";
        logger.warn(message);
        onError?.(new Error(message));
        return;
      }

      // Wallet connected but not authenticated - trigger sign-in
      if (!isAuthenticating) {
        try {
          await signIn();
          // After successful sign-in, perform the action
          await action();
        } catch (error) {
          logger.error("Authentication failed:", error);
          onError?.(error as Error);
        }
      }
    },
    [isAuthenticated, isConnected, isAuthenticating, signIn]
  );

  return { requireAuth, isAuthenticated, isAuthenticating };
}
