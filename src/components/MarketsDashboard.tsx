import React, { useState, useEffect, Fragment } from "react";
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  sparkline: number[];
}

const extendedMockData: CryptoData[] = [
  { symbol: "BTC", name: "Bitcoin", price: 43250.50, change24h: 2.45, volume: 28500000000, marketCap: 850000000000, sparkline: [42800, 42900, 43100, 42850, 43200, 43350, 43250] },
  { symbol: "ETH", name: "Ethereum", price: 2580.75, change24h: -1.22, volume: 15200000000, marketCap: 310000000000, sparkline: [2610, 2590, 2570, 2585, 2575, 2560, 2580] },
  { symbol: "SOL", name: "Solana", price: 98.45, change24h: 5.67, volume: 2100000000, marketCap: 42000000000, sparkline: [93, 94, 96, 97, 99, 100, 98] },
  { symbol: "ADA", name: "Cardano", price: 0.485, change24h: -0.85, volume: 850000000, marketCap: 17000000000, sparkline: [0.49, 0.488, 0.486, 0.484, 0.487, 0.485, 0.485] },
  { symbol: "AVAX", name: "Avalanche", price: 36.78, change24h: 3.21, volume: 650000000, marketCap: 14500000000, sparkline: [35.5, 36, 36.2, 36.8, 37, 36.9, 36.78] },
  { symbol: "DOT", name: "Polkadot", price: 7.89, change24h: -2.14, volume: 420000000, marketCap: 9800000000, sparkline: [8.1, 8.0, 7.9, 7.8, 7.9, 7.85, 7.89] },
  { symbol: "MATIC", name: "Polygon", price: 0.89, change24h: 4.32, volume: 680000000, marketCap: 8200000000, sparkline: [0.85, 0.86, 0.88, 0.87, 0.89, 0.90, 0.89] },
  { symbol: "LINK", name: "Chainlink", price: 14.56, change24h: 1.89, volume: 590000000, marketCap: 8100000000, sparkline: [14.2, 14.3, 14.5, 14.4, 14.6, 14.55, 14.56] },
  { symbol: "UNI", name: "Uniswap", price: 6.78, change24h: -3.45, volume: 340000000, marketCap: 5100000000, sparkline: [7.0, 6.9, 6.8, 6.7, 6.8, 6.75, 6.78] },
  { symbol: "ATOM", name: "Cosmos", price: 10.23, change24h: 2.67, volume: 280000000, marketCap: 4000000000, sparkline: [9.9, 10.0, 10.1, 10.2, 10.3, 10.25, 10.23] },
  { symbol: "ALGO", name: "Algorand", price: 0.31, change24h: -1.58, volume: 180000000, marketCap: 2400000000, sparkline: [0.32, 0.315, 0.31, 0.308, 0.312, 0.31, 0.31] },
  { symbol: "XLM", name: "Stellar", price: 0.124, change24h: 0.89, volume: 220000000, marketCap: 3100000000, sparkline: [0.122, 0.123, 0.124, 0.125, 0.124, 0.123, 0.124] },
  { symbol: "VET", name: "VeChain", price: 0.028, change24h: 3.57, volume: 95000000, marketCap: 2000000000, sparkline: [0.027, 0.0275, 0.028, 0.0285, 0.028, 0.0278, 0.028] },
  { symbol: "FTM", name: "Fantom", price: 0.67, change24h: -4.23, volume: 67000000, marketCap: 1800000000, sparkline: [0.70, 0.69, 0.68, 0.67, 0.68, 0.675, 0.67] },
  { symbol: "NEAR", name: "NEAR Protocol", price: 3.45, change24h: 1.23, volume: 89000000, marketCap: 3700000000, sparkline: [3.4, 3.42, 3.45, 3.46, 3.44, 3.43, 3.45] }
];

