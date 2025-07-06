const API_BASE_URL = import.meta.env.VITE_API_URL;

export const addToken = async (tokenData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/token/create`, {
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
    return resData.token;
  } catch (error) {
    console.error("Error adding token:", error);
    throw error;
  }
};

export const getToken = async (chainId: string, tokenAddress: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/token/find?chain=${chainId}&address=${tokenAddress}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch token data");
    }

    const tokenData = await response.json();
    console.log("Fetched token data:", tokenData);
    if (!tokenData || !tokenData.data) {
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
