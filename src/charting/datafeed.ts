import { BarData, Chain } from "@/types";
import { getTradeLimitForResolution, parseTvSymbol, TVAsset, TVMode } from "./helpers";
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
  asset: TVAsset,
  mode: TVMode,
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
  let called = false;

  const safeHistory = (bars: any[], meta: { noData: boolean }) => {
    if (called) return;
    called = true;
    onHistoryCallback(bars, meta);
  };

  const safeError = (err: any) => {
    if (called) return;
    called = true;
    onErrorCallback(err);
  };

  console.log(periodParams);
  const { to, firstDataRequest, countBack } = periodParams;

  const cacheKey = `${symbolInfo.tokenAddress}:${symbolInfo.chain}:${resolution}`;

  if (firstDataRequest) {
    lastBarsCache.delete(cacheKey);
    endOfDataCache.delete(cacheKey);
  }else{
    if (endOfDataCache.has(cacheKey) && endOfDataCache.get(cacheKey)){
      safeHistory([], { noData: true });
      return;
    }
  }
  
  try {
    const limit = firstDataRequest ? 501 : countBack;
    const toMs = to * 1000;

    const data: { bars: BarData[] } = await getTokenOHLCVBars(
      symbolInfo.tokenAddress,
      symbolInfo.chain,
      resolutionMap[resolution as keyof typeof resolutionMap],
      limit,
      firstDataRequest ? undefined : toMs
    );

    if (!data || !data.bars || data.bars.length === 0) {
      onHistoryCallback([], { noData: true });
      return;
    }

    const bars = data.bars.map((bar: BarData) => {
      const assetMultiplier = symbolInfo.asset === "USD" ? 1 : 1/bar.assetUsdPrice;
      const modeMultiplier = symbolInfo.mode === "mcap" ? symbolInfo.tokenSupply : 1;

      const multiplier = assetMultiplier * modeMultiplier;
      const newBar = {
        open: bar.open * multiplier,
        close: bar.close * multiplier,
        high: bar.high * multiplier,
        low: bar.low * multiplier,
        volume: Number(bar.volume),
        time: Number(bar.time),
      }
      return newBar;
    });
    console.log("[getBars]: Retrieved bars for ", symbolInfo.name, bars);

    bars.sort((a, b) => a.time - b.time);

    const noMoreData = limit > bars.length;
    endOfDataCache.set(cacheKey, noMoreData);

    safeHistory(bars, { noData: false });
  } catch (error) {
    safeError(error);
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
      address: symbolInfo.tokenAddress,
      tokenSupply: symbolInfo.tokenSupply,
      mode: symbolInfo.mode,
      asset: symbolInfo.asset,
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