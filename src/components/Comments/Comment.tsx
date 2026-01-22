import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import { Reply } from "./Reply";
import { Comment as CommentType, Reply as ReplyType } from "@/api/comment";
import { UserAvatar } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommentProps {
  comment: CommentType;
  onLike: (commentId: string, replyId?: string) => void;
  onReply: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onDeleteReply?: (commentId: string, replyId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onEditReply?: (commentId: string, replyId: string, content: string) => void;
  currentUserId?: string;
  depth?: number;
}

export const Comment: React.FC<CommentProps> = ({
  comment,
  onLike,
  onReply,
  onDelete,
  onDeleteReply,
  onEdit,
  onEditReply,
  currentUserId,
  depth = 0,
}) => {
  const isMobile = useIsMobile();
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const handleLike = () => {
    onLike(comment.id);
  };

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent.trim());
      setReplyContent("");
      setShowReplyForm(false);
    }
  };

  const handleEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit?.(comment.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const isOwner = currentUserId && comment.userId === currentUserId;

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const commentTime = new Date(timestamp).getTime();
    const diffMs = now - commentTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const abbreviateAddress = (address: string) => {
    if (!address) return "";
    return address.slice(0, 6) + "..." + address.slice(-4);
  };

  const getDisplayName = (user: CommentType["user"]) => {
    return user.username || abbreviateAddress(user.walletAddress);
  };

  return (
    <div className={`${depth > 0 ? "ml-6 pl-4" : ""}`}>
      <div className={`${isMobile ? "bg-black" : "bg-gray-800"} p-2`}>
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <UserAvatar user={comment.user} size="md" className="" />
            <Link
              to={`/profile/${comment.user.walletAddress}`}
              className="text-white hover:text-orange-400 font-sans text-sm transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {getDisplayName(comment.user)}
            </Link>
            <span className="text-gray-400 text-sm font-sans">
              {formatTimeAgo(comment.createdAt)}
            </span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-gray-600 text-sm font-sans">(edited)</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {comment.replies.length > 0 && (
              <div className="flex items-center space-x-1 text-gray-500 text-sm font-sans">
                <MessageCircle className="w-3 h-3" />
                <span className="font-sans">{comment.replies.length}</span>
              </div>
            )}
            {isOwner && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-orange-400 transition-colors"
                  title="Edit comment"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete?.(comment.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete comment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="mb-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={`w-full ${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-600 rounded p-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none font-sans`}
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors font-sans"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={
                  !editContent.trim() || editContent === comment.content
                }
                className="px-3 py-1 bg-orange-400 text-black text-xs rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between mb-1">
            {/* Content on left */}
            <div className="text-white text-base flex-1 font-sans pr-4">{comment.content}</div>
            {/* Like count on right */}
            {currentUserId && currentUserId !== "skip" ? (
              <button
                onClick={handleLike}
                className={`flex flex-col items-center transition-colors flex-shrink-0 ${
                  comment.isLiked
                    ? "text-red-400"
                    : "text-gray-400 hover:text-red-400"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${comment.isLiked ? "fill-current" : ""}`}
                />
                <span className="text-sm font-sans mt-1">{comment._count?.likes || 0}</span>
              </button>
            ) : (
              <div className="flex flex-col items-center text-gray-400 flex-shrink-0 font-sans">
                <Heart className="w-5 h-5" />
                <span className="text-sm font-sans mt-1">{comment._count?.likes || 0}</span>
              </div>
            )}
          </div>
        )}

        {/* Reply Button */}
        {!isEditing && currentUserId && currentUserId !== "skip" && (
          <div className="mt-1">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-gray-400 hover:text-orange-500 transition-colors text-sm font-sans"
            >
              Reply
            </button>
          </div>
        )}

        {/* Reply Form */}
        {showReplyForm && !isEditing && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className={`w-full ${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-600 rounded p-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none font-sans`}
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent("");
                }}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors font-sans"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="px-3 py-1 bg-orange-400 text-black text-xs rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div>
          {/* Show first reply by default, or all if showAllReplies is true */}
          {(showAllReplies ? comment.replies : comment.replies.slice(0, 1)).map(
            (reply) => (
              <Reply
                key={reply.id}
                reply={reply}
                onLike={(replyId) => onLike(comment.id, replyId)}
                onDelete={(replyId) => onDeleteReply?.(comment.id, replyId)}
                onEdit={(replyId, content) =>
                  onEditReply?.(comment.id, replyId, content)
                }
                currentUserId={currentUserId}
              />
            )
          )}

          {/* Show "Show all replies" button if there are more than 1 reply */}
          {comment.replies.length > 1 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="text-xs text-orange-400 hover:text-orange-500 transition-colors ml-6 font-sans"
            >
              Show all {comment.replies.length} replies
            </button>
          )}

          {/* Show "Show less" button if showing all replies */}
          {comment.replies.length > 1 && showAllReplies && (
            <button
              onClick={() => setShowAllReplies(false)}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors ml-6 font-sans"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
};
