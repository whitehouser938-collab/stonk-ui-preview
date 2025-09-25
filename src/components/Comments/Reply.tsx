import React, { useState } from "react";
import { Heart, MoreHorizontal } from "lucide-react";

export interface ReplyData {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
}

interface ReplyProps {
  reply: ReplyData;
  onLike: (replyId: string) => void;
  onDelete?: (replyId: string) => void;
}

export const Reply: React.FC<ReplyProps> = ({ reply, onLike, onDelete }) => {
  const handleLike = () => {
    onLike(reply.id);
  };

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

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-3 mb-2 ml-6">
      {/* Reply Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {reply.author.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-blue-400 font-mono text-xs">
            {abbreviateAddress(reply.author)}
          </span>
          <span className="text-gray-500 text-xs">
            {formatTimeAgo(reply.timestamp)}
          </span>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(reply.id)}
            className="text-gray-400 hover:text-red-400 transition-colors"
            title="Delete reply"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Reply Content */}
      <div className="text-gray-200 text-sm mb-3">{reply.content}</div>

      {/* Reply Actions */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-1 transition-colors ${
            reply.isLiked ? "text-red-400" : "text-gray-400 hover:text-red-400"
          }`}
        >
          <Heart className={`w-4 h-4 ${reply.isLiked ? "fill-current" : ""}`} />
          <span className="text-xs">{reply.likes}</span>
        </button>
      </div>
    </div>
  );
};
