const API_BASE_URL = import.meta.env.VITE_API_URL;
// Normalize to ensure we always target the /api prefix exactly once
const BASE = (API_BASE_URL || "").replace(/\/$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

// Types for user functionality
export interface User {
  walletAddress: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
  profileImage?: string;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

// Normalize backend user payloads to the frontend User shape
const normalizeUser = (raw: any): User => {
  const normalized: User = {
    walletAddress: raw.walletAddress,
    username: raw.username,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    profileImage: raw.profileImage || raw.pfp || undefined,
    bio: raw.bio,
    socialLinks: raw.socialLinks,
  };
  return normalized;
};

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface UserSearchParams {
  q: string;
  limit?: number;
}

export interface UserSearchResponse {
  success: boolean;
  message: string;
  data: {
    users: User[];
    query: string;
    totalCount: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface UserListParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "walletAddress" | "username";
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface UserListResponse {
  success: boolean;
  message: string;
  data: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface UsernameAvailabilityResponse {
  success: boolean;
  message: string;
  data: {
    available: boolean;
    username: string;
  };
}

export interface UserUpdateData {
  username?: string;
  bio?: string;
  profileImage?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

// API Functions

export const getAllUsers = async (
  params?: UserListParams
): Promise<UserListResponse> => {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);
    if (params?.search) searchParams.append("search", params.search);

    const url = `${API_ROOT}/user/?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch users");
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error("Failed to fetch users");
    }

    return data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const searchUsers = async (
  params: UserSearchParams
): Promise<UserSearchResponse> => {
  try {
    const searchParams = new URLSearchParams({
      q: params.q,
      ...(params.limit && { limit: params.limit.toString() }),
    });

    const url = `${API_ROOT}/user/search?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to search users");
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error("User search unsuccessful");
    }

    return data;
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

export const getUserStats = async (): Promise<UserStats> => {
  try {
    const response = await fetch(`${API_ROOT}/user/stats`);

    if (!response.ok) {
      throw new Error("Failed to fetch user stats");
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error("Failed to fetch user stats");
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw error;
  }
};

export const checkUsernameAvailability = async (
  username: string
): Promise<UsernameAvailabilityResponse> => {
  try {
    const response = await fetch(
      `${API_ROOT}/user/username/available?q=${encodeURIComponent(username)}`
    );

    if (!response.ok) {
      throw new Error("Failed to check username availability");
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error("Failed to check username availability");
    }

    return data;
  } catch (error) {
    console.error("Error checking username availability:", error);
    throw error;
  }
};

export const getUserByUsername = async (username: string): Promise<User> => {
  try {
    const response = await fetch(
      `${API_ROOT}/user/username/${encodeURIComponent(username)}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user by username");
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error("User not found");
    }

    return normalizeUser(data.data);
  } catch (error) {
    console.error("Error fetching user by username:", error);
    throw error;
  }
};

export const getUserByWalletAddress = async (
  walletAddress: string
): Promise<User> => {
  try {
    const response = await fetch(`${API_ROOT}/user/${walletAddress}`);

    if (!response.ok) {
      throw new Error("Failed to fetch user by wallet address");
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error("User not found");
    }

    return normalizeUser(data.data);
  } catch (error) {
    console.error("Error fetching user by wallet address:", error);
    throw error;
  }
};

// New: get tokens deployed by the user (maps Token.deployerAddress to user wallet)
export const getUserTokens = async (walletAddress: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `${API_ROOT}/user/${walletAddress}/deployed-tokens`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user tokens");
    }

    const data = await response.json();
    if (!data || !data.success) {
      return [];
    }

    return data.data.deployedTokens || [];
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    return [];
  }
};

// New endpoint: set/update username for a user
export const setUsername = async (
  walletAddress: string,
  username: string
): Promise<User> => {
  try {
    const response = await fetch(`${API_ROOT}/user/${walletAddress}/username`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("Username already taken");
      } else if (response.status === 404) {
        throw new Error("User not found");
      } else {
        throw new Error(data.message || "Failed to update username");
      }
    }

    if (!data || !data.success) {
      throw new Error(data.message || "Username update unsuccessful");
    }

    return normalizeUser(data.data);
  } catch (error) {
    console.error("Error setting username:", error);
    throw error;
  }
};

// Upload a user's profile image and return the hosted URL
export const uploadUserProfileImage = async (
  walletAddress: string,
  file: File
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("walletAddress", walletAddress);

  try {
    const response = await fetch(`${API_BASE_URL}/upload/user-pfp`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload profile image");
    }

    const resData = await response.json();
    const uploadedUrl = resData?.data?.pfpUrl as string | undefined;
    if (!resData?.success || !uploadedUrl) {
      throw new Error(resData?.message || "Profile image upload unsuccessful");
    }

    return uploadedUrl;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

export const createUser = async (walletAddress: string): Promise<User> => {
  try {
    const response = await fetch(`${API_ROOT}/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
      }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("User already exists");
      } else {
        throw new Error("Failed to create user");
      }
    }

    const data = await response.json();
    if (!data || !data.success) {
      throw new Error(data.message || "User creation unsuccessful");
    }

    return normalizeUser(data.data);
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const deleteUser = async (walletAddress: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_ROOT}/user/${walletAddress}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete user");
    }

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Convenience: upsert user via POST /api/user with optional fields
export const upsertUser = async (payload: {
  walletAddress: string;
  pfp?: string;
  username?: string;
}): Promise<User> => {
  try {
    const response = await fetch(`${API_ROOT}/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to upsert user");
    }

    if (!data || !data.success) {
      throw new Error(data.message || "User upsert unsuccessful");
    }

    return normalizeUser(data.data);
  } catch (error) {
    console.error("Error upserting user:", error);
    throw error;
  }
};

// Backward-compat adapter: updateUser now uses the new endpoints
export const updateUser = async (
  walletAddress: string,
  userData: UserUpdateData
): Promise<User> => {
  // If only username provided, use the new PUT /api/user/:wallet/username
  if (userData.username && !userData.profileImage) {
    return setUsername(walletAddress, userData.username);
  }

  // Otherwise use upsert to set any combination of username/pfp
  const payload: { walletAddress: string; pfp?: string; username?: string } = {
    walletAddress,
  };
  if (userData.profileImage) payload.pfp = userData.profileImage;
  if (userData.username) payload.username = userData.username;
  return upsertUser(payload);
};

// User overview (comments, replies, stats)
export interface UserOverviewCommentToken {
  id?: string;
  chainId?: number | string;
  symbol: string;
  logoUrl?: string;
  address?: string; // legacy
  tokenAddress?: string; // new field from API
}

export interface UserOverviewComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  replyCount?: number;
  token: UserOverviewCommentToken;
  replies?: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    author: {
      id?: string;
      walletAddress: string;
      username?: string | null;
      pfp?: string | null;
    };
  }>;
}

export interface UserOverviewReply {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentId: string;
  parentComment?: {
    id: string;
    content?: string;
    createdAt?: string;
    user: {
      id?: string;
      walletAddress: string;
      username?: string | null;
      pfp?: string | null;
    };
  };
  token: UserOverviewCommentToken;
}

export interface UserOverviewStats {
  tokensDeployed: number;
  graduatedTokens: number;
  likesSent: number;
  likesReceived: number;
  commentsMade: number;
  repliesMade: number;
  repliesReceived: number;
}

export interface GetUserOverviewResponse {
  success: boolean;
  data: {
    user: User;
    activity: {
      comments: UserOverviewComment[];
      replies: UserOverviewReply[];
      likedComments?: (UserOverviewComment & {
        author: {
          id?: string;
          walletAddress: string;
          username?: string | null;
          pfp?: string | null;
        };
      })[];
    };
    stats: UserOverviewStats;
  };
}

export const getUserOverview = async (
  walletAddress: string
): Promise<GetUserOverviewResponse["data"]> => {
  if (!walletAddress) throw new Error("wallet is required");
  const response = await fetch(`${API_ROOT}/user/${walletAddress}/overview`);
  if (!response.ok) {
    const message = `Failed to fetch user overview (${response.status})`;
    throw new Error(message);
  }
  const json = await response.json();
  if (!json?.success || !json?.data) {
    throw new Error(json?.message || "Failed to fetch user overview");
  }
  return json.data as GetUserOverviewResponse["data"];
};

// Holdings API
export interface Holding {
  symbol: string;
  name: string;
  amount: string;
  decimals: string;
  logo: string;
  tokenAddress: string;
  chain: string;
  currentPrice: number;
  marketCap: string;
  totalValue: string;
  priceChange24h: number;
}

export interface UserHoldingsResponse {
  success: boolean;
  data: {
    walletAddress: string;
    holdings: Holding[];
    totalTokens: number;
  };
}

export const getUserHoldings = async (
  walletAddress: string
): Promise<UserHoldingsResponse["data"]> => {
  if (!walletAddress) throw new Error("wallet address is required");

  try {
    const response = await fetch(`${API_ROOT}/user/${walletAddress}/holdings`);

    if (!response.ok) {
      throw new Error(`Failed to fetch user holdings (${response.status})`);
    }

    const data = await response.json();

    if (!data?.success || !data?.data) {
      throw new Error(data?.message || "Failed to fetch user holdings");
    }

    // Transform the API response to match the expected Holding interface
    // The API already returns all necessary fields, so we just need to map them
    const rawHoldings = data.data.holdings || [];

    const transformedHoldings: Holding[] = rawHoldings.map(
      (rawHolding: any) => {
        // Use decimals from API or default to 18
        const decimals = rawHolding.decimals?.toString() || "18";
        const decimalsNum = parseInt(decimals);
        const balanceNum = parseFloat(rawHolding.balance || "0");
        const divisor = Math.pow(10, decimalsNum);
        const tokenAmount = balanceNum / divisor;

        // Get price data from API response (may be nested in price object or flat)
        const currentPrice =
          rawHolding.price?.currentPrice ||
          rawHolding.currentPrice ||
          rawHolding.price ||
          0;
        const marketCap =
          rawHolding.price?.marketCap ||
          rawHolding.marketCap ||
          rawHolding.mcap ||
          "0";
        const priceChange24h =
          rawHolding.price?.priceChange24h ||
          rawHolding.priceChange24h ||
          rawHolding.priceChange ||
          0;

        // Calculate total value
        const totalValue = (
          tokenAmount *
          (typeof currentPrice === "number"
            ? currentPrice
            : parseFloat(currentPrice) || 0)
        ).toString();

        return {
          symbol: rawHolding.symbol || "UNKNOWN",
          name: rawHolding.name || "Unknown Token",
          amount: rawHolding.balance || "0",
          decimals: decimals,
          logo: rawHolding.logoUrl || rawHolding.logo || "",
          tokenAddress: rawHolding.tokenAddress || rawHolding.marketAddress,
          chain: rawHolding.chain,
          currentPrice:
            typeof currentPrice === "number"
              ? currentPrice
              : parseFloat(currentPrice) || 0,
          marketCap:
            typeof marketCap === "string" ? marketCap : marketCap.toString(),
          totalValue: totalValue,
          priceChange24h:
            typeof priceChange24h === "number"
              ? priceChange24h
              : parseFloat(priceChange24h) || 0,
        };
      }
    );

    return {
      walletAddress: data.data.walletAddress,
      holdings: transformedHoldings,
      totalTokens: data.data.totalTokens || transformedHoldings.length,
    };
  } catch (error) {
    console.error("Error fetching user holdings:", error);
    throw error;
  }
};
