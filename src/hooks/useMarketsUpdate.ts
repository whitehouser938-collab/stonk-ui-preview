import { useEffect, useCallback, useRef } from "react";
import { wsManager } from "../services/websocket.ts";
import { MarketsUpdateMessage, SUBSCRIPTION_TYPES, TokenMarketOverview } from "@/types/index.ts";

export function useMarketsUpdates(
  chainId: string | undefined,
  onMarketsUpdate: (updatedMarketsOverview: TokenMarketOverview[]) => void
) {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onTradeUpdateRef = useRef(onMarketsUpdate);

  // Keep the callback ref up to date
  useEffect(() => {
    onTradeUpdateRef.current = onMarketsUpdate;
  }, [onMarketsUpdate]);

  const handleMarketsUpdate = useCallback((data: MarketsUpdateMessage) => {
    console.log(`[useMarketsUpdates] Received trade update:`, data);
    if (
      data.type === "marketsOverview" &&
      Array.isArray(data.marketsOverview) &&
      data.marketsOverview.length > 0
    ) {
      console.log(`[useMarketsUpdates] Processing ${data.marketsOverview.length} updated markets`);
      onTradeUpdateRef.current(data.marketsOverview);
    } else {
      console.log(`[useMarketsUpdates] Invalid markets data:`, data);
    }
  }, []);

  useEffect(() => {
    if (chainId) {
      console.log(
        `[useMarketsUpdates] Subscribing to markets overview on ${chainId}`
      );

      const channelString = SUBSCRIPTION_TYPES.marketsOverview.channelFormatter(chainId);
      const unsubscribe = wsManager.subscribe("marketsOverview", handleMarketsUpdate, channelString);

      unsubscribeRef.current = unsubscribe;
    }
    return () => {
      if (unsubscribeRef.current) {
        console.log(
          `[useMarketsUpdates] Unsubscribing from markets on ${chainId || "N/A"}`
        );
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [chainId, handleMarketsUpdate]);

  return unsubscribeRef.current;
}
