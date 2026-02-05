import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";

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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAppKitAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Load stored tokens on mount
  useEffect(() => {
    const storedSession = localStorage.getItem("auth:sessionToken");
    const storedRefresh = localStorage.getItem("auth:refreshToken");

    if (storedSession) {
      setSessionToken(storedSession);
      // Optionally validate token with backend
    }
    if (storedRefresh) {
      setRefreshToken(storedRefresh);
    }
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!sessionToken) return;

    // JWT expires in 15 min, refresh at 14 min
    const refreshInterval = setInterval(async () => {
      await handleRefreshToken();
    }, 14 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [sessionToken]);

  // Clear auth on wallet disconnect
  useEffect(() => {
    if (!isConnected && user) {
      signOut();
    }
  }, [isConnected]);

  const signIn = useCallback(async () => {
    if (!address || !walletClient) {
      throw new Error("Wallet not connected");
    }

    setIsAuthenticating(true);

    try {
      // 1. Request nonce from auth service
      const nonceRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/auth/nonce?address=${address}`);
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce, expiresAt } = await nonceRes.json();

      // 2. Generate SIWE message
      const message = generateSIWEMessage(address, nonce);

      // 3. Request signature from wallet
      const signature = await walletClient.signMessage({ message });

      // 4. Verify signature with auth service
      const verifyRes = await fetch(`${import.meta.env.VITE_AUTH_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const { sessionToken: newSession, refreshToken: newRefresh, user: userData } = await verifyRes.json();

      // 5. Store tokens
      setSessionToken(newSession);
      setRefreshToken(newRefresh);
      setUser(userData);
      localStorage.setItem("auth:sessionToken", newSession);
      localStorage.setItem("auth:refreshToken", newRefresh);
    } catch (error: any) {
      console.error("Sign in error:", error);

      // Handle user rejection
      if (error.code === 4001 || error.message?.includes("User rejected")) {
        throw new Error("Signature request rejected");
      }
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, walletClient]);

  const handleRefreshToken = async () => {
    if (!refreshToken) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_AUTH_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        // Refresh token invalid/expired - force re-auth
        signOut();
        return;
      }

      const { sessionToken: newSession, refreshToken: newRefresh } = await res.json();

      setSessionToken(newSession);
      setRefreshToken(newRefresh);
      localStorage.setItem("auth:sessionToken", newSession);
      localStorage.setItem("auth:refreshToken", newRefresh);
    } catch (error) {
      console.error("Token refresh error:", error);
      signOut();
    }
  };

  const signOut = useCallback(async () => {
    if (refreshToken) {
      // Invalidate on auth service
      try {
        await fetch(`${import.meta.env.VITE_AUTH_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    // Clear local state
    setUser(null);
    setSessionToken(null);
    setRefreshToken(null);
    localStorage.removeItem("auth:sessionToken");
    localStorage.removeItem("auth:refreshToken");

    // Optionally clear search history
    if (address) {
      localStorage.removeItem(`search:history:${address.toLowerCase()}`);
    }
  }, [refreshToken, address]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user && !!sessionToken,
    isAuthenticating,
    signIn,
    signOut,
    sessionToken,
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
