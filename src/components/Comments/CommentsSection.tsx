import React, { useState, useMemo } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Comment } from "./Comment";
import { CommentModal } from "./CommentModal";
import { useComments } from "@/hooks/useComments";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useAppKitAccount } from "@reown/appkit/react";
import { WalletConnectionPrompt } from "@/components/WalletConnectionPrompt";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommentsSectionProps {
  tokenAddress: string;
  tokenSymbol: string;
  userId?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  tokenAddress,
  tokenSymbol,
  userId,
}) => {
  const isMobile = useIsMobile();
  const [showCommentModal, setShowCommentModal] = useState(false);
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

  return (
    <div className={`${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-700 p-4`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-orange-400" />
          <h3 className="text-orange-400 font-mono text-sm font-bold">
            COMMENTS
          </h3>
          <span className="text-gray-500 text-xs">
            (
            {comments.length +
              comments.reduce(
                (total, comment) => total + (comment._count?.replies || 0),
                0
              )}
            )
          </span>
        </div>
        {isConnected && currentUserId ? (
          <button
            onClick={() => setShowCommentModal(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Comment</span>
          </button>
        ) : (
          <div className="text-xs text-gray-500">Sign in to comment</div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm">Loading comments...</p>
        </div>
      )}

      {/* Comments List */}
      {!loading ? (
        <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">
                {isConnected
                  ? "Be the first to share your thoughts!"
                  : "Sign in to be the first to comment!"}
              </p>
            </div>
          ) : (
            comments.map((comment) => (
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
