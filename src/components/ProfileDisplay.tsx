import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Wallet, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getUserByWalletAddress, User as UserType } from "@/api/user";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

export function ProfileDisplay() {
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { open } = useAppKit();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && address) {
      loadUserData();
    } else {
      setUser(null);
    }
  }, [isConnected, address]);

  const loadUserData = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const userData = await getUserByWalletAddress(address);
      setUser(userData);
    } catch (error) {
      // User doesn't exist yet, that's okay
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Show sign in button if not connected
  if (!isConnected) {
    return (
      <Button
        onClick={() => open()}
        variant="outline"
        className="flex items-center space-x-2 border-orange-400/30 bg-orange-400/10 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200"
      >
        <Wallet className="w-4 h-4" />
        <span className="font-medium font-mono">Sign In</span>
      </Button>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  // Show profile display
  return (
    <Link
      to={`/profile/${address}`}
      className="flex items-center space-x-2 hover:bg-gray-800/50 rounded-lg px-3 py-2 transition-all duration-200 group"
    >
      <Avatar className="w-8 h-8">
        <AvatarImage
          src={
            user?.profileImage && user.profileImage.length > 0
              ? user.profileImage
              : "/default-pfp.jpeg"
          }
          alt="Profile"
        />
        <AvatarFallback>
          <User className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start">
        <div className="flex items-center space-x-1">
          <span className="text-sm font-medium text-gray-200 group-hover:text-orange-400 transition-colors font-mono">
            {user?.username || formatAddress(address || "")}
          </span>
          {!user?.username && (
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await navigator.clipboard.writeText(address || "");
                  toast({
                    title: "Address Copied",
                    description: "Wallet address copied to clipboard",
                    variant: "default",
                  });
                } catch (error) {
                  logger.error("Failed to copy address:", error);
                  toast({
                    title: "Copy Failed",
                    description: "Failed to copy address to clipboard",
                    variant: "destructive",
                  });
                }
              }}
              className="text-gray-500 hover:text-orange-400 transition-colors"
              title="Copy wallet address"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
        {user?.username && (
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500 font-mono">
              {formatAddress(address || "")}
            </span>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await navigator.clipboard.writeText(address || "");
                  toast({
                    title: "Address Copied",
                    description: "Wallet address copied to clipboard",
                    variant: "default",
                  });
                } catch (error) {
                  logger.error("Failed to copy address:", error);
                  toast({
                    title: "Copy Failed",
                    description: "Failed to copy address to clipboard",
                    variant: "destructive",
                  });
                }
              }}
              className="text-gray-500 hover:text-orange-400 transition-colors"
              title="Copy wallet address"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
