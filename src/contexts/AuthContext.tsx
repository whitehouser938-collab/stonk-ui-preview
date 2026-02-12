import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";
import { logger } from "@/utils/logger";
import { env } from "@/utils/env";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  walletAddress: string;
  username?: string;
  pfp?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  /** true while the initial /auth/me check is in flight */
  isLoading: boolean;
  signIn: (options?: { isManual?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAppKitAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to avoid stale closures in the refresh interval
  const userRef = useRef(user);
  userRef.current = user;

  // Track which addresses we've attempted to sign in (to prevent infinite loops)
  const attemptedSignInRef = useRef<Set<string>>(new Set());

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const checkAuthStatus = async () => {
    try {
      const res = await fetch(`${env.VITE_AUTH_URL}/auth/me`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return;
        }
      }

      // If the session cookie is expired, try refreshing once
      if (res.status === 401) {
        const refreshed = await handleRefreshToken();
        if (refreshed) {
          // Retry /auth/me with the fresh session cookie
          const retryRes = await fetch(`${env.VITE_AUTH_URL}/auth/me`, {
            credentials: "include",
          });
          if (retryRes.ok) {
            const data = await retryRes.json();
            if (data.authenticated && data.user) {
              setUser(data.user);
            }
          }
        }
      }
    } catch (error) {
      logger.error("Auth status check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Attempt to refresh the session using the httpOnly refresh cookie.
   * Returns true if the refresh succeeded.
   */
  const handleRefreshToken = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${env.VITE_AUTH_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // No body needed – the refresh token lives in an httpOnly cookie
      });

      if (!res.ok) {
        // Refresh failed – user must re-authenticate
        setUser(null);
        return false;
      }

      // New cookies are set automatically by the response
      return true;
    } catch (error) {
      logger.error("Token refresh error:", error);
      setUser(null);
      return false;
    }
  };

  // ------------------------------------------------------------------
  // Sign in (SIWE flow)
  // ------------------------------------------------------------------
  const signIn = useCallback(async (options?: { isManual?: boolean }) => {
    if (!address || !walletClient) {
      throw new Error("Wallet not connected");
    }

    // For manual sign-in, always clear the tracking to allow retry
    if (options?.isManual && address) {
      logger.info("Manual sign-in requested, clearing tracking", { address });
      attemptedSignInRef.current.delete(address.toLowerCase());
    }

    setIsAuthenticating(true);

    try {
      // 1. Request nonce from auth service
      logger.info("Requesting nonce", { address });
      const nonceRes = await fetch(`${env.VITE_AUTH_URL}/auth/nonce?address=${address}`, {
        credentials: "include",
      });
      if (!nonceRes.ok) {
        logger.error("Failed to get nonce", { status: nonceRes.status });
        throw new Error("Failed to get nonce");
      }
      const { nonce } = await nonceRes.json();
      logger.info("Nonce received", { nonce });

      // 2. Generate SIWE message
      const message = generateSIWEMessage(address, nonce);
      logger.info("Generated SIWE message", { messagePreview: message.substring(0, 100) });

      // 3. Request signature from wallet
      logger.info("Requesting signature from wallet...");
      const signature = await walletClient.signMessage({ message });
      logger.info("Signature received", { signatureLength: signature.length });

      // 4. Verify signature with auth service
      //    The backend sets httpOnly cookies on success and returns user data.
      logger.info("Sending verify request", { address });
      const verifyRes = await fetch(`${env.VITE_AUTH_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          walletAddress: address,
          signature,
          message,
        }),
      });

      logger.info("Verify response received", {
        status: verifyRes.status,
        statusText: verifyRes.statusText,
        ok: verifyRes.ok
      });

      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        logger.error("Verify request failed", { error });
        throw new Error(error.message || "Signature verification failed");
      }

      const responseData = await verifyRes.json();
      logger.info("Verify response data", {
        hasUser: !!responseData.user,
        userData: responseData.user,
        responseKeys: Object.keys(responseData)
      });

      const { user: userData } = responseData;

      if (!userData) {
        logger.error("No user data in verify response", { responseData });
        throw new Error("Authentication succeeded but no user data received");
      }

      logger.info("Setting user data", { userData });
      setUser(userData);

      // Show success notification
      toast({
        title: "Signed In Successfully",
        description: `Welcome back${userData.username ? ", " + userData.username : ""}!`,
      });
    } catch (error: any) {
      logger.error("Sign in error:", {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });

      // Handle user rejection
      if (error.code === 4001 || error.message?.includes("User rejected") || error.message?.includes("rejected")) {
        logger.warn("User rejected signature request");
        throw new Error("Signature request rejected");
      }
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, walletClient]);

  // ------------------------------------------------------------------
  // Sign out
  // ------------------------------------------------------------------
  const signOut = useCallback(async () => {
    try {
      // Tell the backend to invalidate the refresh token and clear cookies
      await fetch(`${env.VITE_AUTH_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // No body needed – the refresh token is in the httpOnly cookie
      });
    } catch (error) {
      logger.error("Logout error:", error);
    }

    // Clear local state
    setUser(null);

    // Optionally clear search history
    if (address) {
      localStorage.removeItem(`search:history:${address.toLowerCase()}`);
    }
  }, [address]);

  // ------------------------------------------------------------------
  // Effects
  // ------------------------------------------------------------------

  // Check auth status on mount via /auth/me (cookies sent automatically)
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Auto-refresh the session cookie before it expires (15 min TTL).
  // We refresh at 13 min to leave a comfortable buffer.
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      await handleRefreshToken();
    }, 13 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Auto-authenticate when wallet connects (if not already authenticated)
  useEffect(() => {
    if (isConnected && address && !user && !isAuthenticating && !isLoading) {
      // Don't retry if we've already attempted sign-in for this address
      if (attemptedSignInRef.current.has(address.toLowerCase())) {
        logger.info("Already attempted sign-in for this address, skipping", { address });
        return;
      }

      logger.info("Wallet connected, triggering auto sign-in", { address });
      attemptedSignInRef.current.add(address.toLowerCase());

      signIn().catch((error) => {
        logger.error("Auto sign-in failed:", error);
        // Don't remove from attempted set - we don't want to retry automatically
      });
    }
  }, [isConnected, address, user, isAuthenticating, isLoading, signIn]);

  // Clear auth when the wallet is disconnected
  useEffect(() => {
    if (!isConnected) {
      if (user) {
        signOut();
      }
      // Clear attempted sign-in tracking when wallet disconnects
      attemptedSignInRef.current.clear();
    }
  }, [isConnected, user, signOut]);

  // ------------------------------------------------------------------
  // Context value
  // ------------------------------------------------------------------
  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isAuthenticating,
    isLoading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// SIWE message format (EIP-4361)
function generateSIWEMessage(address: string, nonce: string): string {
  const domain = window.location.host;
  const origin = window.location.origin;
  const timestamp = new Date().toISOString();

  return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to Stonk Terminal

URI: ${origin}
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${timestamp}`;
}
