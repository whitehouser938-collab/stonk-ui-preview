import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";
import { logger } from "@/utils/logger";
import { env } from "@/utils/env";

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
  signIn: () => Promise<void>;
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

  // ------------------------------------------------------------------
  // Check auth status on mount via /auth/me (cookies sent automatically)
  // ------------------------------------------------------------------
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // ------------------------------------------------------------------
  // Auto-refresh the session cookie before it expires (15 min TTL).
  // We refresh at 13 min to leave a comfortable buffer.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      await handleRefreshToken();
    }, 13 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [user]);

  // ------------------------------------------------------------------
  // Clear auth when the wallet is disconnected
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isConnected && user) {
      signOut();
    }
  }, [isConnected]);

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
  const signIn = useCallback(async () => {
    if (!address || !walletClient) {
      throw new Error("Wallet not connected");
    }

    setIsAuthenticating(true);

    try {
      // 1. Request nonce from auth service
      const nonceRes = await fetch(`${env.VITE_AUTH_URL}/auth/nonce?address=${address}`, {
        credentials: "include",
      });
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce } = await nonceRes.json();

      // 2. Generate SIWE message
      const message = generateSIWEMessage(address, nonce);

      // 3. Request signature from wallet
      const signature = await walletClient.signMessage({ message });

      // 4. Verify signature with auth service
      //    The backend sets httpOnly cookies on success and returns user data.
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

      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.message || "Signature verification failed");
      }

      const { user: userData } = await verifyRes.json();
      setUser(userData);
    } catch (error: any) {
      logger.error("Sign in error:", error);

      // Handle user rejection
      if (error.code === 4001 || error.message?.includes("User rejected")) {
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
