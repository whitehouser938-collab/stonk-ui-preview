import { BarData, Chain } from "@/types";
import { makeApiRequest } from "./helpers";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming";

const lastBarsCache: Map<string, BarData> = new Map();
const prevBarsCache: Map<string, BarData> = new Map();

// Define the types for symbols and configuration
interface Symbol {
  symbol: string;
  ticker: string;
  address: string;
  chain: string;
  description: string;
  type: string;
  exchange: string;
}

type ResolutionString = TradingView.ResolutionString;

export const resolutionMap = {
  "1": "1m",
  "15": "15m",
  "30": "30m",
  "60": "1H",
  "180": "3H",
  "1D": "1D",
  "3D": "3D",
  "1W": "1W",
  "1M": "1M",
};

interface ConfigurationData {
  supported_resolutions: ResolutionString[];
  exchanges: { value: string; name: string; desc: string }[];
  symbols_types: { name: string; value: string }[];
}

// Datafeed configuration object
const configurationData: ConfigurationData = {
  supported_resolutions: [
    "1" as ResolutionString,
    "15" as ResolutionString,
    "30" as ResolutionString,
    "60" as ResolutionString,
    "180" as ResolutionString,
    "1D" as ResolutionString,
    "3D" as ResolutionString,
    "1W" as ResolutionString,
    "1M" as ResolutionString,
  ],
  exchanges: [{ value: "stonk", name: "stonk", desc: "stonk" }],
  symbols_types: [{ name: "crypto", value: "crypto" }],
};

// Datafeed implementation
const Datafeed = {
  onReady: (callback: (config: ConfigurationData) => void): void => {
    setTimeout(() => callback(configurationData), 0);
  },

  searchSymbols: async (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (symbols: Symbol[]) => void,
  ): Promise<void> => {
    // Not needed
    onResultReadyCallback([]);
  },

  resolveSymbol: async (
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: any) => void,
    onResolveErrorCallback: (error: string) => void,
  ): Promise<void> => {
    const [ symbol, chain, address ] = symbolName.split(":");
    if (!symbol || !chain || !address){
      console.log("[resolveSymbol]: Cannot resolve symbol", symbolName);
      onResolveErrorCallback("Cannot resolve symbol");
      return;
    }

    const symbolInfo = {
      ticker: symbol,
      address: address,
      symbol: symbol,
      name: symbol,
      chain: chain,
      description: `${symbol}/USD`,   // Dynamically change this can be <symbol>/USD or <symbol>/<asset> like DOGE/WETH
      type: "crypto",
      session: "24x7",
      timezone: "Etc/UTC",
      exchange: "Stonk Market",
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      visible_plots_set: "ohlc",
      has_weekly_and_monthly: true,
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 2,
      data_status: "streaming",
    };
    console.log("[resolveSymbol]: Symbol resolved", symbolName);

    setTimeout(() => {
      onSymbolResolvedCallback(symbolInfo);
    }, 0);
  },

  getBars: async (
    symbolInfo: any,
    resolution: string,
    periodParams: { from: number; to: number; firstDataRequest: boolean },
    onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: any) => void,
  ): Promise<void> => {
    const { from, to, firstDataRequest } = periodParams;

    const urlParameters = {
      time_to: to,
      time_from: from,
      chain: symbolInfo.chain,
      limit: 2000,

      //Get birdeye api type from resolution
      resolution: resolutionMap[resolution as keyof typeof resolutionMap],
    };

    const query = Object.entries(urlParameters)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    try {
      const data = await makeApiRequest(`token/bars/${symbolInfo.address}?${query}`);
      if (!data.bars || data.end) {
        onHistoryCallback([], { noData: true });
        return;
      }
      const cacheKey = `${symbolInfo.address}:${symbolInfo.chain}:${resolution}`;

      if (firstDataRequest) {
        prevBarsCache.delete(cacheKey);
        lastBarsCache.delete(cacheKey);
      }

      const newBars = [...data.bars];
      if (data.bars.length > 0) {
        const prevBar = prevBarsCache.get(cacheKey);

        // This whole block basically tries to fix chart discontinuity by bridging a gap if there are any between bars (Probably won't be an issue in prod, it's here as a fail safe)
        if (prevBar && prevBar.close !== data.bars[data.bars.length - 1].close) {
          const connectingBar = {
            ...data.bars[data.bars.length - 1],
            close: prevBar.open,
          };
          newBars.push(connectingBar);
        }
        if (!lastBarsCache.has(cacheKey)) lastBarsCache.set(cacheKey, data.bars[data.bars.length - 1]);
        prevBarsCache.set(cacheKey, data.bars[0]);
      }

      console.log(`Returning ${newBars.length} bar(s) for the requested period.`);
      onHistoryCallback(newBars, { noData: false });
    } catch (error) {
      onErrorCallback(error);
    }
  },

  subscribeBars: (
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: (bar: any) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void,
  ) => {
    console.log(
      "[subscribeBars]: Method call with subscriberUID:",
      subscriberUID,
    );
    subscribeOnStream(
      symbolInfo,
      resolution,
      onRealtimeCallback,
      subscriberUID,
      onResetCacheNeededCallback,
      lastBarsCache.get(`${symbolInfo.address}:${symbolInfo.chain}:${resolution}`) ?? null,
    );
  },

  unsubscribeBars: (subscriberUID: string) => {
    console.log(
      "[unsubscribeBars]: Method call with subscriberUID:",
      subscriberUID,
    );
    unsubscribeFromStream(subscriberUID);
  },
};

export default Datafeed;
