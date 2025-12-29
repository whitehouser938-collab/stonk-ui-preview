import { useState, useEffect, useCallback } from "react";
import {
  getUserWatchlist,
  addToWatchlist as apiAddToWatchlist,
  removeFromWatchlist as apiRemoveFromWatchlist,
  checkWatchlist,
  WatchlistToken,
} from "@/api/watchlist";
import { toast } from "@/hooks/use-toast";

interface UseWatchlistReturn {
  watchlist: WatchlistToken[];
  isLoading: boolean;
  isInWatchlist: (tokenAddress: string, chain: string) => boolean;
  addToWatchlist: (
    tokenAddress: string,
    chain: string
  ) => Promise<boolean>;
  removeFromWatchlist: (
    tokenAddress: string,
    chain: string
  ) => Promise<boolean>;
  toggleWatchlist: (
    tokenAddress: string,
    chain: string
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing user's watchlist
 * @param walletAddress - User's wallet address
 */
export const useWatchlist = (
  walletAddress: string | undefined
): UseWatchlistReturn => {
  const [watchlist, setWatchlist] = useState<WatchlistToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch watchlist on mount and when wallet changes
  const fetchWatchlist = useCallback(async () => {
    if (!walletAddress) {
      setWatchlist([]);
      return;
    }

    setIsLoading(true);
    try {
      const tokens = await getUserWatchlist(walletAddress);
      setWatchlist(tokens);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      setWatchlist([]);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Check if a token is in the watchlist
  const isInWatchlist = useCallback(
    (tokenAddress: string, chain: string): boolean => {
      return watchlist.some(
        (token) =>
          token.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
          token.chain.toUpperCase() === chain.toUpperCase()
      );
    },
    [watchlist]
  );

  // Add token to watchlist
  const addToWatchlist = useCallback(
    async (tokenAddress: string, chain: string): Promise<boolean> => {
      if (!walletAddress) {
        toast({
          title: "Not signed in",
          description: "Please sign in to add tokens to watchlist",
          variant: "destructive",
        });
        return false;
      }

      const success = await apiAddToWatchlist(
        walletAddress,
        tokenAddress,
        chain
      );

      if (success) {
        toast({
          title: "Added to watchlist",
          description: "Token has been added to your watchlist",
        });
        // Refetch watchlist to get updated data
        await fetchWatchlist();
      } else {
        toast({
          title: "Failed to add",
          description: "Could not add token to watchlist",
          variant: "destructive",
        });
      }

      return success;
    },
    [walletAddress, fetchWatchlist]
  );

  // Remove token from watchlist
  const removeFromWatchlist = useCallback(
    async (tokenAddress: string, chain: string): Promise<boolean> => {
      if (!walletAddress) {
        toast({
          title: "Not signed in",
          description: "Please sign in to remove tokens from watchlist",
          variant: "destructive",
        });
        return false;
      }

      const success = await apiRemoveFromWatchlist(
        walletAddress,
        tokenAddress,
        chain
      );

      if (success) {
        toast({
          title: "Removed from watchlist",
          description: "Token has been removed from your watchlist",
        });
        // Optimistically update UI
        setWatchlist((prev) =>
          prev.filter(
            (token) =>
              !(
                token.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
                token.chain.toUpperCase() === chain.toUpperCase()
              )
          )
        );
      } else {
        toast({
          title: "Failed to remove",
          description: "Could not remove token from watchlist",
          variant: "destructive",
        });
      }

      return success;
    },
    [walletAddress]
  );

  // Toggle token in watchlist
  const toggleWatchlist = useCallback(
    async (tokenAddress: string, chain: string): Promise<boolean> => {
      if (isInWatchlist(tokenAddress, chain)) {
        return await removeFromWatchlist(tokenAddress, chain);
      } else {
        return await addToWatchlist(tokenAddress, chain);
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  return {
    watchlist,
    isLoading,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    refetch: fetchWatchlist,
  };
};
