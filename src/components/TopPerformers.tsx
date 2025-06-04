import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PerformerData {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  volume: number;
  marketCap: number;
  icon: string;
}

const mockPerformers: PerformerData[] = [
  {
    rank: 1,
    symbol: "PEPE",
    name: "Pepe",
    price: 0.000001234,
    change1h: 15.67,
    change24h: 45.23,
    change7d: 156.78,
    volume: 2500000000,
    marketCap: 5200000000,
    icon: "🐸"
  },
  {
    rank: 2,
    symbol: "SHIB",
    name: "Shiba Inu",
    price: 0.000008901,
    change1h: 12.34,
    change24h: 38.91,
    change7d: 89.45,
    volume: 1800000000,
    marketCap: 5100000000,
    icon: "🐕"
  },
  {
    rank: 3,
    symbol: "WIF",
    name: "dogwifhat",
    price: 2.45,
    change1h: 8.76,
    change24h: 23.12,
    change7d: 67.89,
    volume: 450000000,
    marketCap: 2400000000,
    icon: "🐶"
  },
  {
    rank: 4,
    symbol: "BONK",
    name: "Bonk",
    price: 0.00002156,
    change1h: 6.54,
    change24h: 19.87,
    change7d: 54.32,
    volume: 320000000,
    marketCap: 1400000000,
    icon: "💥"
  },
  {
    rank: 5,
    symbol: "FLOKI",
    name: "FLOKI",
    price: 0.0001678,
    change1h: 5.43,
    change24h: 17.65,
    change7d: 43.21,
    volume: 290000000,
    marketCap: 1600000000,
    icon: "🚀"
  }
];

const timeframes = [
  { key: "1h", label: "1H", field: "change1h" as keyof PerformerData },
  { key: "24h", label: "24H", field: "change24h" as keyof PerformerData },
  { key: "7d", label: "7D", field: "change7d" as keyof PerformerData }
];

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

function getRankColor(rank: number): string {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-amber-600";
  return "text-gray-400";
}

function getRankIcon(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🏅";
}

export function TopPerformers() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const [viewMode, setViewMode] = useState<"gainers" | "losers">("gainers");

  const currentField = timeframes.find(t => t.key === selectedTimeframe)?.field || "change24h";
  
  const sortedPerformers = [...mockPerformers].sort((a, b) => {
    const aVal = a[currentField] as number;
    const bVal = b[currentField] as number;
    return viewMode === "gainers" ? bVal - aVal : aVal - bVal;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-cyan-400 font-mono">PERFORMANCE LEADERBOARD</h2>
        <div className="flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <span className="text-gray-400">Top Movers</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <Button
              onClick={() => setViewMode("gainers")}
              className={cn(
                "px-4 py-2 text-sm transition-all",
                viewMode === "gainers"
                  ? "bg-green-600 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              )}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Top Gainers
            </Button>
            <Button
              onClick={() => setViewMode("losers")}
              className={cn(
                "px-4 py-2 text-sm transition-all",
                viewMode === "losers"
                  ? "bg-red-600 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              )}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Top Losers
            </Button>
          </div>
        </div>

        <div className="flex bg-gray-800 rounded-lg p-1">
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe.key}
              onClick={() => setSelectedTimeframe(timeframe.key)}
              className={cn(
                "px-4 py-2 text-sm transition-all",
                selectedTimeframe === timeframe.key
                  ? "bg-cyan-600 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              )}
            >
              {timeframe.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="grid gap-4">
        {sortedPerformers.slice(0, 10).map((performer, index) => {
          const changeValue = performer[currentField] as number;
          const isPositive = changeValue >= 0;
          
          return (
            <Card key={performer.symbol} className="bg-gray-900/50 border-gray-700 p-6 hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Rank */}
                  <div className="flex items-center space-x-2 w-16">
                    <span className="text-2xl">{getRankIcon(index + 1)}</span>
                    <span className={cn("text-xl font-bold", getRankColor(index + 1))}>
                      #{index + 1}
                    </span>
                  </div>

                  {/* Token Info */}
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{performer.icon}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-bold text-white">{performer.symbol}</h3>
                        <Star className="w-4 h-4 text-gray-400 hover:text-yellow-400 cursor-pointer transition-colors" />
                      </div>
                      <p className="text-gray-400">{performer.name}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-lg font-mono text-white">
                      ${performer.price.toFixed(performer.price > 1 ? 2 : 8)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Vol: ${formatNumber(performer.volume)}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="flex items-center space-x-8">
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">1H</div>
                    <div className={cn(
                      "font-mono font-bold",
                      performer.change1h >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {performer.change1h >= 0 ? "+" : ""}{performer.change1h.toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">24H</div>
                    <div className={cn(
                      "font-mono font-bold",
                      performer.change24h >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {performer.change24h >= 0 ? "+" : ""}{performer.change24h.toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">7D</div>
                    <div className={cn(
                      "font-mono font-bold text-lg",
                      performer.change7d >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {performer.change7d >= 0 ? "+" : ""}{performer.change7d.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">Market Cap</div>
                    <div className="font-mono text-white">
                      ${formatNumber(performer.marketCap)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      isPositive ? "bg-green-500" : "bg-red-500"
                    )}
                    style={{ 
                      width: `${Math.min(Math.abs(changeValue), 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-4 gap-4 mt-8">
        <Card className="bg-gray-900/50 border-gray-700 p-4 text-center">
          <div className="text-2xl font-mono text-green-400">+127%</div>
          <div className="text-sm text-gray-400">Avg Gainer</div>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700 p-4 text-center">
          <div className="text-2xl font-mono text-red-400">-23%</div>
          <div className="text-sm text-gray-400">Avg Loser</div>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700 p-4 text-center">
          <div className="text-2xl font-mono text-cyan-400">1,247</div>
          <div className="text-sm text-gray-400">Tracked Tokens</div>
        </Card>
        <Card className="bg-gray-900/50 border-gray-700 p-4 text-center">
          <div className="text-2xl font-mono text-yellow-400">$89.2B</div>
          <div className="text-sm text-gray-400">Total Volume</div>
        </Card>
      </div>
    </div>
  );
}