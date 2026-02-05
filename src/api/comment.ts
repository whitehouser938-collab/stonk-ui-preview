import { apiClient } from "@/services/apiClient";

// Types for comment API
export interface Comment {
  id: string;
  content: string;
  tokenId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    walletAddress: string;
    username?: string;
    pfp?: string;
  };
  likes: Like[];
  replies: Reply[];
  isLiked?: boolean;
  _count: {
    replies: number;
    likes: number;
  };
}

export interface Like {
  id: string;
  userId: string;
  createdAt: string;
  user: {
    walletAddress: string;
    username?: string;
    pfp?: string;
  };
}

export interface Reply {
  id: string;
  content: string;
  commentId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    walletAddress: string;
    username?: string;
    pfp?: string;
  };
  likes: Like[];
  isLiked?: boolean;
  _count: {
    likes: number;
  };
}

export interface CommentStats {
  totalComments: number;
  totalReplies: number;
  totalLikes: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Comment API functions
export const createComment = async (data: {
  content: string;
  tokenId: string;
}): Promise<ApiResponse<Comment>> => {
  try {
    return await apiClient.post("/comment", data);
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
};

export const getComments = async (params: {
  tokenId?: string;
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
  try {
    const searchParams = new URLSearchParams();
    if (params.tokenId) searchParams.append("tokenId", params.tokenId);
    if (params.userId) searchParams.append("userId", params.userId);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    return await apiClient.get(`/comment?${searchParams.toString()}`);
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};

export const getCommentById = async (
  id: string
): Promise<ApiResponse<Comment>> => {
  try {
    return await apiClient.get(`/comment/${id}`);
  } catch (error) {
    console.error("Error fetching comment:", error);
    throw error;
  }
};

export const updateComment = async (
  id: string,
  data: { content: string }
): Promise<ApiResponse<Comment>> => {
  try {
    return await apiClient.put(`/comment/${id}`, data);
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
};

export const deleteComment = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    return await apiClient.delete(`/comment/${id}`);
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

// Reply API functions
export const createReply = async (data: {
  content: string;
  commentId: string;
}): Promise<ApiResponse<Reply>> => {
  try {
    return await apiClient.post("/comment/reply", data);
  } catch (error) {
    console.error("Error creating reply:", error);
    throw error;
  }
};

export const getReplies = async (params: {
  commentId: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<ApiResponse<PaginatedResponse<Reply>>> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append("commentId", params.commentId);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

    return await apiClient.get(`/comment/reply?${searchParams.toString()}`);
  } catch (error) {
    console.error("Error fetching replies:", error);
    throw error;
  }
};

export const getReplyById = async (id: string): Promise<ApiResponse<Reply>> => {
  try {
    return await apiClient.get(`/comment/reply/${id}`);
  } catch (error) {
    console.error("Error fetching reply:", error);
    throw error;
  }
};

export const updateReply = async (
  id: string,
  data: { content: string }
): Promise<ApiResponse<Reply>> => {
  try {
    return await apiClient.put(`/comment/reply/${id}`, data);
  } catch (error) {
    console.error("Error updating reply:", error);
    throw error;
  }
};

export const deleteReply = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  try {
    return await apiClient.delete(`/comment/reply/${id}`);
  } catch (error) {
    console.error("Error deleting reply:", error);
    throw error;
  }
};

// Like API functions
export const toggleLike = async (data: {
  commentId?: string;
  replyId?: string;
}): Promise<ApiResponse<{ isLiked: boolean; likes: number }>> => {
  try {
    return await apiClient.post("/comment/like", data);
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
};

export const getLikeStatus = async (params: {
  userId: string;
  commentId?: string;
  replyId?: string;
}): Promise<ApiResponse<{ liked: boolean }>> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append("userId", params.userId);
    if (params.commentId) searchParams.append("commentId", params.commentId);
    if (params.replyId) searchParams.append("replyId", params.replyId);

    return await apiClient.get(`/comment/like/status?${searchParams.toString()}`);
  } catch (error) {
    console.error("Error fetching like status:", error);
    throw error;
  }
};

// Statistics API function
export const getCommentStats = async (
  tokenId: string
): Promise<ApiResponse<CommentStats>> => {
  try {
    return await apiClient.get(`/comment/stats/${tokenId}`);
  } catch (error) {
    console.error("Error fetching comment stats:", error);
    throw error;
  }
};
