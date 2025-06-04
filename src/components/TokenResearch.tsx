import { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, Users, Globe, Activity, BarChart3 } from "lucide-react";

const stockData = {
  symbol: "AAPL",
  name: "Apple Inc",
  price: 182.50,
  change24h: 2.45,
  marketCap: 2850000000000,
  volume24h: 85000000,
  outstandingShares: 15600000000,
  floatShares: 15500000000,
  allTimeHigh: 198.23,
  allTimeLow: 142.27,
  institutional: 59.8,
  description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company serves consumers, and small and mid-sized businesses; and the education, enterprise, and government markets."
};

const chartData = [
  { time: "09:30", price: 180.50 },
  { time: "10:00", price: 181.25 },
  { time: "10:30", price: 180.90 },
  { time: "11:00", price: 182.15 },
  { time: "11:30", price: 181.80 },
  { time: "12:00", price: 182.60 },
  { time: "12:30", price: 182.50 }
];

const newsData = [
  {
    title: "Apple Reports Record Q4 Revenue, Beats Estimates",
    source: "Reuters",
    time: "2 hours ago",
    summary: "Apple Inc reported quarterly revenue that exceeded analyst expectations driven by strong iPhone sales."
  },
  {
    title: "Apple Announces New AI Chip Partnership with TSMC",
    source: "Bloomberg", 
    time: "5 hours ago",
    summary: "Strategic partnership aims to develop next-generation neural processing units for future devices."
  },
  {
    title: "Institutional Ownership Increases to 59.8%",
    source: "MarketWatch",
    time: "1 day ago", 
    summary: "Major institutional investors continue to increase their positions in Apple stock."
  }
];

const analystData = [
  { firm: "Goldman Sachs", rating: "BUY", target: 210.00, updated: "2024-01-15" },
  { firm: "Morgan Stanley", rating: "OVERWEIGHT", target: 205.00, updated: "2024-01-12" },
  { firm: "JPMorgan", rating: "OVERWEIGHT", target: 200.00, updated: "2024-01-10" },
  { firm: "Bank of America", rating: "BUY", target: 215.00, updated: "2024-01-08" },
  { firm: "Wells Fargo", rating: "OVERWEIGHT", target: 195.00, updated: "2024-01-05" }
];

const financialData = {
  revenue: 394328000000,
  netIncome: 99803000000,
  grossMargin: 44.13,
  operatingMargin: 29.78,
  profitMargin: 25.31,
  roe: 147.25,
  roa: 28.09,
  currentRatio: 0.98,
  debtToEquity: 1.73,
  freeCashFlow: 84726000000
};

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

