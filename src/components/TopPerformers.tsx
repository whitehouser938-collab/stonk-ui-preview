import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface PerformerData {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change1m: number;
  change5m: number;
  change15m: number;
  change1h: number;
  change4h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  volume: number;
  marketCap: number;
  volumeChange: number;
  highDay: number;
  lowDay: number;
  avgVolume: number;
  totalSupply: number;
  circulatingSupply: number;
  icon: string;
}

// Generate comprehensive mock data with Bloomberg-style density
const generateMockData = () => {
  const symbols = [
    { symbol: "PEPE", name: "Pepe", icon: "🐸", basePrice: 0.000001234 },
    { symbol: "SHIB", name: "Shiba Inu", icon: "🐕", basePrice: 0.000008901 },
    { symbol: "WIF", name: "dogwifhat", icon: "🐶", basePrice: 2.45 },
    { symbol: "BONK", name: "Bonk", icon: "💥", basePrice: 0.00002156 },
    { symbol: "FLOKI", name: "FLOKI", icon: "🚀", basePrice: 0.0001678 },
    { symbol: "DOGE", name: "Dogecoin", icon: "🐶", basePrice: 0.073245 },
    { symbol: "MEME", name: "Memecoin", icon: "😂", basePrice: 0.03456 },
    { symbol: "WOJAK", name: "Wojak", icon: "😳", basePrice: 0.000234 },
    { symbol: "CHAD", name: "Chad Token", icon: "💪", basePrice: 0.145 },
    { symbol: "APE", name: "ApeCoin", icon: "🦍", basePrice: 1.234 },
    { symbol: "BABYDOGE", name: "Baby Doge", icon: "👶", basePrice: 0.0000023 },
    { symbol: "ELON", name: "Dogelon Mars", icon: "🚀", basePrice: 0.00000045 },
    { symbol: "KISHU", name: "Kishu Inu", icon: "🐕", basePrice: 0.0000000067 },
    { symbol: "AKITA", name: "Akita Inu", icon: "🐕", basePrice: 0.0000234 },
    { symbol: "HOKK", name: "Hokkaido Inu", icon: "🐕", basePrice: 0.0000001234 },
    { symbol: "RYOSHI", name: "Ryoshi Token", icon: "👨", basePrice: 0.00000567 },
    { symbol: "LEASH", name: "Doge Killer", icon: "🔗", basePrice: 234.56 },
    { symbol: "BONE", name: "Bone Token", icon: "🦴", basePrice: 0.789 },
    { symbol: "TREAT", name: "Treat Token", icon: "🍖", basePrice: 0.0456 },
    { symbol: "PUSSY", name: "Pussy Financial", icon: "🐱", basePrice: 0.00234 }
  ];

  return symbols.map((token, index) => ({
    rank: index + 1,
    symbol: token.symbol,
    name: token.name,
    icon: token.icon,
    price: token.basePrice * (1 + (Math.random() - 0.5) * 0.2),
    change1m: (Math.random() - 0.5) * 20,
    change5m: (Math.random() - 0.5) * 40,
    change15m: (Math.random() - 0.5) * 60,
    change1h: (Math.random() - 0.5) * 80,
    change4h: (Math.random() - 0.5) * 120,
    change24h: (Math.random() - 0.5) * 200,
    change7d: (Math.random() - 0.5) * 500,
    change30d: (Math.random() - 0.5) * 800,
    volume: Math.random() * 5000000000,
    marketCap: Math.random() * 10000000000,
    volumeChange: (Math.random() - 0.5) * 300,
    highDay: token.basePrice * (1 + Math.random() * 0.3),
    lowDay: token.basePrice * (1 - Math.random() * 0.2),
    avgVolume: Math.random() * 3000000000,
    totalSupply: Math.random() * 1000000000000,
    circulatingSupply: Math.random() * 500000000000,
  }));
};

const mockPerformers: PerformerData[] = generateMockData();

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

const formatPrice = (price: number): string => {
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.001) return price.toFixed(6);
  return price.toFixed(10);
};

