import { wsManager } from "@/services/websocket";
import { resolutionMap } from "./datafeed";
import { BarData, BarUpdateMessage, Chain, SUBSCRIPTION_TYPES } from "@/types";
import { TVAsset, TVMode } from "./helpers";
import { logger } from "@/utils/logger";

interface BasicSymbolInfo {
  chain: Chain,
  symbol: string,
  address: string,
  tokenSupply: number,
  asset: TVAsset,
  mode: TVMode,
}

interface SubscriptionItem {
  subscriberUID: string;
  channel: string;
  symbolInfo: BasicSymbolInfo;
  lastBar: BarData | null;
  handlers: any[];
}

const channelToSubscription: Map<string, SubscriptionItem> = new Map();

const handleBarUpdate = (data: BarUpdateMessage)=>{
  const subscriptionItem = channelToSubscription.get(data.channel);
  if (subscriptionItem === undefined) {
    return;
  }

  // transform bar based on mode (price/mcap) and asset (USD/WETH)
  const assetMultiplier = subscriptionItem.symbolInfo.asset === "USD" ? 1 : 1/data.bar.assetUsdPrice;
  const modeMultiplier = subscriptionItem.symbolInfo.mode === "mcap" ? subscriptionItem.symbolInfo.tokenSupply : 1;

  const multiplier = assetMultiplier * modeMultiplier;

  const newBar: BarData = {
    open: data.bar.open * multiplier,
    close: data.bar.close * multiplier,
    high: data.bar.high * multiplier,
    low: data.bar.low * multiplier,
    volume: data.bar.volume,
    time: Number(data.bar.time),
    assetUsdPrice: data.bar.assetUsdPrice,
  }

  const bar = !subscriptionItem.lastBar ? newBar : 
                  data.bar.time === subscriptionItem.lastBar.time ? 
                      { ...newBar, ...{ open: subscriptionItem.lastBar.open} } : 
                      { ...newBar, ...{ open: subscriptionItem.lastBar.close} };

  subscriptionItem.lastBar = {...bar};

  // Send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach(
    (handler: { callback: (arg0: any) => any }) => handler.callback(bar),
  );
}

export function subscribeOnStream(
  symbolInfo: BasicSymbolInfo,
  resolution: string,
  onRealtimeCallback: (bar: any) => void,
  subscriberUID: string,
  onResetCacheNeededCallback: () => void,
  lastBar: BarData | null,
) {
  const channelString = SUBSCRIPTION_TYPES.bars.channelFormatter(symbolInfo.address, symbolInfo.chain, resolutionMap[resolution]);
  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback,
  };
  let subscriptionItem = channelToSubscription.get(channelString);
  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    subscriptionItem.handlers.push(handler);
    subscriptionItem.symbolInfo = symbolInfo;
    subscriptionItem.lastBar = lastBar;
    return;
  }
  subscriptionItem = {
    subscriberUID,
    channel: channelString,
    symbolInfo,
    lastBar,
    handlers: [handler],
  };
  channelToSubscription.set(channelString, subscriptionItem);
  logger.debug(
    "[subscribeBars]: Subscribe to streaming. Channel:",
    channelString,
  );
  wsManager.subscribe("bars", handleBarUpdate, channelString);
}

export function unsubscribeFromStream(subscriberUID: string) {
  // Find a subscription with id === subscriberUID
  for (const channelString of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(channelString);
    const handlerIndex = subscriptionItem.handlers.findIndex(
      (handler: { id: string }) => handler.id === subscriberUID,
    );

    if (handlerIndex !== -1) {
      // Remove from handlers
      subscriptionItem.handlers.splice(handlerIndex, 1);

      if (subscriptionItem.handlers.length === 0) {
        // Unsubscribe from the channel if it was the last handler
        logger.debug(
          "[unsubscribeBars]: Unsubscribe from streaming. Channel:",
          channelString,
        );
        wsManager.unsubscribe("bars", channelString);
        channelToSubscription.delete(channelString);
        break;
      }
    }
  }
}
