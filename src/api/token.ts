import { Chain } from "@/types";

import { getApiBaseUrl } from "@/utils/apiConfig";

const API_BASE_URL = getApiBaseUrl();

export const getExplorer = (chain: Chain) => {
  switch (chain) {
    case "SEP":
      return "https://sepolia.etherscan.io";
    default:
      return "https://sepolia.etherscan.io";
  }
};

export const addToken = async (tokenData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenData),
    });

    if (!response.ok) {
      throw new Error("Failed to add token");
    }

    const resData = await response.json();
    if (!resData || !resData.success) {
      throw new Error("Token addition unsuccessful");
    }
    console.log("Token added successfully:", resData);
    return resData.data;
  } catch (error) {
    console.error("Error adding token:", error);
    throw error;
  }
};

export const getToken = async (chainId: string, tokenAddress: string) => {
  try {
    // Use the new merged endpoint that combines Graph + Postgres data
    const response = await fetch(
      // `${API_BASE_URL}/token/${tokenAddress}?chain=${chainId}`
      `${API_BASE_URL}/token/find?address=${tokenAddress}&chain=${chainId}`
    );
    console.log(response);
    if (!response.ok) {
      throw new Error("Failed to fetch token data");
    }
    const tokenData = await response.json();
    if (!tokenData || !tokenData.success) {
      throw new Error("Token not found or invalid response");
    }
    return tokenData.data;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
};

export const uploadTokenLogo = async (
  tokenId: string,
  file: File,
  tokenName: string,
  tokenSymbol: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tokenId", tokenId);
  formData.append("tokenName", tokenName);
  formData.append("tokenSymbol", tokenSymbol);
  console.log("++++++");
  console.log(formData);
  console.log("++++++");

  try {
    const response = await fetch(`${API_BASE_URL}/upload/token-logo`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload token logo");
    }

    const resData = await response.json();
    if (!resData || !resData.success) {
      throw new Error("Logo upload unsuccessful");
    }
    return resData.url;
  } catch (error) {
    console.error("Error uploading token logo:", error);
    throw error;
  }
};

export const updateTokenLogoUrl = async (tokenId: string, logoUrl: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/token/${tokenId}/logo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tokenId, logoUrl }),
    });
    if (!response.ok) {
      throw new Error("Failed to update token logo URL");
    }
    const resData = await response.json();
    if (!resData || !resData.success) {
      throw new Error("Logo URL update unsuccessful");
    }
    return resData.data;
  } catch (error) {
    console.error("Error updating token logo URL:", error);
    throw error;
  }
};

// Types for search functionality
export interface SearchTokensParams {
  q: string; // Search query
  limit?: number; // Optional limit (default: 10, max: 50)
  chain?: string; // Optional chain
}

export interface SearchTokensResponse {
  success: boolean;
  message: string;
  data: {
    tokens: any[]; // Array of token objects
    query: string;
    totalCount: number;
    limit: number;
    hasMore: boolean;
  };
}

export const searchTokens = async (
  params: SearchTokensParams
): Promise<SearchTokensResponse> => {
  try {
    const searchParams = new URLSearchParams({
      q: params.q,
      ...(params.limit && { limit: params.limit.toString() }),
      ...(params.chain && { chain: params.chain }),
    });
    const response = await fetch(
      `${API_BASE_URL}/token/search?${searchParams.toString()}`
    );
    if (!response.ok) {
      throw new Error("Failed to search tokens");
    }
    const searchData = await response.json();
    if (!searchData || !searchData.success) {
      throw new Error("Token search unsuccessful");
    }
    return searchData;
  } catch (error) {
    console.error("Error searching tokens:", error);
    throw error;
  }
};

export const getTokenTrades = async (
  chainId: string,
  tokenAddress: string,
  limit: number = 20,
  cursorId?: string
): Promise<any[]> => {
  try {
    const cursorIdQuery = cursorId ? `&cursorId=${cursorId}` : "";
    console.log(cursorIdQuery, " Cur id query");
    const response = await fetch(
      `${API_BASE_URL}/token/trades/${tokenAddress}?chain=${chainId}&limit=${limit}${cursorIdQuery}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch token trades");
    }
    const data = await response.json();
    if (!data || !data.success || !data.data.trades) {
      return [];
    }
    return data.data.trades;
  } catch (error) {
    console.error("Error fetching token trades:", error);
    return [];
  }
};

export const getAllTokens = async (chain?: string): Promise<any[]> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/all?chain=${chain}`
      : `${API_BASE_URL}/token/all`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch all tokens");
    }
    const data = await response.json();
    if (!data || !data.success || !data.data.tokens) {
      return [];
    }
    return data.data.tokens;
  } catch (error) {
    console.error("Error fetching all tokens:", error);
    return [];
  }
};

