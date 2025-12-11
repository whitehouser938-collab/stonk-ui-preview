const API_BASE_URL = import.meta.env.VITE_API_URL;
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
 */
export const getUserWatchlist = async (
  walletAddress: string
): Promise<WatchlistToken[]> => {
  try {
    const url = `${API_ROOT}/user/${walletAddress}/watchlist`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Failed to fetch watchlist");
      return [];
    }

    const data: WatchlistResponse = await response.json();

    if (!data || !data.success || !data.data.tokens) {
      return [];
    }

    return data.data.tokens;
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return [];
  }
};

/**
 * Add token to user's watchlist
 */
export const addToWatchlist = async (
  walletAddress: string,
  tokenAddress: string,
  chain: string
): Promise<boolean> => {
  try {
    const url = `${API_ROOT}/watchlist`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        tokenAddress,
        chain,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to add to watchlist:", errorData.message);
      return false;
    }

    const data: WatchlistActionResponse = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    return false;
  }
};

/**
 * Remove token from user's watchlist
 */
export const removeFromWatchlist = async (
  walletAddress: string,
  tokenAddress: string,
  chain: string
): Promise<boolean> => {
  try {
    const url = `${API_ROOT}/watchlist`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        tokenAddress,
        chain,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to remove from watchlist:", errorData.message);
      return false;
    }

    const data: WatchlistActionResponse = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    return false;
  }
};

/**
 * Check if token is in user's watchlist
 */
export const checkWatchlist = async (
  walletAddress: string,
  tokenAddress: string,
  chain: string
): Promise<boolean> => {
  try {
    const url = `${API_ROOT}/watchlist/check?walletAddress=${walletAddress}&tokenAddress=${tokenAddress}&chain=${chain}`;
    const response = await fetch(url);

    if (!response.ok) {
      return false;
    }

    const data: WatchlistCheckResponse = await response.json();
    return data.success && data.data.inWatchlist;
  } catch (error) {
    console.error("Error checking watchlist:", error);
    return false;
  }
};