export function TokenResearch() {
  const [searchTerm, setSearchTerm] = useState("AAPL");
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
          <span className="text-orange-400">EQUITY RESEARCH</span>
          <span className="text-orange-400">FUNDAMENTAL ANALYSIS</span>
          <span className="text-orange-400">NYSE/NASDAQ</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-orange-400">EST: {currentTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-900 border-b border-gray-700 p-2">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
            <input
              placeholder="Search ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-3 py-1 bg-black border border-gray-700 text-white text-xs w-full font-mono"
            />
          </div>
          <button className="px-3 py-1 bg-orange-600 text-black text-xs font-bold hover:bg-orange-500">
            ANALYZE
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-1 p-1">
        
        {/* Left Column - Stock Overview */}
        <div className="col-span-8 space-y-1">
          {/* Stock Header */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded text-white font-bold text-sm flex items-center justify-center">
                  {stockData.symbol}
                </div>
                <div>
                  <div className="text-orange-400 font-bold">{stockData.name}</div>
                  <div className="text-gray-400">{stockData.symbol} - NASDAQ</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono text-white">${stockData.price.toFixed(2)}</div>
                <div className={`text-lg font-mono ${stockData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stockData.change24h >= 0 ? '+' : ''}{stockData.change24h.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Price Chart */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2">INTRADAY CHART</div>
            <div className="bg-black border border-gray-800 p-2 h-48 flex items-end space-x-1">
              {chartData.map((point, index) => {
                const maxPrice = Math.max(...chartData.map(p => p.price));
                const minPrice = Math.min(...chartData.map(p => p.price));
                const height = ((point.price - minPrice) / (maxPrice - minPrice)) * 160 + 20;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="bg-orange-500 w-full rounded-t"
                      style={{ height: `${height}px` }}
                    ></div>
                    <div className="text-xs text-gray-400 mt-1">{point.time}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2">FINANCIAL METRICS</div>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">REVENUE (TTM)</div>
                <div className="text-white font-mono">${formatNumber(financialData.revenue)}</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">NET INCOME</div>
                <div className="text-white font-mono">${formatNumber(financialData.netIncome)}</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">GROSS MARGIN</div>
                <div className="text-white font-mono">{financialData.grossMargin.toFixed(2)}%</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">PROFIT MARGIN</div>
                <div className="text-white font-mono">{financialData.profitMargin.toFixed(2)}%</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">ROE</div>
                <div className="text-white font-mono">{financialData.roe.toFixed(2)}%</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">ROA</div>
                <div className="text-white font-mono">{financialData.roa.toFixed(2)}%</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">DEBT/EQUITY</div>
                <div className="text-white font-mono">{financialData.debtToEquity.toFixed(2)}</div>
              </div>
              <div className="bg-black border border-gray-800 p-2">
                <div className="text-gray-400">FREE CASH FLOW</div>
                <div className="text-white font-mono">${formatNumber(financialData.freeCashFlow)}</div>
              </div>
            </div>
          </div>

          {/* Analyst Ratings */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2">ANALYST RATINGS</div>
            <div className="bg-black border border-gray-800 p-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left p-1">FIRM</th>
                    <th className="text-center p-1">RATING</th>
                    <th className="text-right p-1">TARGET</th>
                    <th className="text-right p-1">UPDATED</th>
                  </tr>
                </thead>
                <tbody>
                  {analystData.map((analyst, index) => (
                    <tr key={index} className="border-b border-gray-800 last:border-0">
                      <td className="p-1 text-white">{analyst.firm}</td>
                      <td className={`p-1 text-center font-bold ${
                        analyst.rating.includes('BUY') || analyst.rating.includes('OVERWEIGHT') 
                          ? 'text-green-400' 
                          : 'text-yellow-400'
                      }`}>
                        {analyst.rating}
                      </td>
                      <td className="p-1 text-right text-white font-mono">${analyst.target.toFixed(2)}</td>
                      <td className="p-1 text-right text-gray-400">{analyst.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Market Data & News */}
        <div className="col-span-4 space-y-1">
          {/* Market Data */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2">MARKET DATA</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap</span>
                <span className="font-mono text-white">${formatNumber(stockData.marketCap)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volume</span>
                <span className="font-mono text-white">{formatNumber(stockData.volume24h)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Shares Outstanding</span>
                <span className="font-mono text-white">{formatNumber(stockData.outstandingShares)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Float</span>
                <span className="font-mono text-white">{formatNumber(stockData.floatShares)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">52W High</span>
                <span className="font-mono text-white">${stockData.allTimeHigh.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">52W Low</span>
                <span className="font-mono text-white">${stockData.allTimeLow.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Institutional</span>
                <span className="font-mono text-white">{stockData.institutional.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2">COMPANY INFO</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <Globe className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">Sector</span>
                <span className="text-white">Technology</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">Industry</span>
                <span className="text-white">Consumer Electronics</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">Employees</span>
                <span className="text-white">164,000</span>
              </div>
            </div>
          </div>

          {/* Recent News */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2">RECENT NEWS</div>
            <div className="space-y-2">
              {newsData.map((news, index) => (
                <div key={index} className="bg-black border border-gray-800 p-1">
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-white text-xs font-medium hover:text-orange-400 cursor-pointer">
                      {news.title}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{news.time}</span>
                  </div>
                  <div className="text-gray-300 text-xs mb-1">{news.summary}</div>
                  <div className="text-xs text-orange-400">{news.source}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="bg-gray-900 border border-gray-700 p-2">
            <div className="text-orange-400 mb-2">TECHNICAL INDICATORS</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">RSI (14)</span>
                <span className="text-yellow-400 font-mono">65.3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MACD</span>
                <span className="text-green-400 font-mono">+2.45</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SMA (20)</span>
                <span className="text-white font-mono">$178.90</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SMA (50)</span>
                <span className="text-white font-mono">$175.60</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bollinger Upper</span>
                <span className="text-white font-mono">$185.20</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bollinger Lower</span>
                <span className="text-white font-mono">$172.40</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Description */}
      <div className="bg-gray-900 border-t border-orange-500/30 p-2">
        <div className="text-orange-400 mb-1">COMPANY DESCRIPTION</div>
        <div className="text-gray-300 text-xs leading-relaxed">{stockData.description}</div>
      </div>
    </div>
  );
}