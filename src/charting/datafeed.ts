import { BarData, Chain } from "@/types";
import { getTradeLimitForResolution, parseTvSymbol } from "./helpers";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming";
import {
  ResolutionString,
  LibrarySymbolInfo,
  IBasicDataFeed,
} from "../../public/charting_library/charting_library";
import { getTokenOHLCVBars } from "@/api/token";


const lastBarsCache: Map<string, BarData> = new Map();
const prevBarsCache: Map<string, BarData> = new Map();
const endOfDataCache = new Map<string, boolean>();

interface ExtendedSymbolInfo extends LibrarySymbolInfo {
  tokenAddress: string,
  tokenSymbol: string,
  tokenSupply: number,
  chain: Chain,
  asset: string,
  mode: string,
}

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

const onReady = (callback: (config: ConfigurationData) => void): void => {
  setTimeout(() => callback(configurationData), 0);
}

const searchSymbols = async (
  userInput: string,
  exchange: string,
  symbolType: string,
  onResultReadyCallback: (symbols: Symbol[]) => void
): Promise<void> => {
  // Not needed
  onResultReadyCallback([]);
}

const resolveSymbol = async (
  symbolString: string,
  onSymbolResolvedCallback: (symbolInfo: LibrarySymbolInfo) => void,
  onResolveErrorCallback: (error: string) => void
): Promise<void> => {
  
  const tvSymbol = parseTvSymbol(symbolString);

  if (!tvSymbol.tokenSymbol || !tvSymbol.chain || !tvSymbol.tokenAddress) {
    console.log("[resolveSymbol]: Cannot resolve symbol", symbolString);
    onResolveErrorCallback("Cannot resolve symbol");
    return;
  }

  const pricePrecision = tvSymbol.mode === "price" ? 11 : 2;

  const symbolInfo: ExtendedSymbolInfo = {
    ticker: symbolString,
    name: tvSymbol.tokenSymbol,
    description: `${tvSymbol.tokenSymbol}/${tvSymbol.asset}`,
    type: "crypto",
    session: "24x7",
    timezone: "Etc/UTC",
    exchange: "Stonk Market",
    minmov: 1,
    pricescale: Math.pow(10, pricePrecision),
    volume_precision: 2,
    format: "price",
    listed_exchange: "Etc/UTC",
    has_intraday: true,
    visible_plots_set: "ohlcv",
    has_weekly_and_monthly: true,
    supported_resolutions: configurationData.supported_resolutions,
    data_status: "streaming",

    tokenAddress: tvSymbol.tokenAddress,
    tokenSymbol: tvSymbol.tokenSymbol,
    tokenSupply: tvSymbol.tokenSupply,
    chain: tvSymbol.chain,
    asset: tvSymbol.asset,
    mode: tvSymbol.mode,
  };
  console.log("[resolveSymbol]: Symbol resolved", symbolString);

  onSymbolResolvedCallback(symbolInfo);
}

const getBars = async (
  symbolInfo: ExtendedSymbolInfo,
  resolution: ResolutionString,
  periodParams: { from: number; to: number; firstDataRequest: boolean, countBack: number },
  onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void,
  onErrorCallback: (error: any) => void
): Promise<void> => {
  const { from, to, firstDataRequest } = periodParams;

  const cacheKey = `${symbolInfo.tokenAddress}:${symbolInfo.chain}:${resolution}`;

  if (firstDataRequest) {
    prevBarsCache.delete(cacheKey);
    lastBarsCache.delete(cacheKey);
    endOfDataCache.delete(cacheKey);
  }
  // If we've already reached the end, don't make another request
  if (endOfDataCache.has(cacheKey) && endOfDataCache.get(cacheKey) === true) {
    onHistoryCallback([], { noData: true });
    return;
  }

  try {
    const data: {end: boolean, bars: BarData[]} = await getTokenOHLCVBars(
      symbolInfo.tokenAddress,
      to,
      from,
      symbolInfo.chain,
      getTradeLimitForResolution(resolution),
      resolutionMap[resolution as keyof typeof resolutionMap],
      symbolInfo.asset === "USD"
    );

    if (symbolInfo.mode === "mcap"){
      data.bars = data.bars.map((bar: BarData) => {
        const newBar: BarData = {
          open: bar.open * symbolInfo.tokenSupply,
          close: bar.close * symbolInfo.tokenSupply,
          high: bar.high * symbolInfo.tokenSupply,
          low: bar.low * symbolInfo.tokenSupply,
          volume: bar.volume,
          time: bar.time
        }
        return newBar;
      });
    }
    
    if (!data.bars || data.bars.length <= 0) {
      endOfDataCache.set(cacheKey, true);
      onHistoryCallback([], { noData: true });
      return;
    }
    const newBars = [...data.bars];
    if (data.bars.length > 0) {
      const prevBar = prevBarsCache.get(cacheKey);

      // This whole block basically tries to fix chart discontinuity by bridging a gap if there are any between bars (Probably won't be an issue in prod, it's here as a fail safe)
      if (
        prevBar &&
        prevBar.close !== data.bars[data.bars.length - 1].close
      ) {
        const connectingBar = {
          ...data.bars[data.bars.length - 1],
          close: prevBar.open,
        };
        newBars.push(connectingBar);
      }
      if (!lastBarsCache.has(cacheKey))
        lastBarsCache.set(cacheKey, data.bars[data.bars.length - 1]);
      prevBarsCache.set(cacheKey, data.bars[0]);
    }

    console.log(
      `Returning ${newBars.length} bar(s) for the requested period.`
    );

    if (data.end) endOfDataCache.set(cacheKey, true);
  
    onHistoryCallback(newBars, { noData: data.end });
  } catch (error) {
    onErrorCallback(error);
  }
}

const subscribeBars = (
  symbolInfo: ExtendedSymbolInfo,
  resolution: string,
  onRealtimeCallback: (bar: any) => void,
  subscriberUID: string,
  onResetCacheNeededCallback: () => void
) => {
  console.log(
    "[subscribeBars]: Method call with subscriberUID:",
    subscriberUID
  );
  subscribeOnStream(
    {
      chain: symbolInfo.chain,
      symbol: symbolInfo.tokenSymbol, 
      address: symbolInfo.tokenAddress
    },
    resolution,
    onRealtimeCallback,
    subscriberUID,
    onResetCacheNeededCallback,
    lastBarsCache.get(
      `${symbolInfo.tokenAddress}:${symbolInfo.chain}:${resolution}`
    ) ?? null
  );
}

const unsubscribeBars = (subscriberUID: string) => {
  console.log(
    "[unsubscribeBars]: Method call with subscriberUID:",
    subscriberUID
  );
  unsubscribeFromStream(subscriberUID);
}

// Datafeed implementation
const Datafeed: IBasicDataFeed = {
  onReady,
  searchSymbols,
  resolveSymbol,
  getBars,
  subscribeBars,
  unsubscribeBars,
};

export default Datafeed;