const formatChange = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
};

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
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-cyan-400 font-mono">CRYPTO PERFORMANCE MONITOR</h2>
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-mono">LIVE</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          <Button
            onClick={() => setViewMode("gainers")}
            className={cn(
              "px-2 py-1 text-xs",
              viewMode === "gainers" ? "bg-green-600" : "bg-gray-700"
            )}
          >
            GAINERS
          </Button>
          <Button
            onClick={() => setViewMode("losers")}
            className={cn(
              "px-2 py-1 text-xs",
              viewMode === "losers" ? "bg-red-600" : "bg-gray-700"
            )}
          >
            LOSERS
          </Button>
        </div>
      </div>

      {/* Bloomberg-style Dense Table */}
      <div className="bg-black border border-gray-700 overflow-hidden">
        <Table className="w-full text-xs font-mono">
          <TableHeader>
            <TableRow className="border-b border-gray-700 bg-gray-900">
              <TableHead className="text-cyan-400 p-1 text-xs">RNK</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs">SYMBOL</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs">NAME</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">PRICE</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">1M</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">5M</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">15M</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">1H</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">4H</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">24H</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">7D</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">30D</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">VOLUME</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">VOL%</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">MCAP</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">HIGH</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">LOW</TableHead>
              <TableHead className="text-cyan-400 p-1 text-xs text-right">SUPPLY</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPerformers.slice(0, 20).map((performer, index) => (
              <TableRow 
                key={performer.symbol} 
                className="border-b border-gray-800 hover:bg-gray-900/30 transition-colors"
              >
                <TableCell className="p-1 text-yellow-400 font-bold">
                  {index + 1}
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs">{performer.icon}</span>
                    <span className="text-white font-bold">{performer.symbol}</span>
                  </div>
                </TableCell>
                <TableCell className="p-1 text-gray-400 text-xs max-w-[80px] truncate">
                  {performer.name}
                </TableCell>
                <TableCell className="p-1 text-right text-white font-bold">
                  ${formatPrice(performer.price)}
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold text-xs",
                  performer.change1m >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change1m)}%
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold text-xs",
                  performer.change5m >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change5m)}%
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold text-xs",
                  performer.change15m >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change15m)}%
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold text-xs",
                  performer.change1h >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change1h)}%
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold text-xs",
                  performer.change4h >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change4h)}%
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold",
                  performer.change24h >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change24h)}%
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold",
                  performer.change7d >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change7d)}%
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right font-bold text-xs",
                  performer.change30d >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.change30d)}%
                </TableCell>
                <TableCell className="p-1 text-right text-cyan-400 text-xs">
                  {formatNumber(performer.volume)}
                </TableCell>
                <TableCell className={cn(
                  "p-1 text-right text-xs",
                  performer.volumeChange >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatChange(performer.volumeChange)}%
                </TableCell>
                <TableCell className="p-1 text-right text-white text-xs">
                  {formatNumber(performer.marketCap)}
                </TableCell>
                <TableCell className="p-1 text-right text-gray-400 text-xs">
                  ${formatPrice(performer.highDay)}
                </TableCell>
                <TableCell className="p-1 text-right text-gray-400 text-xs">
                  ${formatPrice(performer.lowDay)}
                </TableCell>
                <TableCell className="p-1 text-right text-gray-400 text-xs">
                  {formatNumber(performer.circulatingSupply)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bottom Stats Bar */}
      <div className="flex justify-between items-center bg-gray-900 p-2 text-xs font-mono border border-gray-700">
        <div className="flex space-x-6">
          <span className="text-gray-400">TOTAL TRACKED: <span className="text-cyan-400">1,247</span></span>
          <span className="text-gray-400">AVG GAIN: <span className="text-green-400">+34.2%</span></span>
          <span className="text-gray-400">AVG LOSS: <span className="text-red-400">-18.7%</span></span>
        </div>
        <div className="flex space-x-6">
          <span className="text-gray-400">TOTAL VOL: <span className="text-yellow-400">$127.4B</span></span>
          <span className="text-gray-400">LAST UPDATE: <span className="text-green-400">{new Date().toLocaleTimeString()}</span></span>
        </div>
      </div>
    </div>
  );
}