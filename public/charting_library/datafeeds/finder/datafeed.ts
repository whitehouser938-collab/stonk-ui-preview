import { makeApiRequest, generateSymbol, parseFullSymbol } from "./helpers";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming";

const lastBarsCache = new Map();

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

const resolutionMap = {
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
  exchanges: [{ value: "finder", name: "finder", desc: "finder" }],
  symbols_types: [{ name: "crypto", value: "crypto" }],
};

// Fetch all symbols for all exchanges supported by the Finder API
async function getAllSymbols(): Promise<Symbol[]> {
  //TODO: Implement the getAllSymbols function
  const data = await makeApiRequest("chart/all-symbols");
  const allSymbols: Symbol[] = [];

  const symbols = data.symbols;
  for (const symbol of symbols) {
    const symbolItem = {
      symbol: symbol.symbol,
      ticker: symbol.symbol,
      address: symbol.address,
      chain: symbol.chain || "solana",
      description: symbol.description,
      type: "crypto",
      exchange: "finder",
    };
    allSymbols.push(symbolItem);
  }
  return allSymbols;
}

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
    const symbols = await getAllSymbols();
    const filteredSymbols = symbols.filter((symbol) => {
      //   const isExchangeValid = exchange === "" || symbol.exchange === exchange;
      const fullName = `${symbol.chain}:${symbol.ticker}:${symbol.address}`;
      const isFullSymbolContainsInput = fullName
        .toLowerCase()
        .includes(userInput.toLowerCase());
      return isFullSymbolContainsInput;
    });
    onResultReadyCallback(filteredSymbols);
  },

  resolveSymbol: async (
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: any) => void,
    onResolveErrorCallback: (error: string) => void,
  ): Promise<void> => {
    console.log("[resolveSymbol]: Method call", symbolName);
    const symbols = await getAllSymbols();
    const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);

    if (!symbolItem) {
      console.log("[resolveSymbol]: Cannot resolve symbol", symbolName);
      onResolveErrorCallback("Cannot resolve symbol");
      return;
    }

    const symbolInfo = {
      ticker: symbolItem.ticker,
      address: symbolItem.address,
      symbol: symbolItem.symbol,
      name: symbolItem.symbol,
      description: symbolItem.description,
      type: symbolItem.type,
      session: "24x7",
      timezone: "Etc/UTC",
      exchange: "Finder",
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
    onSymbolResolvedCallback(symbolInfo);
  },

  getBars: async (
    symbolInfo: any,
    resolution: string,
    periodParams: { from: number; to: number; firstDataRequest: boolean },
    onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: any) => void,
  ): Promise<void> => {
    const { from, to } = periodParams;

    const urlParameters = {
      address: symbolInfo.address,
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
      const data = await makeApiRequest(`chart/price-data?${query}`);
      if (!data.bars || data.bars.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }

      //To and From need to be in unix seconds
      const bars = data.bars.map((bar: any) => ({
        time: bar.unixTime * 1000,
        low: bar.l,
        high: bar.h,
        open: bar.o,
        close: bar.c,
      }));
      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      onErrorCallback(error);
    }
  },

  subscribeBars: (
    symbolInfo: any,
    resolution: String,
    onRealtimeCallback: (bar: any) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void,
  ) => {
    console.log(
      "[subscribeBars]: Method call with subscriberUID:",
      subscriberUID,
    );
    // subscribeOnStream(
    //   symbolInfo,
    //   resolution,
    //   onRealtimeCallback,
    //   subscriberUID,
    //   onResetCacheNeededCallback,
    //   lastBarsCache.get(symbolInfo.full_name),
    // );
  },

  unsubscribeBars: (subscriberUID: string) => {
    console.log(
      "[unsubscribeBars]: Method call with subscriberUID:",
      subscriberUID,
    );
    // unsubscribeFromStream(subscriberUID);
  },
};

export default Datafeed;
