import React, { useState, useEffect, Fragment } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  sparkline: number[];
}

const extendedMockData: StockData[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc",
    price: 182.5,
    change24h: 2.45,
    volume: 85000000,
    marketCap: 2850000000000,
    sparkline: [180, 181, 183, 180.5, 182, 183.5, 182.5],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp",
    price: 415.75,
    change24h: -1.22,
    volume: 32000000,
    marketCap: 3100000000000,
    sparkline: [420, 418, 416, 417.5, 416.5, 414, 415.75],
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corp",
    price: 485.45,
    change24h: 5.67,
    volume: 125000000,
    marketCap: 1200000000000,
    sparkline: [460, 465, 475, 480, 490, 488, 485.45],
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc",
    price: 138.85,
    change24h: -0.85,
    volume: 28500000,
    marketCap: 1750000000000,
    sparkline: [140, 139.5, 139, 138.5, 139.2, 138.8, 138.85],
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc",
    price: 152.78,
    change24h: 3.21,
    volume: 45000000,
    marketCap: 1580000000000,
    sparkline: [148, 149, 150.5, 152, 153.5, 153, 152.78],
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc",
    price: 245.89,
    change24h: -2.14,
    volume: 95000000,
    marketCap: 780000000000,
    sparkline: [250, 248, 246, 244, 246.5, 245.2, 245.89],
  },
  {
    symbol: "META",
    name: "Meta Platforms",
    price: 325.42,
    change24h: 4.32,
    volume: 22000000,
    marketCap: 820000000000,
    sparkline: [312, 315, 320, 318, 325, 327, 325.42],
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    price: 175.56,
    change24h: 1.89,
    volume: 15000000,
    marketCap: 510000000000,
    sparkline: [172, 173, 175, 174.5, 176, 175.8, 175.56],
  },
  {
    symbol: "V",
    name: "Visa Inc",
    price: 285.78,
    change24h: -3.45,
    volume: 8500000,
    marketCap: 580000000000,
    sparkline: [295, 292, 288, 285, 287, 286, 285.78],
  },
  {
    symbol: "JNJ",
    name: "Johnson & Johnson",
    price: 162.23,
    change24h: 2.67,
    volume: 12000000,
    marketCap: 425000000000,
    sparkline: [158, 160, 161.5, 162.5, 163, 162.8, 162.23],
  },
  {
    symbol: "WMT",
    name: "Walmart Inc",
    price: 165.31,
    change24h: -1.58,
    volume: 9500000,
    marketCap: 535000000000,
    sparkline: [168, 167, 166, 165.5, 166.2, 165.8, 165.31],
  },
  {
    symbol: "PG",
    name: "Procter & Gamble",
    price: 155.24,
    change24h: 0.89,
    volume: 7200000,
    marketCap: 365000000000,
    sparkline: [154, 154.5, 155, 155.5, 155.2, 154.8, 155.24],
  },
  {
    symbol: "HD",
    name: "Home Depot Inc",
    price: 315.28,
    change24h: 3.57,
    volume: 6800000,
    marketCap: 325000000000,
    sparkline: [304, 308, 312, 316, 318, 316.5, 315.28],
  },
  {
    symbol: "BAC",
    name: "Bank of America",
    price: 32.67,
    change24h: -4.23,
    volume: 85000000,
    marketCap: 245000000000,
    sparkline: [34, 33.5, 33, 32.5, 33.2, 33, 32.67],
  },
  {
    symbol: "DIS",
    name: "Walt Disney Co",
    price: 95.45,
    change24h: 1.23,
    volume: 18500000,
    marketCap: 175000000000,
    sparkline: [94, 94.5, 95.2, 95.8, 95.5, 95.1, 95.45],
  },
];

const newsData = [
  {
    time: "14:23:45",
    title: "Apple announces new AI chip partnership",
    sentiment: "positive",
  },
  {
    time: "14:19:12",
    title: "Fed signals potential rate cut in Q2",
    sentiment: "positive",
  },
  {
    time: "14:15:33",
    title: "Tech stocks face regulatory scrutiny",
    sentiment: "negative",
  },
  {
    time: "14:12:07",
    title: "NVIDIA earnings beat estimates by 15%",
    sentiment: "positive",
  },
  {
    time: "14:08:21",
    title: "Banking sector sees $2B outflow",
    sentiment: "negative",
  },
  {
    time: "14:05:18",
    title: "S&P 500 hits new record high",
    sentiment: "positive",
  },
];

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

