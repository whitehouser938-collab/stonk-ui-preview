import React, { useState } from "react";
import { X, Send } from "lucide-react";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  title?: string;
  placeholder?: string;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = "Add Comment",
  placeholder = "Write your comment...",
}) => {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent("");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-white font-sans text-lg font-bold">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-gray-800 border border-white rounded p-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-gray-300 resize-none font-sans"
            rows={6}
            autoFocus
          />
          <div className="text-xs text-gray-500 mt-2 font-sans">
            Press Ctrl+Enter to submit
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-center space-x-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 transition-colors font-sans rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-400 text-black text-sm rounded hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
          >
            <Send className="w-4 h-4" />
            <span className="font-sans">Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
