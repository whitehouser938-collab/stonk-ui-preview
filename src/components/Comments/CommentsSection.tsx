import React, { useState, useMemo, useEffect } from "react";
import { MessageSquare, Plus, ArrowDown, ArrowUpDown } from "lucide-react";
import { Comment } from "./Comment";
import { CommentModal } from "./CommentModal";
import { useComments } from "@/hooks/useComments";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useAppKitAccount } from "@reown/appkit/react";
import { WalletConnectionPrompt } from "@/components/WalletConnectionPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserAvatar } from "@/components/ui/avatar";

interface CommentsSectionProps {
  tokenAddress: string;
  tokenSymbol: string;
  userId?: string;
  onCommentsChange?: (count: number) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  tokenAddress,
  tokenSymbol,
  userId,
  onCommentsChange,
}) => {
  const isMobile = useIsMobile();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const { toast } = useToast();
  const { user } = useUser();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });

  // Only allow commenting if wallet is connected
  const currentUserId = useMemo(() => {
    if (!isConnected || !address) return "skip";
    return userId || user?.id || address;
  }, [isConnected, address, userId, user?.id]);

  const {
    comments,
    loading,
    error,
    addComment,
    addReply,
    handleLike: toggleLike,
    removeComment,
    removeReply,
    editComment,
    editReply,
  } = useComments({
    tokenId: tokenAddress,
    userId: currentUserId,
  });

  // Notify parent when comments count changes
  useEffect(() => {
    if (onCommentsChange && comments) {
      const totalCount = comments.length + comments.reduce(
        (total, comment) => total + (comment._count?.replies || 0),
        0
      );
      onCommentsChange(totalCount);
    }
  }, [comments, onCommentsChange]);

  const handleAddComment = async (content: string) => {
    try {
      await addComment(content);
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddReply = async (commentId: string, content: string) => {
    try {
      await addReply(commentId, content);
      toast({
        title: "Reply added",
        description: "Your reply has been posted successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reply. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (commentId: string, replyId?: string) => {
    try {
      await toggleLike(commentId, replyId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await removeComment(commentId);
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    try {
      await removeReply(commentId, replyId);
      toast({
        title: "Reply deleted",
        description: "Your reply has been deleted successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reply. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      await editComment(commentId, content);
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditReply = async (
    commentId: string,
    replyId: string,
    content: string
  ) => {
    try {
      await editReply(commentId, replyId, content);
      toast({
        title: "Reply updated",
        description: "Your reply has been updated successfully.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reply. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get current user for avatar
  const currentUserForAvatar = useMemo(() => {
    if (!isConnected || !address) return null;
    return {
      walletAddress: address,
      username: user?.username,
      pfp: user?.profileImage,
    };
  }, [isConnected, address, user]);

  // Sort comments
  const sortedComments = useMemo(() => {
    if (!comments) return [];
    const sorted = [...comments];
    if (sortOrder === "newest") {
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      return sorted.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
  }, [comments, sortOrder]);

  return (
    <div className={`${isMobile ? "bg-black" : "bg-gray-900"} p-4`}>
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Add Comment Input at Top */}
      <div className="flex items-center gap-2 mb-4">
        {/* Avatar */}
        {currentUserForAvatar ? (
          <UserAvatar user={currentUserForAvatar} size="md" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-xs text-gray-400">?</span>
          </div>
        )}
        
        {/* Input Field */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Add a comment..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 font-sans cursor-pointer"
            onClick={() => {
              if (isConnected && currentUserId) {
                setShowCommentModal(true);
              } else {
                const modal = document.querySelector('appkit-button');
                if (modal) {
                  (modal as HTMLElement).click();
                }
              }
            }}
            onFocus={() => {
              if (isConnected && currentUserId) {
                setShowCommentModal(true);
              } else {
                const modal = document.querySelector('appkit-button');
                if (modal) {
                  (modal as HTMLElement).click();
                }
              }
            }}
            onKeyDown={(e) => {
              // Open modal when user starts typing (any printable character)
              if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (isConnected && currentUserId) {
                  setShowCommentModal(true);
                } else {
                  const modal = document.querySelector('appkit-button');
                  if (modal) {
                    (modal as HTMLElement).click();
                  }
                }
              }
            }}
            readOnly
          />
        </div>

        {/* Sort Button */}
        <button
          onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-1.5 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors font-sans"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm font-sans">Loading comments...</p>
        </div>
      )}

      {/* Comments List */}
      {!loading ? (
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {sortedComments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-sm font-sans">No comments yet</p>
              <p className="text-xs font-sans">
                {isConnected
                  ? "Be the first to share your thoughts!"
                  : "Sign in to be the first to comment!"}
              </p>
            </div>
          ) : (
            sortedComments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onLike={handleLike}
                onReply={handleAddReply}
                onDelete={handleDelete}
                onDeleteReply={handleDeleteReply}
                onEdit={handleEditComment}
                onEditReply={handleEditReply}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      ) : null}

      {/* Comment Modal */}
      <CommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onSubmit={handleAddComment}
        title={`Comment on ${tokenSymbol}`}
        placeholder={`Share your thoughts about ${tokenSymbol}...`}
      />
    </div>
  );
};
