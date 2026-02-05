import React from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthPromptProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({ isOpen, onClose, message }) => {
  const { signIn, isAuthenticating } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
      onClose();
    } catch (error: any) {
      // Error is already logged in AuthContext
      if (!error.message?.includes("rejected")) {
        alert(error.message || "Failed to sign in");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-card p-6 rounded-lg max-w-md mx-4 border border-border">
        <h2 className="text-xl font-bold mb-4 text-text-primary">Sign In Required</h2>
        <p className="text-text-secondary mb-6">
          {message || "You need to sign a message with your wallet to continue. This proves you own the wallet without sharing your private key."}
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleSignIn}
            disabled={isAuthenticating}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded transition-colors"
          >
            {isAuthenticating ? "Signing..." : "Sign Message"}
          </button>
          <button
            onClick={onClose}
            disabled={isAuthenticating}
            className="flex-1 bg-bg-tertiary hover:bg-bg-secondary text-text-primary px-4 py-2 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
