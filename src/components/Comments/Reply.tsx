import React, { useState } from "react";
import { Heart, Edit, Trash2 } from "lucide-react";
import { Reply as ReplyType } from "@/api/comment";
import { UserAvatar } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReplyProps {
  reply: ReplyType;
  onLike: (replyId: string) => void;
  onDelete?: (replyId: string) => void;
  onEdit?: (replyId: string, content: string) => void;
  currentUserId?: string;
}

export const Reply: React.FC<ReplyProps> = ({
  reply,
  onLike,
  onDelete,
  onEdit,
  currentUserId,
}) => {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleLike = () => {
    onLike(reply.id);
  };

  const handleEdit = () => {
    if (editContent.trim() && editContent !== reply.content) {
      onEdit?.(reply.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(reply.content);
    setIsEditing(false);
  };

  const isOwner = currentUserId && reply.userId === currentUserId;

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const replyTime = new Date(timestamp).getTime();
    const diffMs = now - replyTime;
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

  const getDisplayName = (user: ReplyType["user"]) => {
    return user.username || abbreviateAddress(user.walletAddress);
  };

  return (
    <div className={`${isMobile ? "bg-black" : "bg-gray-800"} border border-gray-700 rounded p-3 mb-2 ml-6`}>
      {/* Reply Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <UserAvatar user={reply.user} size="sm" className="" />
          <Link
            to={`/profile/${reply.user.walletAddress}`}
            className="text-blue-400 hover:text-white font-mono text-xs transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {getDisplayName(reply.user)}
          </Link>
          <span className="text-gray-500 text-xs">
            {formatTimeAgo(reply.createdAt)}
          </span>
          {reply.updatedAt !== reply.createdAt && (
            <span className="text-gray-600 text-xs">(edited)</span>
          )}
        </div>
        {isOwner && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-orange-400 transition-colors"
              title="Edit reply"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(reply.id)}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Delete reply"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Reply Content */}
      {isEditing ? (
        <div className="mb-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={`w-full ${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-600 rounded p-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none`}
            rows={3}
            maxLength={1000}
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={!editContent.trim() || editContent === reply.content}
              className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start space-x-2 mb-3">
          {/* Like count on left */}
          {currentUserId && currentUserId !== "skip" ? (
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 transition-colors flex-shrink-0 ${
                reply.isLiked
                  ? "text-red-400"
                  : "text-gray-400 hover:text-red-400"
              }`}
            >
              <Heart
                className={`w-4 h-4 ${reply.isLiked ? "fill-current" : ""}`}
              />
              <span className="text-xs">{reply._count?.likes || 0}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1 text-gray-500 flex-shrink-0">
              <Heart className="w-4 h-4" />
              <span className="text-xs">{reply._count?.likes || 0}</span>
            </div>
          )}
          {/* Content on right */}
          <div className="text-gray-200 text-sm flex-1">{reply.content}</div>
        </div>
      )}
    </div>
  );
};
