import { wsManager } from "@/services/websocket";
import { resolutionMap } from "./datafeed";
import { BarData, BarUpdateMessage } from "@/types";

interface SubscriptionItem {
  subscriberUID: string;
  channel: string;
  lastDailyBar: BarData;
  handlers: any[];
}

const channelToSubscription: Map<string, SubscriptionItem> = new Map();

const handleBarUpdate = (data: BarUpdateMessage)=>{
  const subscriptionItem = channelToSubscription.get(data.channel);
  if (subscriptionItem === undefined) {
    return;
  }
  const bar = data.bar;
  subscriptionItem.lastDailyBar = bar;

  // Send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach(
    (handler: { callback: (arg0: any) => any }) => handler.callback(bar),
  );
}

export function subscribeOnStream(
  symbolInfo: { chain: string, symbol: string, address: string },
  resolution: string,
  onRealtimeCallback: (bar: any) => void,
  subscriberUID: string,
  onResetCacheNeededCallback: () => void,
  lastDailyBar: any,
) {
  const channelString = `token_bars:${symbolInfo.chain}:${symbolInfo.address}:${resolutionMap[resolution]}`;
  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback,
  };
  let subscriptionItem = channelToSubscription.get(channelString);
  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    subscriptionItem.handlers.push(handler);
    return;
  }
  subscriptionItem = {
    subscriberUID,
    channel: channelString,
    lastDailyBar,
    handlers: [handler],
  };
  channelToSubscription.set(channelString, subscriptionItem);
  console.log(
    "[subscribeBars]: Subscribe to streaming. Channel:",
    channelString,
  );
  wsManager.subscribeBars(channelString, handleBarUpdate)
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
        console.log(
          "[unsubscribeBars]: Unsubscribe from streaming. Channel:",
          channelString,
        );
        wsManager.unsubscribeBars(subscriptionItem.channel);
        channelToSubscription.delete(channelString);
        break;
      }
    }
  }
}
