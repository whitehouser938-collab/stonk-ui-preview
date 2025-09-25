import React, { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Comment, CommentData } from "./Comment";
import { CommentModal } from "./CommentModal";

interface CommentsSectionProps {
  tokenAddress: string;
  tokenSymbol: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  tokenAddress,
  tokenSymbol,
}) => {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [showCommentModal, setShowCommentModal] = useState(false);

  // Mock data for demonstration - will be replaced with API calls
  const mockComments: CommentData[] = [
    {
      id: "1",
      author: "0x1234567890abcdef1234567890abcdef12345678",
      content:
        "This token looks promising! The team seems solid and the use case is interesting.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      likes: 5,
      isLiked: false,
      replies: [
        {
          id: "1-1",
          author: "0xabcdef1234567890abcdef1234567890abcdef12",
          content: "I agree! The bonding curve mechanism is really innovative.",
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          likes: 2,
          isLiked: true,
          replies: [],
        },
        {
          id: "1-2",
          author: "0x9876543210fedcba9876543210fedcba98765432",
          content:
            "What's your take on the tokenomics? I'm curious about the supply distribution.",
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
          likes: 1,
          isLiked: false,
          replies: [],
        },
      ],
    },
    {
      id: "2",
      author: "0x9876543210fedcba9876543210fedcba98765432",
      content:
        "Anyone else notice the volume spike in the last hour? Something big might be coming.",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      likes: 8,
      isLiked: false,
      replies: [
        {
          id: "2-1",
          author: "0xfedcba9876543210fedcba9876543210fedcba98",
          content:
            "Yeah I saw that too! Could be some whale activity or news coming out.",
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 minutes ago
          likes: 3,
          isLiked: false,
          replies: [],
        },
        {
          id: "2-2",
          author: "0x1234567890abcdef1234567890abcdef12345678",
          content:
            "I'm monitoring the order book closely. Lots of buy pressure building up.",
          timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
          likes: 5,
          isLiked: true,
          replies: [],
        },
      ],
    },
    {
      id: "3",
      author: "0xfedcba9876543210fedcba9876543210fedcba98",
      content: "Just bought in! Let's see where this goes 🚀",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      likes: 3,
      isLiked: false,
      replies: [],
    },
  ];

  // Initialize with mock data
  React.useEffect(() => {
    setComments(mockComments);
  }, []);

  const handleAddComment = (content: string) => {
    const newComment: CommentData = {
      id: Date.now().toString(),
      author: "0x" + Math.random().toString(16).substr(2, 40), // Mock address
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      replies: [],
    };
    setComments((prev) => [newComment, ...prev]);
  };

  const handleAddReply = (commentId: string, content: string) => {
    const newReply: CommentData = {
      id: `${commentId}-${Date.now()}`,
      author: "0x" + Math.random().toString(16).substr(2, 40), // Mock address
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      replies: [],
    };

    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, replies: [...comment.replies, newReply] }
          : comment
      )
    );
  };

  const handleLike = (commentId: string) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            isLiked: !comment.isLiked,
          };
        }
        return comment;
      })
    );
  };

  const handleDelete = (commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  };

  return (
    <div className="bg-gray-900 border border-gray-700 p-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-orange-400" />
          <h3 className="text-orange-400 font-mono text-sm font-bold">
            COMMENTS
          </h3>
          <span className="text-gray-500 text-xs">({comments.length})</span>
        </div>
        <button
          onClick={() => setShowCommentModal(true)}
          className="flex items-center space-x-1 px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Comment</span>
        </button>
      </div>

      {/* Comments List */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onLike={handleLike}
              onReply={handleAddReply}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

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
