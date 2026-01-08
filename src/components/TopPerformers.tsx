import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Star, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  const [selectedView, setSelectedView] = useState("CRYPTO PERFORMANCE MONITOR");

  const currentField = timeframes.find(t => t.key === selectedTimeframe)?.field || "change24h";
  
  const sortedPerformers = [...mockPerformers].sort((a, b) => {
    const aVal = a[currentField] as number;
    const bVal = b[currentField] as number;
    return viewMode === "gainers" ? bVal - aVal : aVal - bVal;
  });

  return (
    <div className="text-gray-100 text-xs font-mono">
      {/* Top Time Bar */}
      <div className="bg-bg-card border-b border-orange-500/30 p-2 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Desktop View */}
          <span className="text-orange-500 font-bold whitespace-nowrap hidden md:inline">CRYPTO PERFORMANCE MONITOR</span>
          <span className="text-orange-500 hidden md:inline whitespace-nowrap">TOP PERFORMERS</span>
          <span className="text-orange-500 hidden md:inline whitespace-nowrap">REAL-TIME</span>

          {/* Mobile Dropdown View */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-1 text-orange-500 font-bold whitespace-nowrap">
                <span>{selectedView}</span>
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-bg-card border-gray-700 text-gray-400">
                <DropdownMenuItem onClick={() => setSelectedView("CRYPTO PERFORMANCE MONITOR")} className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100">CRYPTO PERFORMANCE MONITOR</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedView("TOP PERFORMERS")} className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100">TOP PERFORMERS</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedView("REAL-TIME")} className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100">REAL-TIME</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="text-orange-500 whitespace-nowrap">EST: {new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400">LIVE</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 p-1">
        {/* Header Controls */}
        <div className="bg-bg-card border border-gray-700 p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h2 className="text-base sm:text-xl font-bold text-orange-500 font-mono">LEADERBOARD</h2>
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-500 font-mono">LIVE</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {/* Timeframe Selector */}
              <div className="flex items-center space-x-1">
                <span className="text-gray-400 text-xs whitespace-nowrap">TIMEFRAME:</span>
                <div className="flex space-x-1">
                  {timeframes.map((tf) => (
                    <Button
                      key={tf.key}
                      onClick={() => setSelectedTimeframe(tf.key)}
                      className={cn(
                        "px-2 py-1 text-xs",
                        selectedTimeframe === tf.key ? "bg-orange-600" : "bg-gray-700"
                      )}
                    >
                      {tf.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Gainers/Losers Toggle */}
              <div className="flex items-center space-x-1">
                <span className="text-gray-400 text-xs whitespace-nowrap">VIEW:</span>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => setViewMode("gainers")}
                    className={cn(
                      "px-3 py-1 text-xs",
                      viewMode === "gainers" ? "bg-green-600" : "bg-gray-700"
                    )}
                  >
                    GAINERS
                  </Button>
                  <Button
                    onClick={() => setViewMode("losers")}
                    className={cn(
                      "px-3 py-1 text-xs",
                      viewMode === "losers" ? "bg-red-600" : "bg-gray-700"
                    )}
                  >
                    LOSERS
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-1">
          {sortedPerformers.slice(0, 20).map((performer, index) => (
            <Card key={performer.symbol} className="bg-bg-card border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400 font-bold text-sm font-mono">#{index + 1}</span>
                  <span className="text-xs">{performer.icon}</span>
                  <div>
                    <div className="text-white font-bold text-sm font-mono">{performer.symbol}</div>
                    <div className="text-gray-400 text-xs truncate font-mono">{performer.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-sm font-mono">${formatPrice(performer.price)}</div>
                  <div className={cn(
                    "text-xs font-bold font-mono",
                    (performer[currentField] as number) >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatChange(performer[currentField] as number)}%
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-400">24H:</span>
                  <span className={cn(
                    "font-bold",
                    performer.change24h >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatChange(performer.change24h)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">7D:</span>
                  <span className={cn(
                    "font-bold",
                    performer.change7d >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatChange(performer.change7d)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vol:</span>
                  <span className="text-orange-500">{formatNumber(performer.volume)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">MCap:</span>
                  <span className="text-white">{formatNumber(performer.marketCap)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-bg-card border border-gray-700 overflow-auto">
          <Table className="w-full text-xs font-mono min-w-[1200px]">
            <TableHeader>
              <TableRow className="border-b border-gray-700 bg-bg-card">
                <TableHead className="text-orange-500 p-1 text-xs">RNK</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs">SYMBOL</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs">NAME</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">PRICE</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">1M</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">5M</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">15M</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">1H</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">4H</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">24H</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">7D</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">30D</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">VOLUME</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">VOL%</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">MCAP</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">HIGH</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">LOW</TableHead>
                <TableHead className="text-orange-500 p-1 text-xs text-right">SUPPLY</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPerformers.slice(0, 20).map((performer, index) => (
                <TableRow 
                  key={performer.symbol} 
                  className="border-b border-gray-800 hover:bg-bg-card-hover/30 transition-colors"
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
                  <TableCell className="p-1 text-right text-orange-500 text-xs">
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
        <div className="bg-bg-card p-2 sm:p-3 text-xs font-mono border border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm">
              <span className="text-gray-400">TOTAL TRACKED: <span className="text-orange-500">1,247</span></span>
              <span className="text-gray-400">AVG GAIN: <span className="text-green-400">+34.2%</span></span>
              <span className="text-gray-400">AVG LOSS: <span className="text-red-400">-18.7%</span></span>
            </div>
            <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm">
              <span className="text-gray-400">TOTAL VOL: <span className="text-yellow-400">$127.4B</span></span>
              <span className="text-gray-400">LAST UPDATE: <span className="text-orange-500">{new Date().toLocaleTimeString()}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}