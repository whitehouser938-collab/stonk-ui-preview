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
    <div className={`${isMobile ? "bg-black" : "bg-gray-800"} p-2 ml-6`}>
      {/* Reply Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <UserAvatar user={reply.user} size="sm" className="" />
          <Link
            to={`/profile/${reply.user.walletAddress}`}
            className="text-white hover:text-orange-400 font-sans text-sm transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {getDisplayName(reply.user)}
          </Link>
          <span className="text-gray-400 text-sm font-sans">
            {formatTimeAgo(reply.createdAt)}
          </span>
          {reply.updatedAt !== reply.createdAt && (
            <span className="text-gray-600 text-sm font-sans">(edited)</span>
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
        <div className="mb-1">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={`w-full ${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-600 rounded p-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none font-sans`}
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
              disabled={!editContent.trim() || editContent === reply.content}
              className="px-3 py-1 bg-orange-400 text-black text-xs rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between mb-1">
          {/* Content on left */}
          <div className="text-white text-base flex-1 font-sans pr-4">{reply.content}</div>
          {/* Like count on right */}
          {currentUserId && currentUserId !== "skip" ? (
            <button
              onClick={handleLike}
              className={`flex flex-col items-center transition-colors flex-shrink-0 ${
                reply.isLiked
                  ? "text-red-400"
                  : "text-gray-400 hover:text-red-400"
              }`}
            >
              <Heart
                className={`w-5 h-5 ${reply.isLiked ? "fill-current" : ""}`}
              />
              <span className="text-sm font-sans mt-1">{reply._count?.likes || 0}</span>
            </button>
          ) : (
            <div className="flex flex-col items-center text-gray-400 flex-shrink-0 font-sans">
              <Heart className="w-5 h-5" />
              <span className="text-sm font-sans mt-1">{reply._count?.likes || 0}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