function Sparkline({
  data,
  isPositive,
}: {
  data: number[];
  isPositive: boolean;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

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
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1 h-full">
        {/* Left Column - Market Data */}
        <div className="lg:col-span-3 space-y-1">
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
                <div className="text-gray-400">SP500</div>
                <div className="text-orange-400">4,890</div>
                <div className="text-green-400">+0.3%</div>
              </div>
              <div className="bg-black p-1">
                <div className="text-gray-400">VIX</div>
                <div className="text-yellow-400">18.2</div>
                <div className="text-yellow-400">MODERATE</div>
              </div>
            </div>
          </div>

          {/* Top Movers */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">TOP MOVERS</div>
            {extendedMockData.slice(0, 8).map((stock) => (
              <div
                key={stock.symbol}
                className="flex justify-between items-center py-0.5 text-xs border-b border-gray-800 last:border-0"
              >
                <span className="text-white">{stock.symbol}</span>
                <span className="text-gray-400">
                  $
                  {stock.price < 1
                    ? stock.price.toFixed(4)
                    : stock.price.toFixed(2)}
                </span>
                <span
                  className={
                    stock.change24h >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  {stock.change24h >= 0 ? "+" : ""}
                  {stock.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* News Feed */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">LIVE NEWS</div>
            {newsData.map((news, idx) => (
              <div
                key={idx}
                className="mb-1 text-xs border-b border-gray-800 pb-1 last:border-0"
              >
                <div className="flex justify-between">
                  <span className="text-orange-400">{news.time}</span>
                  <span
                    className={
                      news.sentiment === "positive"
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {news.sentiment === "positive" ? "↑" : "↓"}
                  </span>
                </div>
                <div className="text-gray-300">{news.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column - Main Trading Data */}
        <div className="lg:col-span-6 bg-gray-900 border border-gray-700">
          <div className="text-orange-400 text-xs p-1 border-b border-gray-700">
            ACTIVE TRADING PAIRS
          </div>
          <div className="overflow-x-auto h-full">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="bg-gray-800 sticky top-0">
                <tr className="text-gray-400">
                  <th className="text-left p-1">PAIR</th>
                  <th className="text-right p-1">PRICE</th>
                  <th className="text-right p-1">24H</th>
                  <th className="text-right p-1 hidden sm:table-cell">7D</th>
                  <th className="text-right p-1">VOL</th>
                  <th className="text-right p-1 hidden md:table-cell">MCAP</th>
                  <th className="text-center p-1 hidden sm:table-cell">
                    CHART
                  </th>
                </tr>
              </thead>
              <tbody>
                {extendedMockData.map((stock, index) => (
                  <tr
                    key={stock.symbol}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="p-1">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center">
                          {stock.symbol.charAt(0)}
                        </div>
                        <span className="text-white">{stock.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right p-1 text-white">
                      $
                      {stock.price < 1
                        ? stock.price.toFixed(4)
                        : stock.price.toLocaleString()}
                    </td>
                    <td
                      className={`text-right p-1 ${
                        stock.change24h >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {stock.change24h >= 0 ? "+" : ""}
                      {stock.change24h.toFixed(2)}%
                    </td>
                    <td
                      className={`text-right p-1 ${
                        Math.random() > 0.5 ? "text-green-400" : "text-red-400"
                      } hidden sm:table-cell`}
                    >
                      {Math.random() > 0.5 ? "+" : "-"}
                      {(Math.random() * 20).toFixed(2)}%
                    </td>
                    <td className="text-right p-1 text-gray-300">
                      ${formatNumber(stock.volume)}
                    </td>
                    <td className="text-right p-1 text-gray-300 hidden md:table-cell">
                      ${formatNumber(stock.marketCap)}
                    </td>
                    <td className="text-center p-1 hidden sm:table-cell">
                      <Sparkline
                        data={stock.sparkline}
                        isPositive={stock.change24h >= 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Additional Data */}
        <div className="lg:col-span-3 space-y-1">
          {/* Volume Leaders */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">VOLUME LEADERS</div>
            {extendedMockData.slice(0, 6).map((stock) => (
              <div
                key={stock.symbol}
                className="flex justify-between text-xs py-0.5 border-b border-gray-800 last:border-0"
              >
                <span className="text-white">{stock.symbol}</span>
                <span className="text-gray-400">
                  ${formatNumber(stock.volume)}
                </span>
              </div>
            ))}
          </div>

          {/* Orderbook Simulator */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">ORDERBOOK - AAPL</div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="text-gray-400">PRICE</div>
              <div className="text-gray-400">SIZE</div>
              <div className="text-gray-400">TOTAL</div>

              {/* Sell Orders */}
              {[183.55, 183.54, 183.53, 183.52, 183.51].map((price, idx) => (
                <Fragment key={price}>
                  <div className="text-red-400">{price.toLocaleString()}</div>
                  <div className="text-white">
                    {(Math.random() * 5).toFixed(3)}
                  </div>
                  <div className="text-gray-400">
                    {(price * Math.random() * 5).toFixed(0)}
                  </div>
                </Fragment>
              ))}

              {/* Spread */}
              <div className="col-span-3 text-center text-orange-400 border-y border-orange-500/30 py-0.5">
                SPREAD: $0.05
              </div>

              {/* Buy Orders */}
              {[182.5, 182.49, 182.48, 182.47, 182.46].map((price, idx) => (
                <Fragment key={price}>
                  <div className="text-green-400">{price.toLocaleString()}</div>
                  <div className="text-white">
                    {(Math.random() * 5).toFixed(3)}
                  </div>
                  <div className="text-gray-400">
                    {(price * Math.random() * 5).toFixed(0)}
                  </div>
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
                <span className="text-gray-400">NYSE</span>
                <span className="text-green-400">OPEN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">NASDAQ</span>
                <span className="text-green-400">OPEN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">LSE</span>
                <span className="text-yellow-400">CLOSED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">TSE</span>
                <span className="text-red-400">CLOSED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
