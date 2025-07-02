import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "@/api/token";
import LoadingScreen from "@/components/ui/loading";
import { useLoading } from "@/hooks/use-loading";

import {
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Globe,
  Activity,
  BarChart3,
  ChevronDown,
  AlertTriangle,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TradingForm from "./TradingForm";
import BondingCurveProgress from "./BondingCurveProgress";
import TradingViewChart from "@/components/TradingViewChart";

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
}

const TokenPage = () => {
  const { chainId, tokenAddress } = useParams<{
    chainId: string;
    tokenAddress: string;
  }>();
  const navigate = useNavigate();
  const [tokenData, setTokenData] = useState<any>(null);
  const [view, setView] = useState("details");
  const [error, setError] = useState<string | null>(null);

  const { isLoading, startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const fetchTokenData = async () => {
      startLoading(); // Start loading state
      setError(null); // Reset error state
      try {
        if (!chainId || !tokenAddress) {
          throw new Error("Chain ID and token address are required");
        }
        const data = await getToken(chainId, tokenAddress);
        console.log("Fetched token data:", data);

        if (!data) {
          throw new Error("Token not found");
        }

        setTokenData(data);
      } catch (error) {
        console.error("Error fetching token data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch token data"
        );
        setTokenData(null);
      } finally {
        stopLoading(); // Stop loading state
      }
    };

    if (chainId && tokenAddress) {
      fetchTokenData();
    }
  }, [chainId, tokenAddress]);

  const stockData = {
    symbol: "AAPL",
    name: "Apple Inc",
    price: 182.5,
    change24h: 2.45,
    marketCap: 2850000000000,
    volume24h: 85000000,
    outstandingShares: 15600000000,
    floatShares: 15500000000,
    allTimeHigh: 198.23,
    allTimeLow: 142.27,
    institutional: 59.8,
    description:
      "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company serves consumers, and small and mid-sized businesses; and the education, enterprise, and government markets.",
  };

  const chartData = [
    { time: "09:30", price: 180.5 },
    { time: "09:45", price: 180.75 },
    { time: "10:00", price: 181.25 },
    { time: "10:15", price: 181.15 },
    { time: "10:30", price: 180.9 },
    { time: "10:45", price: 181.5 },
    { time: "11:00", price: 182.15 },
    { time: "11:15", price: 182.0 },
    { time: "11:30", price: 181.8 },
    { time: "11:45", price: 182.2 },
    { time: "12:00", price: 182.6 },
    { time: "12:15", price: 182.4 },
    { time: "12:30", price: 182.5 },
    { time: "12:45", price: 182.85 },
  ];

  const newsData = [
    {
      title: "Apple Reports Record Q4 Revenue, Beats Estimates",
      source: "Reuters",
      time: "2 hours ago",
      summary:
        "Apple Inc reported quarterly revenue that exceeded analyst expectations driven by strong iPhone sales.",
    },
    {
      title: "Apple Announces New AI Chip Partnership with TSMC",
      source: "Bloomberg",
      time: "5 hours ago",
      summary:
        "Strategic partnership aims to develop next-generation neural processing units for future devices.",
    },
    {
      title: "Institutional Ownership Increases to 59.8%",
      source: "MarketWatch",
      time: "1 day ago",
      summary:
        "Major institutional investors continue to increase their positions in Apple stock.",
    },
  ];

  const analystData = [
    {
      firm: "Goldman Sachs",
      rating: "BUY",
      target: 210.0,
      updated: "2024-01-15",
    },
    {
      firm: "Morgan Stanley",
      rating: "OVERWEIGHT",
      target: 205.0,
      updated: "2024-01-12",
    },
    {
      firm: "JPMorgan",
      rating: "OVERWEIGHT",
      target: 200.0,
      updated: "2024-01-10",
    },
    {
      firm: "Bank of America",
      rating: "BUY",
      target: 215.0,
      updated: "2024-01-08",
    },
    {
      firm: "Wells Fargo",
      rating: "OVERWEIGHT",
      target: 195.0,
      updated: "2024-01-05",
    },
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
    freeCashFlow: 84726000000,
  };

  function formatNumber(num: number): string {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedView, setSelectedView] = useState("EQUITY RESEARCH");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dataMaxPrice = Math.max(...chartData.map((p) => p.price));
  const dataMinPrice = Math.min(...chartData.map((p) => p.price));
  const priceRange = dataMaxPrice - dataMinPrice;

  // Add 10% padding to the top and bottom of the chart range
  const yAxisPadding = priceRange > 0 ? priceRange * 0.1 : 1;
  const chartMax = dataMaxPrice + yAxisPadding;
  const chartMin = dataMinPrice - yAxisPadding;
  const chartAvg = (chartMax + chartMin) / 2;

  return (
    <div className="bg-black text-gray-100 text-xs font-mono">
      {isLoading && <LoadingScreen />}

      {/* Error/Not Found Screen */}
      {error && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-orange-400 mb-2">
                Token Not Found
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                {error === "Token not found"
                  ? `The token with address ${tokenAddress} on ${chainId?.toUpperCase()} could not be found.`
                  : error}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-black font-bold text-sm transition-all duration-200"
              >
                <Home className="w-4 h-4" />
                <span>Back to Homepage</span>
              </button>

              <button
                onClick={() => window.history.back()}
                className="w-full px-4 py-3 bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 font-bold text-sm transition-all duration-200"
              >
                Go Back
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-xs">
                Make sure the token address and chain are correct
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show if no error and token data exists */}
      {!error && tokenData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1">
          {/* Left Column - Stock Overview */}
          <div className="col-span-12 lg:col-span-8 space-y-1">
            {/* Stock Header */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  {/* Token Logo */}
                  {tokenData?.logoUrl ? (
                    <img
                      src={tokenData.logoUrl}
                      alt={`${tokenData.name} logo`}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {tokenData?.symbol}
                    </div>
                  )}

                  <div>
                    <div className="text-orange-400 font-bold text-base sm:text-lg">
                      {tokenData?.name}
                    </div>
                    <div className="text-gray-400">
                      {tokenData?.symbol} - {tokenData?.chain}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">
                        {tokenData?.tokenAddress
                          ? `${tokenData.tokenAddress.slice(
                              0,
                              4
                            )}...${tokenData.tokenAddress.slice(-4)}`
                          : "N/A"}
                      </span>
                      {tokenData?.tokenAddress && (
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(
                              tokenData.tokenAddress
                            )
                          }
                          className="text-orange-400 hover:text-orange-300 text-sm font-medium"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xl sm:text-2xl font-mono text-white">
                    ${stockData.price.toFixed(2)}
                  </div>
                  <div
                    className={`text-base sm:text-lg font-mono ${
                      stockData.change24h >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {stockData.change24h >= 0 ? "+" : ""}
                    {stockData.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Price Chart */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="text-orange-400 mb-2">INTRADAY CHART</div>
              <TradingViewChart height={300} />
              {/* <div className="bg-black border border-gray-800 p-2 h-48 flex">
              <div className="flex flex-col justify-between h-full text-xs text-gray-500 pr-2 border-r border-gray-700 text-right">
                <span>${chartMax.toFixed(2)}</span>
                <span>${chartAvg.toFixed(2)}</span>
                <span>${chartMin.toFixed(2)}</span>
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-end gap-x-3 px-2 h-full">
                  {chartData.map((point, index) => {
                    const chartRange = chartMax - chartMin;
                    const height =
                      chartRange > 0
                        ? ((point.price - chartMin) / chartRange) * 158 + 2
                        : 80;

                    return (
                      <div
                        key={index}
                        className="flex-1 min-w-[2.5rem] flex flex-col justify-end items-center"
                      >
                        <div
                          className="bg-orange-500 w-full rounded-t"
                          style={{ height: `${height}px` }}
                          title={`$${point.price.toFixed(2)}`}
                        ></div>
                        <div className="text-xs text-gray-400 mt-1 whitespace-nowrap">
                          {point.time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div> */}
            </div>

            {/* Financial Metrics */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="text-orange-400 mb-2">FINANCIAL METRICS</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs">
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">REVENUE (TTM)</div>
                  <div className="text-white font-mono text-sm">
                    ${formatNumber(financialData.revenue)}
                  </div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">NET INCOME</div>
                  <div className="text-white font-mono text-sm">
                    ${formatNumber(financialData.netIncome)}
                  </div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">GROSS MARGIN</div>
                  <div className="text-white font-mono text-sm">
                    {financialData.grossMargin.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">PROFIT MARGIN</div>
                  <div className="text-white font-mono text-sm">
                    {financialData.profitMargin.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">ROE</div>
                  <div className="text-white font-mono text-sm">
                    {financialData.roe.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">ROA</div>
                  <div className="text-white font-mono text-sm">
                    {financialData.roa.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">DEBT/EQUITY</div>
                  <div className="text-white font-mono text-sm">
                    {financialData.debtToEquity.toFixed(2)}
                  </div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">FREE CASH FLOW</div>
                  <div className="text-white font-mono text-sm">
                    ${formatNumber(financialData.freeCashFlow)}
                  </div>
                </div>
              </div>
            </div>

            {/* Analyst Ratings */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="text-orange-400 mb-2">ANALYST RATINGS</div>
              <div className="overflow-x-auto bg-black border border-gray-800 p-1">
                <table className="w-full text-xs min-w-[400px]">
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
                      <tr
                        key={index}
                        className="border-b border-gray-800 last:border-0"
                      >
                        <td className="p-1 text-white">{analyst.firm}</td>
                        <td
                          className={`p-1 text-center font-bold ${
                            analyst.rating.includes("BUY") ||
                            analyst.rating.includes("OVERWEIGHT")
                              ? "text-green-400"
                              : "text-yellow-400"
                          }`}
                        >
                          {analyst.rating}
                        </td>
                        <td className="p-1 text-right text-white font-mono">
                          ${analyst.target.toFixed(2)}
                        </td>
                        <td className="p-1 text-right text-gray-400">
                          {analyst.updated}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              {/* Bottom Description */}
              <div className="bg-gray-900 border-t border-orange-500/30 p-2">
                <div className="text-orange-400 mb-1">COMPANY DESCRIPTION</div>
                <div className="text-gray-300 text-xs leading-relaxed">
                  {tokenData?.description}
                </div>
              </div>
            </div>

            {/* Recent News */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="text-orange-400 mb-2">RECENT NEWS</div>
              <div className="space-y-2">
                {newsData.map((news, index) => (
                  <div
                    key={index}
                    className="bg-black border border-gray-800 p-1"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-1 gap-1">
                      <div className="text-white text-xs font-medium hover:text-orange-400 cursor-pointer">
                        {news.title}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {news.time}
                      </span>
                    </div>
                    <div className="text-gray-300 text-xs mb-1">
                      {news.summary}
                    </div>
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

          {/* Right Column - Market Data & Trading */}
          <div className="col-span-12 lg:col-span-4 space-y-1">
            {/* Market Data */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="text-orange-400 mb-2">MARKET DATA</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400">Market Cap</span>
                  <span className="font-mono text-white text-right">
                    ${formatNumber(stockData.marketCap)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400">Volume</span>
                  <span className="font-mono text-white text-right">
                    {formatNumber(stockData.volume24h)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400">Shares Outstanding</span>
                  <span className="font-mono text-white text-right">
                    {formatNumber(stockData.outstandingShares)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400">Float</span>
                  <span className="font-mono text-white text-right">
                    {formatNumber(stockData.floatShares)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400">52W High</span>
                  <span className="font-mono text-white text-right">
                    ${stockData.allTimeHigh.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400">52W Low</span>
                  <span className="font-mono text-white text-right">
                    ${stockData.allTimeLow.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-gray-400">Institutional</span>
                  <span className="font-mono text-white text-right">
                    {stockData.institutional.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <TradingForm
              chain={tokenData?.chain}
              symbol={tokenData?.symbol}
              tokenAddress={tokenData?.tokenAddress}
            />
            <BondingCurveProgress progress={20} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenPage;
