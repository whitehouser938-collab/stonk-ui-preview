export interface TokenDetails {
  name: string;
  symbol: string;
  totalSupply: number;
  chain: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  twitterUrl: string;
  telegramUrl: string;
  deployerAddress: string;
  tokenAddress: string;
  bondingCurveAddress: string;
  deploymentTimestamp?: string;
  isGraduated?: boolean;
  uniswapPair?: string;
  curveStatus?: {
    progress: number;
    graduationThreshold: string;
    assetBalance: string;
    isGraduated: boolean;
    marketCap: string;
    currentPrice: string;
    assetToken: string;
    stonkToken: string;
  };
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

export type Chain = "SEP" | "SOL" | "BASE";
