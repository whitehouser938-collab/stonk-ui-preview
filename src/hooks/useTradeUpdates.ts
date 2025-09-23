import { useEffect, useCallback, useRef } from "react";
import { wsManager } from "../services/websocket.ts";
import { TradeData, TradeUpdateMessage } from "@/types/index.ts";

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
    if (
      data.type === "trades" &&
      Array.isArray(data.trades) &&
      data.trades.length > 0
    ) {
      onTradeUpdateRef.current(data.trades);
    }
  }, []);

  useEffect(() => {
    if (chainId && tokenAddress) {
      console.log(
        `[useTradeUpdates] Subscribing to trades for ${tokenAddress} on ${chainId}`
      );

      const unsubscribe = wsManager.subscribeTrades(
        tokenAddress,
        chainId,
        handleTradeUpdate
      );

      unsubscribeRef.current = unsubscribe;
    }
    return () => {
      if (unsubscribeRef.current) {
        console.log(
          `[useTradeUpdates] Unsubscribing from trades for ${
            tokenAddress || "N/A"
          } on ${chainId || "N/A"}`
        );
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [chainId, tokenAddress, handleTradeUpdate]);

  return unsubscribeRef.current;
}
