import { useEffect, useCallback, useRef } from "react";
import { wsManager } from "../services/websocket.ts";
import { SUBSCRIPTION_TYPES, TradeData, TradeUpdateMessage } from "@/types/index.ts";
import { logger } from "@/utils/logger";

export function useTradeUpdates(
  chainId: string | undefined,
  tokenAddress: string | undefined,
  onTradeUpdate: (newTrades: TradeData[]) => void
) {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onTradeUpdateRef = useRef(onTradeUpdate);

  // Keep the callback ref up to date
  useEffect(() => {
    onTradeUpdateRef.current = onTradeUpdate;
  }, [onTradeUpdate]);

  const handleTradeUpdate = useCallback((data: TradeUpdateMessage) => {
    logger.debug("Received trade update:", data);
    if (
      data.type === "trades" &&
      Array.isArray(data.trades) &&
      data.trades.length > 0
    ) {
      logger.debug(`Processing ${data.trades.length} trades`);
      onTradeUpdateRef.current(data.trades);
    } else {
      logger.warn("Invalid trade data:", data);
    }
  }, []);

  useEffect(() => {
    if (chainId && tokenAddress) {
      logger.debug(`Subscribing to trades for ${tokenAddress} on ${chainId}`);

      const channelString = SUBSCRIPTION_TYPES.trades.channelFormatter(tokenAddress, chainId);
      const unsubscribe = wsManager.subscribe("trades", handleTradeUpdate, channelString);

      unsubscribeRef.current = unsubscribe;
    }
    return () => {
      if (unsubscribeRef.current) {
        logger.debug(`Unsubscribing from trades for ${tokenAddress || "N/A"} on ${chainId || "N/A"}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, tokenAddress]);

  return unsubscribeRef.current;
}
