interface VolumeData {
  totalVolume: number;
  tradeCount24h: number;
  buyCount24h: number;
  buyCount6h: number;
  buyCount1h: number;
  buyCount5m: number;
  sellCount24h: number;
  sellCount6h: number;
  sellCount1h: number;
  sellCount5m: number;
  buyVolume24h: number;
  buyVolume6h: number;
  buyVolume1h: number;
  buyVolume5m: number;
  sellVolume24h: number;
  sellVolume6h: number;
  sellVolume1h: number;
  sellVolume5m: number;
  currentPrice: number;
  price24h: number;
  price6h: number;
  price1h: number;
  price5m: number;
  priceChange24h: number;
  priceChange6h: number;
  priceChange1h: number;
  priceChange5m: number;
}

interface TokenVolumeSummary extends VolumeData {
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  markets: Set<string>;
  chain: string;
}

export interface TokenMarketOverview extends TokenVolumeSummary {
  graduated: boolean;
  graduationTimestamp: string | null;
  deploymentTimestamp: string;
  logoUrl: string | null;
  uniswapPairAddress: string | null
}

export interface TokenFullData{
  name: string;
  symbol: string;
  totalSupply: number;
  chain: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  twitterUrl: string | null;
  telegramUrl: string | null;
  deployer: {
    address: string;
    username: string;
    pfp: string;
  };
  tokenAddress: string;
  bondingCurveAddress: string;
  deploymentTimestamp: string;
  isGraduated: boolean;
  uniswapPair?: string;
  price: VolumeData
}

export interface TradeData {
  transactionHash: string;
  timestamp: string;
  marketAddress: string;
  marketType: string;
  maker: string;
  tradeType: "BUY" | "SELL";
  baseAmount: string;
  quoteAmount: string;
  price: string;
  usdPrice: string;
  usdVolume: string;
  logIndex: number;
}

export interface BarData {
  time: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface TradeUpdateMessage {
  type: "trades";
  channel: string;
  trades: TradeData[];
}

export interface BarUpdateMessage {
  type: "bar";
  channel: string;
  bar: BarData;
}

export interface TokenMarketUpdateMessage {
  type: "tokenMarketOverview";
  channel: string;
  tokenMarketOverview: TokenMarketOverview;
}

export interface MarketsUpdateMessage {
  type: "marketsOverview";
  channel: string;
  marketsOverview: TokenMarketOverview[];
}

export type Chain = "SEP";

export const SUBSCRIPTION_TYPES = {
  bars: {
    prefix: "token_bars",
    subscribeType: "subscribeBars",
    unsubscribeType: "unsubscribeBars",
    channelFormatter: (address: string, chain: string, resolution: string) => 
      `token_bars:${chain}:${address}:${resolution}`,
  },
  trades: {
    prefix: "token_trades",
    subscribeType: "subscribeTrades",
    unsubscribeType: "unsubscribeTrades",
    channelFormatter: (address: string, chain: string) => 
      `token_trades:${chain}:${address}`,
  },
  tokenMarketOverview: {
    prefix: "token_market_overview",
    subscribeType: "subscribeTokenMarketOverview",
    unsubscribeType: "unsubscribeTokenMarketOverview",
    channelFormatter: (address: string, chain: string) => 
      `token_market_overview:${chain}:${address}`,
  },
  marketsOverview: {
    prefix: "markets_overview",
    subscribeType: "subscribeMarketsOverview",
    unsubscribeType: "unsubscribeMarketsOverview",
    channelFormatter: (chain: string) => 
      `markets_overview:${chain}`,
  },
} as const;