const newsData = [
  { time: "14:23:45", title: "Bitcoin ETF sees $2.1B inflow this week", sentiment: "positive" },
  { time: "14:19:12", title: "Ethereum Shanghai upgrade scheduled for Q2", sentiment: "positive" },
  { time: "14:15:33", title: "SEC delays decision on spot ETH ETF", sentiment: "negative" },
  { time: "14:12:07", title: "Solana DEX volume hits new ATH", sentiment: "positive" },
  { time: "14:08:21", title: "Major DeFi protocol reports $50M exploit", sentiment: "negative" },
  { time: "14:05:18", title: "PayPal expands crypto services to EU", sentiment: "positive" },
];

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="60" height="20" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        className="drop-shadow-sm"
      />
    </svg>
  );
}

export function MarketsDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen overflow-auto bg-black text-gray-100 text-xs font-mono">
      {/* Top Time Bar */}
      <div className="bg-gray-900 border-b border-orange-500/30 p-1 flex justify-between items-center">
        <div className="flex space-x-6">
          <span className="text-orange-400">NYC: {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}</span>
          <span className="text-orange-400">LON: {currentTime.toLocaleTimeString('en-GB', { timeZone: 'Europe/London' })}</span>
          <span className="text-orange-400">TOK: {currentTime.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
          <span className="text-orange-400">SYD: {currentTime.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney' })}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400">LIVE</span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-1 p-1 h-full">
        
        {/* Left Column - Market Data */}
        <div className="col-span-3 space-y-1">
          {/* Market Overview */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">MARKET OVERVIEW</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="bg-black p-1">
                <div className="text-gray-400">TOTAL CAP</div>
                <div className="text-green-400">$1.68T</div>
                <div className="text-green-400">+2.4%</div>
              </div>
              <div className="bg-black p-1">
                <div className="text-gray-400">24H VOL</div>
                <div className="text-red-400">$89.2B</div>
                <div className="text-red-400">-5.1%</div>
              </div>
              <div className="bg-black p-1">
                <div className="text-gray-400">BTC DOM</div>
                <div className="text-orange-400">50.6%</div>
                <div className="text-green-400">+0.3%</div>
              </div>
              <div className="bg-black p-1">
                <div className="text-gray-400">FEAR/GREED</div>
                <div className="text-yellow-400">72</div>
                <div className="text-yellow-400">GREED</div>
              </div>
            </div>
          </div>

          {/* Top Movers */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">TOP MOVERS</div>
            {extendedMockData.slice(0, 8).map((crypto) => (
              <div key={crypto.symbol} className="flex justify-between items-center py-0.5 text-xs border-b border-gray-800 last:border-0">
                <span className="text-white">{crypto.symbol}</span>
                <span className="text-gray-400">${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toFixed(2)}</span>
                <span className={crypto.change24h >= 0 ? "text-green-400" : "text-red-400"}>
                  {crypto.change24h >= 0 ? "+" : ""}{crypto.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* News Feed */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">LIVE NEWS</div>
            {newsData.map((news, idx) => (
              <div key={idx} className="mb-1 text-xs border-b border-gray-800 pb-1 last:border-0">
                <div className="flex justify-between">
                  <span className="text-orange-400">{news.time}</span>
                  <span className={news.sentiment === "positive" ? "text-green-400" : "text-red-400"}>
                    {news.sentiment === "positive" ? "↑" : "↓"}
                  </span>
                </div>
                <div className="text-gray-300">{news.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column - Main Trading Data */}
        <div className="col-span-6 bg-gray-900 border border-gray-700">
          <div className="text-orange-400 text-xs p-1 border-b border-gray-700">ACTIVE TRADING PAIRS</div>
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead className="bg-gray-800 sticky top-0">
                <tr className="text-gray-400">
                  <th className="text-left p-1">PAIR</th>
                  <th className="text-right p-1">PRICE</th>
                  <th className="text-right p-1">24H</th>
                  <th className="text-right p-1">7D</th>
                  <th className="text-right p-1">VOL</th>
                  <th className="text-right p-1">MCAP</th>
                  <th className="text-center p-1">CHART</th>
                </tr>
              </thead>
              <tbody>
                {extendedMockData.map((crypto, index) => (
                  <tr key={crypto.symbol} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-1">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center">
                          {crypto.symbol.charAt(0)}
                        </div>
                        <span className="text-white">{crypto.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right p-1 text-white">
                      ${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toLocaleString()}
                    </td>
                    <td className={`text-right p-1 ${crypto.change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {crypto.change24h >= 0 ? "+" : ""}{crypto.change24h.toFixed(2)}%
                    </td>
                    <td className={`text-right p-1 ${Math.random() > 0.5 ? "text-green-400" : "text-red-400"}`}>
                      {Math.random() > 0.5 ? "+" : "-"}{(Math.random() * 20).toFixed(2)}%
                    </td>
                    <td className="text-right p-1 text-gray-300">
                      ${formatNumber(crypto.volume)}
                    </td>
                    <td className="text-right p-1 text-gray-300">
                      ${formatNumber(crypto.marketCap)}
                    </td>
                    <td className="text-center p-1">
                      <Sparkline data={crypto.sparkline} isPositive={crypto.change24h >= 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Additional Data */}
        <div className="col-span-3 space-y-1">
          {/* Volume Leaders */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">VOLUME LEADERS</div>
            {extendedMockData.slice(0, 6).map((crypto) => (
              <div key={crypto.symbol} className="flex justify-between text-xs py-0.5 border-b border-gray-800 last:border-0">
                <span className="text-white">{crypto.symbol}</span>
                <span className="text-gray-400">${formatNumber(crypto.volume)}</span>
              </div>
            ))}
          </div>

          {/* Orderbook Simulator */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">ORDERBOOK - BTC/USD</div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="text-gray-400">PRICE</div>
              <div className="text-gray-400">SIZE</div>
              <div className="text-gray-400">TOTAL</div>
              
              {/* Sell Orders */}
              {[43255, 43254, 43253, 43252, 43251].map((price, idx) => (
                <Fragment key={price}>
                  <div className="text-red-400">{price.toLocaleString()}</div>
                  <div className="text-white">{(Math.random() * 5).toFixed(3)}</div>
                  <div className="text-gray-400">{(price * Math.random() * 5).toFixed(0)}</div>
                </Fragment>
              ))}
              
              {/* Spread */}
              <div className="col-span-3 text-center text-orange-400 border-y border-orange-500/30 py-0.5">
                SPREAD: $2.50
              </div>
              
              {/* Buy Orders */}
              {[43250, 43249, 43248, 43247, 43246].map((price, idx) => (
                <Fragment key={price}>
                  <div className="text-green-400">{price.toLocaleString()}</div>
                  <div className="text-white">{(Math.random() * 5).toFixed(3)}</div>
                  <div className="text-gray-400">{(price * Math.random() * 5).toFixed(0)}</div>
                </Fragment>
              ))}
            </div>
          </div>

          {/* Market Depth */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">MARKET DEPTH</div>
            <div className="space-y-0.5">
              {[
                { level: "1%", bid: "847K", ask: "923K" },
                { level: "2%", bid: "1.2M", ask: "1.4M" },
                { level: "5%", bid: "2.8M", ask: "3.1M" },
                { level: "10%", bid: "5.2M", ask: "5.9M" },
              ].map((depth, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-1 text-xs">
                  <div className="text-gray-400">{depth.level}</div>
                  <div className="text-green-400">{depth.bid}</div>
                  <div className="text-red-400">{depth.ask}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Exchange Status */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">EXCHANGE STATUS</div>
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">BINANCE</span>
                <span className="text-green-400">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">COINBASE</span>
                <span className="text-green-400">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">KRAKEN</span>
                <span className="text-yellow-400">DELAYED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">BYBIT</span>
                <span className="text-green-400">ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}