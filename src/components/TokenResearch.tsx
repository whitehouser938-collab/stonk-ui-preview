import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Users, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const tokenData = {
  symbol: "ETH",
  name: "Ethereum",
  price: 2580.75,
  change24h: -1.22,
  marketCap: 310000000000,
  volume24h: 15200000000,
  circulatingSupply: 120280000,
  totalSupply: 120280000,
  allTimeHigh: 4878.26,
  allTimeLow: 0.432,
  holders: 118500000,
  description: "Ethereum is a decentralized platform that runs smart contracts and serves as the foundation for thousands of decentralized applications (dApps) and other cryptocurrencies."
};

const chartData = [
  { time: "00:00", price: 2610 },
  { time: "04:00", price: 2590 },
  { time: "08:00", price: 2570 },
  { time: "12:00", price: 2585 },
  { time: "16:00", price: 2575 },
  { time: "20:00", price: 2560 },
  { time: "24:00", price: 2580 }
];

const newsData = [
  {
    title: "Ethereum Scaling Solutions Show Promising Growth",
    source: "CryptoNews",
    time: "2 hours ago",
    summary: "Layer 2 solutions continue to gain traction with increased transaction volume."
  },
  {
    title: "Major DeFi Protocol Launches on Ethereum",
    source: "DeFi Pulse", 
    time: "5 hours ago",
    summary: "New lending protocol promises improved yields for ETH holders."
  },
  {
    title: "Ethereum Merge Anniversary: Network Performance Review",
    source: "Ethereum Foundation",
    time: "1 day ago", 
    summary: "One year post-merge statistics show significant energy consumption reduction."
  }
];

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

export function TokenResearch() {
  const [searchTerm, setSearchTerm] = useState("ETH");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-orange-400 font-mono">TOKEN RESEARCH</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white w-64"
            />
          </div>
          <Button variant="outline" className="border-orange-500 text-orange-400 hover:bg-orange-500/10">
            Analyze
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Token Overview */}
        <div className="col-span-8">
          <Card className="bg-gray-900/50 border-gray-700 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {tokenData.symbol}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{tokenData.name}</h3>
                <p className="text-gray-400">{tokenData.symbol}/USD</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-3xl font-mono text-white">${tokenData.price.toLocaleString()}</div>
                <div className={`text-lg font-mono ${tokenData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tokenData.change24h >= 0 ? '+' : ''}{tokenData.change24h.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Price Chart */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-200 mb-4">24H Price Chart</h4>
              <div className="bg-gray-800/30 rounded-lg p-4 h-64 flex items-end space-x-2">
                {chartData.map((point, index) => {
                  const maxPrice = Math.max(...chartData.map(p => p.price));
                  const minPrice = Math.min(...chartData.map(p => p.price));
                  const height = ((point.price - minPrice) / (maxPrice - minPrice)) * 200 + 20;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="bg-cyan-500 w-full rounded-t"
                        style={{ height: `${height}px` }}
                      ></div>
                      <div className="text-xs text-gray-400 mt-2">{point.time}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Token Description */}
            <div>
              <h4 className="text-lg font-semibold text-gray-200 mb-2">About</h4>
              <p className="text-gray-300 leading-relaxed">{tokenData.description}</p>
            </div>
          </Card>
        </div>

        {/* Token Stats */}
        <div className="col-span-4 space-y-6">
          <Card className="bg-gray-900/50 border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-4">Market Data</h4>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap</span>
                <span className="font-mono text-white">${formatNumber(tokenData.marketCap)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Volume</span>
                <span className="font-mono text-white">${formatNumber(tokenData.volume24h)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Circulating Supply</span>
                <span className="font-mono text-white">{formatNumber(tokenData.circulatingSupply)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Supply</span>
                <span className="font-mono text-white">{formatNumber(tokenData.totalSupply)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">All Time High</span>
                <span className="font-mono text-white">${tokenData.allTimeHigh.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">All Time Low</span>
                <span className="font-mono text-white">${tokenData.allTimeLow.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 p-6">
            <h4 className="text-lg font-semibold text-gray-200 mb-4">On-Chain Data</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Holders</span>
                </div>
                <span className="font-mono text-white">{formatNumber(tokenData.holders)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Network</span>
                </div>
                <span className="text-white">Ethereum</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Contract</span>
                <span className="font-mono text-sm text-cyan-400">0x...7b73</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent News */}
      <Card className="bg-gray-900/50 border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-200 mb-4">Recent News</h4>
        <div className="space-y-4">
          {newsData.map((news, index) => (
            <div key={index} className="border-b border-gray-800 pb-4 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-white font-medium hover:text-cyan-400 cursor-pointer transition-colors">
                  {news.title}
                </h5>
                <span className="text-sm text-gray-400 whitespace-nowrap ml-4">{news.time}</span>
              </div>
              <p className="text-gray-300 text-sm mb-2">{news.summary}</p>
              <span className="text-xs text-cyan-400">{news.source}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}