export const getBondingCurveVolumeData = async (
  chain?: string
): Promise<any[]> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/bonding-curve/volume?chain=${chain}`
      : `${API_BASE_URL}/token/bonding-curve/volume`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch bonding curve volume data");
    }
    const data = await response.json();
    if (!data || !data.success || !data.data.tokens) {
      return [];
    }
    return data.data.tokens;
  } catch (error) {
    console.error("Error fetching bonding curve volume data:", error);
    return [];
  }
};

// Market overview statistics API functions
export const getGraduationPercentage = async (chain?: string): Promise<any> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/stats/graduation-percentage?chain=${chain}`
      : `${API_BASE_URL}/token/stats/graduation-percentage`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch graduation percentage");
    }
    const data = await response.json();
    if (!data || !data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching graduation percentage:", error);
    return null;
  }
};

export const getTotalTokensCreated = async (chain?: string): Promise<any> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/stats/total-tokens?chain=${chain}`
      : `${API_BASE_URL}/token/stats/total-tokens`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch total tokens created");
    }
    const data = await response.json();
    if (!data || !data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching total tokens created:", error);
    return null;
  }
};

export const getTotalBondingCurveVolume = async (
  chain?: string
): Promise<any> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/stats/bonding-curve-volume?chain=${chain}`
      : `${API_BASE_URL}/token/stats/bonding-curve-volume`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch total bonding curve volume");
    }
    const data = await response.json();
    if (!data || !data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching total bonding curve volume:", error);
    return null;
  }
};

export const getTopTokenMarketCap = async (chain?: string): Promise<any> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/stats/top-token-mcap?chain=${chain}`
      : `${API_BASE_URL}/token/stats/top-token-mcap`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch top token market cap");
    }
    const data = await response.json();
    if (!data || !data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching top token market cap:", error);
    return null;
  }
};

// Precise volume data API functions
export const getTokenPreciseVolume = async (
  tokenAddress: string,
  chain?: string
): Promise<any> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/${tokenAddress}/volume?chain=${chain}`
      : `${API_BASE_URL}/token/${tokenAddress}/volume`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch token precise volume");
    }
    const data = await response.json();
    if (!data || !data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching token precise volume:", error);
    return null;
  }
};

export const getAllTokensPreciseVolume = async (
  chain?: string
): Promise<any[]> => {
  try {
    const url = chain
      ? `${API_BASE_URL}/token/volume/all?chain=${chain}`
      : `${API_BASE_URL}/token/volume/all`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch all tokens precise volume");
    }
    const data = await response.json();
    if (!data || !data.success || !data.data.tokens) {
      return [];
    }
    return data.data.tokens;
  } catch (error) {
    console.error("Error fetching all tokens precise volume:", error);
    return [];
  }
};

export const getAggregatedVolumeStats = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/token/volume/stats`);
    if (!response.ok) {
      throw new Error("Failed to fetch aggregated volume stats");
    }
    const data = await response.json();
    if (!data || !data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching aggregated volume stats:", error);
    return null;
  }
};

export const getVolumeWithIntervals = async (
  interval?: string,
  chain?: string
): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    if (interval) params.append("interval", interval);
    if (chain) params.append("chain", chain);

    const url = `${API_BASE_URL}/token/volume/intervals${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch volume data with intervals");
    }
    const data = await response.json();
    if (!data || !data.success || !data.data.tokens) {
      return [];
    }
    return data.data.tokens;
  } catch (error) {
    console.error("Error fetching volume data with intervals:", error);
    return [];
  }
};

export const getMarketOverview = async (): Promise<any> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/token/dashboard/market-overview`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch market overview");
    }
    const data = await response.json();
    if (!data || !data.success) {
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching market overview:", error);
    return null;
  }
};

export const getVolumeLeaders = async (limit?: number): Promise<any[]> => {
  try {
    const url = limit
      ? `${API_BASE_URL}/token/dashboard/volume-leaders?limit=${limit}`
      : `${API_BASE_URL}/token/dashboard/volume-leaders`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch volume leaders");
    }
    const data = await response.json();
    if (!data || !data.success || !data.data) {
      return [];
    }
    return data.data;
  } catch (error) {
    console.error("Error fetching volume leaders:", error);
    return [];
  }
};

// Types for token holders
export interface TokenHolder {
  holderAddress: string;
  balance: string;
  balanceRawInteger: string;
  pfp?: string;
  username?: string;
}

export interface TokenHoldersResponse {
  success: boolean;
  message: string;
  data: {
    blockchain: string;
    contractAddress: string;
    tokenDecimals: number;
    holders: TokenHolder[];
    holdersCount: number;
    syncStatus: {
      timestamp: number;
      lag: string;
      status: string;
    };
  };
}

export const getTokenHolders = async (
  tokenAddress: string
): Promise<TokenHoldersResponse> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/token/${tokenAddress}/holders`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch token holders");
    }
    const data = await response.json();
    if (!data || !data.success) {
      throw new Error("Token holders fetch unsuccessful");
    }
    return data;
  } catch (error) {
    console.error("Error fetching token holders:", error);
    throw error;
  }
};
