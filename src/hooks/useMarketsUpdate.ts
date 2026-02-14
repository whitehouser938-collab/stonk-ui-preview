import { useEffect, useCallback, useRef } from "react";
import { wsManager } from "../services/websocket.ts";
import { MarketsUpdateMessage, SUBSCRIPTION_TYPES, TokenMarketOverview } from "@/types/index.ts";
import { logger } from "@/utils/logger";

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
    logger.debug("Received markets update:", data);
    if (
      data.type === "marketsOverview" &&
      Array.isArray(data.marketsOverview) &&
      data.marketsOverview.length > 0
    ) {
      logger.debug(`Processing ${data.marketsOverview.length} updated markets`);
      onTradeUpdateRef.current(data.marketsOverview);
    } else {
      logger.warn("Invalid markets data:", data);
    }
  }, []);

  useEffect(() => {
    if (chainId) {
      logger.debug(`Subscribing to markets overview on ${chainId}`);

      const channelString = SUBSCRIPTION_TYPES.marketsOverview.channelFormatter(chainId);
      const unsubscribe = wsManager.subscribe("marketsOverview", handleMarketsUpdate, channelString);

      unsubscribeRef.current = unsubscribe;
    }
    return () => {
      if (unsubscribeRef.current) {
        logger.debug(`Unsubscribing from markets on ${chainId || "N/A"}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return unsubscribeRef.current;
}
