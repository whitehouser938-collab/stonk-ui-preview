import { useEffect, useCallback, useRef } from "react";
import { wsManager } from "../services/websocket.ts";
import { SUBSCRIPTION_TYPES, TokenMarketOverview, TokenMarketUpdateMessage } from "@/types/index.ts";

export function useTokenMarketUpdates(
  chainId: string | undefined,
  tokenAddress: string | undefined,
  onTokenMarketUpdate: (freshMarketData: TokenMarketOverview) => void
) {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onTokenMarketUpdateRef = useRef(onTokenMarketUpdate);

  // Keep the callback ref up to date
  useEffect(() => {
    onTokenMarketUpdateRef.current = onTokenMarketUpdate;
  }, [onTokenMarketUpdate]);

  const handleTokenMarketUpdate = useCallback((data: TokenMarketUpdateMessage) => {
    console.log(`[useTokenMarketUpdate] Received market update:`, data);
    if (
      data.type === "tokenMarketOverview"
    ) {
      console.log(`[useTokenMarketUpdate] Processing ${data.tokenMarketOverview}`);
      onTokenMarketUpdateRef.current(data.tokenMarketOverview);
    } else {
      console.log(`[useTokenMarketUpdate] Invalid trade data:`, data);
    }
  }, []);

  useEffect(() => {
    if (chainId && tokenAddress) {
      console.log(
        `[useTokenMarketUpdate] Subscribing to market update for ${tokenAddress} on ${chainId}`
      );

      const channelString = SUBSCRIPTION_TYPES.tokenMarketOverview.channelFormatter(tokenAddress, chainId);
      const unsubscribe = wsManager.subscribe("tokenMarketOverview", handleTokenMarketUpdate, channelString);

      unsubscribeRef.current = unsubscribe;
    }
    return () => {
      if (unsubscribeRef.current) {
        console.log(
          `[useTokenMarketUpdate] Unsubscribing from market update for ${
            tokenAddress || "N/A"
          } on ${chainId || "N/A"}`
        );
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, tokenAddress]);

  return unsubscribeRef.current;
}
