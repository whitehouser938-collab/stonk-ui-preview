import { useState, useEffect, useCallback, useRef } from "react";
import {
  Comment,
  Reply,
  createComment,
  getComments,
  createReply,
  getReplies,
  toggleLike,
  getLikeStatus,
  deleteComment,
  deleteReply,
  updateComment,
  updateReply,
} from "@/api/comment";
import { logger } from "@/utils/logger";

interface UseCommentsProps {
  tokenId: string;
  userId: string;
  page?: number;
  limit?: number;
}

export const useComments = ({
  tokenId,
  userId,
  page = 1,
  limit = 20,
}: UseCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!tokenId) {
      logger.debug("useComments: No tokenId, skipping fetch");
      return;
    }

    logger.debug("useComments: Fetching comments for tokenId:", tokenId);
    setLoading(true);
    setError(null);

    try {
      const response = await getComments({
        tokenId,
        page,
        limit,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      logger.debug("useComments: API response:", response);

      if (response.success && response.data) {
        setComments(response.data.items || []);
        setPagination(
          response.data.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          }
        );
        logger.debug(
          "useComments: Comments loaded successfully:",
          response.data.items?.length || 0,
          "comments"
        );
        retryCountRef.current = 0; // Reset retry count on success
      } else {
        logger.error("useComments: API returned error:", response.message);
        setComments([]);
        setError(response.message || "Failed to fetch comments");
      }
    } catch (err) {
      logger.error("useComments: Error fetching comments:", err);

      // Retry logic for network errors
      if (
        retryCountRef.current < 2 &&
        (err instanceof TypeError || err.message?.includes("fetch"))
      ) {
        logger.debug(
          `useComments: Retrying fetch (attempt ${retryCountRef.current + 1}/2)`
        );
        retryCountRef.current += 1;
        setTimeout(() => {
          fetchComments();
        }, 1000 * retryCountRef.current); // Exponential backoff
        return;
      }

      setError(err instanceof Error ? err.message : "Failed to fetch comments");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [tokenId, page, limit]);

  // Create comment
  const addComment = useCallback(
    async (content: string) => {
      if (!tokenId || !userId || userId === "skip") return;

      try {
        const response = await createComment({
          content,
          tokenId,
          userId,
        });

        if (response.success) {
          setComments((prev) => [response.data, ...prev]);
          return response.data;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create comment"
        );
        logger.error("Error creating comment:", err);
        throw err;
      }
    },
    [tokenId, userId]
  );

  // Create reply
  const addReply = useCallback(
    async (commentId: string, content: string) => {
      if (!userId || userId === "skip") return;

      try {
        const response = await createReply({
          content,
          commentId,
          userId,
        });

        if (response.success) {
          // Update the comment with the new reply
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId
                ? {
                    ...comment,
                    replies: [...(comment.replies || []), response.data],
                  }
                : comment
            )
          );
          return response.data;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create reply");
        logger.error("Error creating reply:", err);
        throw err;
      }
    },
    [userId]
  );

  // Toggle like for comment or reply
  const handleLike = useCallback(
    async (commentId: string, replyId?: string) => {
      if (!userId || userId === "skip") return;

      try {
        const response = await toggleLike({
          userId,
          commentId: replyId ? undefined : commentId,
          replyId,
        });

        if (response.success) {
          if (replyId) {
            // Update reply like
            setComments((prev) =>
              prev.map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      replies: (comment.replies || []).map((reply) =>
                        reply.id === replyId
                          ? {
                              ...reply,
                              isLiked: response.data.liked,
                              _count: {
                                ...reply._count,
                                likes: response.data.liked
                                  ? (reply._count?.likes || 0) + 1
                                  : Math.max((reply._count?.likes || 0) - 1, 0),
                              },
                            }
                          : reply
                      ),
                    }
                  : comment
              )
            );
          } else {
            // Update comment like
            setComments((prev) =>
              prev.map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      isLiked: response.data.liked,
                      _count: {
                        ...comment._count,
                        likes: response.data.liked
                          ? (comment._count?.likes || 0) + 1
                          : Math.max((comment._count?.likes || 0) - 1, 0),
                      },
                    }
                  : comment
              )
            );
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to toggle like");
        logger.error("Error toggling like:", err);
        throw err;
      }
    },
    [userId]
  );

  // Delete comment
  const removeComment = useCallback(
    async (commentId: string) => {
      if (!userId || userId === "skip") return;

      try {
        const response = await deleteComment(commentId, userId);

        if (response.success) {
          setComments((prev) =>
            prev.filter((comment) => comment.id !== commentId)
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete comment"
        );
        logger.error("Error deleting comment:", err);
        throw err;
      }
    },
    [userId]
  );

  // Delete reply
  const removeReply = useCallback(
    async (commentId: string, replyId: string) => {
      if (!userId || userId === "skip") return;

      try {
        const response = await deleteReply(replyId, userId);

        if (response.success) {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId
                ? {
                    ...comment,
                    replies: (comment.replies || []).filter(
                      (reply) => reply.id !== replyId
                    ),
                  }
                : comment
            )
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete reply");
        logger.error("Error deleting reply:", err);
        throw err;
      }
    },
    [userId]
  );

  // Update comment
  const editComment = useCallback(
    async (commentId: string, content: string) => {
      if (!userId || userId === "skip") return;

      try {
        const response = await updateComment(commentId, { content, userId });

        if (response.success) {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId
                ? {
                    ...comment,
                    content: response.data.content,
                    updatedAt: response.data.updatedAt,
                  }
                : comment
            )
          );
          return response.data;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update comment"
        );
        logger.error("Error updating comment:", err);
        throw err;
      }
    },
    [userId]
  );

  // Update reply
  const editReply = useCallback(
    async (commentId: string, replyId: string, content: string) => {
      if (!userId || userId === "skip") return;

      try {
        const response = await updateReply(replyId, { content, userId });

        if (response.success) {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId
                ? {
                    ...comment,
                    replies: (comment.replies || []).map((reply) =>
                      reply.id === replyId
                        ? {
                            ...reply,
                            content: response.data.content,
                            updatedAt: response.data.updatedAt,
                          }
                        : reply
                    ),
                  }
                : comment
            )
          );
          return response.data;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update reply");
        logger.error("Error updating reply:", err);
        throw err;
      }
    },
    [userId]
  );

  // Load like statuses for all comments and replies
  const loadLikeStatuses = useCallback(
    async (commentsToProcess: Comment[]) => {
      if (!userId || userId === "skip" || !commentsToProcess.length) return;

      try {
        const likePromises = commentsToProcess.flatMap((comment) => [
          getLikeStatus({ userId, commentId: comment.id }),
          ...(comment.replies || []).map((reply) =>
            getLikeStatus({ userId, replyId: reply.id })
          ),
        ]);

        const likeResults = await Promise.allSettled(likePromises);

        setComments((prev) => {
          let likeIndex = 0;
          return prev.map((comment) => {
            const commentLikeResult = likeResults[likeIndex++];
            const updatedReplies = (comment.replies || []).map((reply) => {
              const replyLikeResult = likeResults[likeIndex++];
              if (replyLikeResult && replyLikeResult.status === "fulfilled") {
                return {
                  ...reply,
                  isLiked: replyLikeResult.value.data.liked,
                };
              }
              return reply;
            });

            if (commentLikeResult && commentLikeResult.status === "fulfilled") {
              return {
                ...comment,
                isLiked: commentLikeResult.value.data.liked,
                replies: updatedReplies,
              };
            }

            return { ...comment, replies: updatedReplies };
          });
        });
      } catch (err) {
        logger.error("Error loading like statuses:", err);
      }
    },
    [userId]
  );

  // Load comments on mount and when dependencies change
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Load like statuses when comments change
  useEffect(() => {
    if (comments && comments.length > 0) {
      loadLikeStatuses(comments);
    }
  }, [loadLikeStatuses, comments.length]);

  return {
    comments,
    loading,
    error,
    pagination,
    addComment,
    addReply,
    handleLike,
    removeComment,
    removeReply,
    editComment,
    editReply,
    refetch: fetchComments,
  };
};
