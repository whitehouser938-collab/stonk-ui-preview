import React, { useState } from "react";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { Reply } from "./Reply";

export interface CommentData {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: CommentData[];
  isLiked?: boolean;
}

interface CommentProps {
  comment: CommentData;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  depth?: number;
}

export const Comment: React.FC<CommentProps> = ({
  comment,
  onLike,
  onReply,
  onDelete,
  depth = 0,
}) => {
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");

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

  return (
    <div className={`${depth > 0 ? "ml-6 border-l border-gray-700 pl-4" : ""}`}>
      <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-2">
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {comment.author.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-orange-400 font-mono text-xs">
              {abbreviateAddress(comment.author)}
            </span>
            <span className="text-gray-500 text-xs">
              {formatTimeAgo(comment.timestamp)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {comment.replies.length > 0 && (
              <div className="flex items-center space-x-1 text-gray-500 text-xs">
                <MessageCircle className="w-3 h-3" />
                <span>{comment.replies.length}</span>
              </div>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-gray-400 hover:text-red-400 transition-colors"
                title="Delete comment"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Comment Content */}
        <div className="text-gray-200 text-sm mb-3">{comment.content}</div>

        {/* Comment Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1 transition-colors ${
              comment.isLiked
                ? "text-red-400"
                : "text-gray-400 hover:text-red-400"
            }`}
          >
            <Heart
              className={`w-4 h-4 ${comment.isLiked ? "fill-current" : ""}`}
            />
            <span className="text-xs">{comment.likes}</span>
          </button>

          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-gray-400 hover:text-orange-400 transition-colors text-xs"
          >
            Reply
          </button>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent("");
                }}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="space-y-2">
          {/* Show first reply by default, or all if showAllReplies is true */}
          {(showAllReplies ? comment.replies : comment.replies.slice(0, 1)).map(
            (reply) => (
              <Comment
                key={reply.id}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                onDelete={onDelete}
                depth={depth + 1}
              />
            )
          )}

          {/* Show "Show all replies" button if there are more than 1 reply */}
          {comment.replies.length > 1 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors ml-6"
            >
              Show all {comment.replies.length} replies
            </button>
          )}

          {/* Show "Show less" button if showing all replies */}
          {comment.replies.length > 1 && showAllReplies && (
            <button
              onClick={() => setShowAllReplies(false)}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors ml-6"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
};
