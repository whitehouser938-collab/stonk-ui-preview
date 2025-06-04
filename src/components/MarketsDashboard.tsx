import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
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

const mockData: CryptoData[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 43250.50,
    change24h: 2.45,
    volume: 28500000000,
    marketCap: 850000000000,
    sparkline: [42800, 42900, 43100, 42850, 43200, 43350, 43250]
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 2580.75,
    change24h: -1.22,
    volume: 15200000000,
    marketCap: 310000000000,
    sparkline: [2610, 2590, 2570, 2585, 2575, 2560, 2580]
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 98.45,
    change24h: 5.67,
    volume: 2100000000,
    marketCap: 42000000000,
    sparkline: [93, 94, 96, 97, 99, 100, 98]
  },
  {
    symbol: "ADA",
    name: "Cardano",
    price: 0.485,
    change24h: -0.85,
    volume: 850000000,
    marketCap: 17000000000,
    sparkline: [0.49, 0.488, 0.486, 0.484, 0.487, 0.485, 0.485]
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    price: 36.78,
    change24h: 3.21,
    volume: 650000000,
    marketCap: 14500000000,
    sparkline: [35.5, 36, 36.2, 36.8, 37, 36.9, 36.78]
  }
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
  const [sortBy, setSortBy] = useState<keyof CryptoData>("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedData = [...mockData].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const multiplier = sortOrder === "asc" ? 1 : -1;
    return (aVal > bVal ? 1 : -1) * multiplier;
  });

  const handleSort = (key: keyof CryptoData) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-cyan-400 font-mono">MARKETS OVERVIEW</h2>
        <div className="text-sm text-gray-400">
          <span className="text-gray-500">Last Update:</span>{" "}
          <span className="font-mono text-green-400">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Market Cap</div>
          <div className="text-2xl font-mono text-white">$1.68T</div>
          <div className="text-sm text-green-400 flex items-center mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            +2.4%
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">24h Volume</div>
          <div className="text-2xl font-mono text-white">$89.2B</div>
          <div className="text-sm text-red-400 flex items-center mt-1">
            <TrendingDown className="w-3 h-3 mr-1" />
            -5.1%
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">BTC Dominance</div>
          <div className="text-2xl font-mono text-white">50.6%</div>
          <div className="text-sm text-green-400 flex items-center mt-1">
            <TrendingUp className="w-3 h-3 mr-1" />
            +0.3%
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Active Pairs</div>
          <div className="text-2xl font-mono text-white">1,247</div>
          <div className="text-sm text-gray-400">Trading Now</div>
        </div>
      </div>

      {/* Trading Pairs Table */}
      <div className="bg-gray-900/30 border border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-800/50 px-6 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200">Active Trading Pairs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/30 border-b border-gray-700">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Asset</th>
                <th 
                  className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200"
                  onClick={() => handleSort("price")}
                >
                  Price
                </th>
                <th 
                  className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200"
                  onClick={() => handleSort("change24h")}
                >
                  24h Change
                </th>
                <th 
                  className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200"
                  onClick={() => handleSort("volume")}
                >
                  Volume
                </th>
                <th 
                  className="text-right p-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200"
                  onClick={() => handleSort("marketCap")}
                >
                  Market Cap
                </th>
                <th className="text-center p-4 text-sm font-medium text-gray-400">Chart</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((crypto, index) => (
                <tr 
                  key={crypto.symbol}
                  className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {crypto.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{crypto.symbol}</div>
                        <div className="text-sm text-gray-400">{crypto.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-white">
                    ${crypto.price.toLocaleString()}
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      "font-mono",
                      crypto.change24h >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {crypto.change24h >= 0 ? "+" : ""}{crypto.change24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-gray-300">
                    ${formatNumber(crypto.volume)}
                  </td>
                  <td className="p-4 text-right font-mono text-gray-300">
                    ${formatNumber(crypto.marketCap)}
                  </td>
                  <td className="p-4 text-center">
                    <Sparkline data={crypto.sparkline} isPositive={crypto.change24h >= 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}