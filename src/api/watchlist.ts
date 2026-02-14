import { apiClient } from "@/services/apiClient";
import { env } from "@/utils/env";
import { logger } from "@/utils/logger";

const API_BASE_URL = env.VITE_API_URL;
// Normalize to ensure we always target the /api prefix exactly once
const BASE = (API_BASE_URL || "").replace(/\/$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

export interface WatchlistToken {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  logoUrl?: string;
  description?: string;
  graduated: boolean;
  deploymentTimestamp?: string;
  graduationTimestamp?: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  priceChange6h: number | null;
  priceChange1h: number | null;
  priceChange5m: number | null;
  totalVolume: number | null;
  marketCap: string | null;
}

export interface WatchlistResponse {
  success: boolean;
  message: string;
  data: {
    walletAddress: string;
    tokens: WatchlistToken[];
    count: number;
  };
}

export interface WatchlistCheckResponse {
  success: boolean;
  message: string;
  data: {
    inWatchlist: boolean;
  };
}

export interface WatchlistActionResponse {
  success: boolean;
  message: string;
  data?: {
    watchlistId?: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    tokenName?: string;
  };
}

/**
 * Get user's watchlist with enriched token data
 * Public endpoint - requires wallet address parameter
 */
export const getUserWatchlist = async (
  walletAddress: string
): Promise<WatchlistToken[]> => {
  try {
    const url = `${API_ROOT}/user/${walletAddress}/watchlist`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.error("Failed to fetch watchlist");
      return [];
    }

    const data: WatchlistResponse = await response.json();

    if (!data || !data.success || !data.data.tokens) {
      return [];
    }

    return data.data.tokens;
  } catch (error) {
    logger.error("Error fetching watchlist:", error);
    return [];
  }
};

/**
 * Add token to user's watchlist
 * Authenticated endpoint - wallet address comes from JWT
 */
export const addToWatchlist = async (
  tokenAddress: string,
  chain: string
): Promise<boolean> => {
  try {
    const data: WatchlistActionResponse = await apiClient.post("/watchlist", {
      tokenAddress,
      chain,
    });
    return data.success;
  } catch (error) {
    logger.error("Error adding to watchlist:", error);
    return false;
  }
};

/**
 * Remove token from user's watchlist
 * Authenticated endpoint - wallet address comes from JWT
 */
export const removeFromWatchlist = async (
  tokenAddress: string,
  chain: string
): Promise<boolean> => {
  try {
    const data: WatchlistActionResponse = await apiClient.request("/watchlist", {
      method: "DELETE",
      body: {
        tokenAddress,
        chain,
      },
    });
    return data.success;
  } catch (error) {
    logger.error("Error removing from watchlist:", error);
    return false;
  }
};

/**
 * Check if token is in user's watchlist
 * Authenticated endpoint - wallet address comes from JWT
 */
export const checkWatchlist = async (
  tokenAddress: string,
  chain: string
): Promise<boolean> => {
  try {
    const data: WatchlistCheckResponse = await apiClient.get(
      `/watchlist/check?tokenAddress=${tokenAddress}&chain=${chain}`
    );
    return data.success && data.data.inWatchlist;
  } catch (error) {
    logger.error("Error checking watchlist:", error);
    return false;
  }
};
