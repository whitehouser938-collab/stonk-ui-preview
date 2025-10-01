import React, { useState, useEffect, Fragment } from "react";
import { Circle } from "lucide-react";
import { getAllTokens, getBondingCurveVolumeData } from "@/api/token";
import { useNavigate } from "react-router-dom";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  sparkline: number[];
}

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  tokenAddress: string;
  chain: string;
  graduated: boolean;
  uniswapPairAddress?: string;
  graduationTimestamp?: string;
  logoUrl?: string;
  curveStatus?: {
    progress: number;
    marketCap: string;
  };
  currentPrice?: string;
  volume24h?: string;
  volume6h?: string;
  volume1h?: string;
  volume5m?: string;
  totalVolume?: string;
  tradeCount?: string;
  deploymentTimestamp?: string;
  createdAt?: string;
}

interface VolumeLeaderData {
  tokenAddress: string;
  symbol: string;
  name: string;
  volume24h: string;
  totalVolume: string;
  tradeCount: string;
  isGraduated: boolean;
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

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(2);
}

function formatTokenAge(timestamp: string): string {
  if (!timestamp) return "N/A";

  const deploymentTime = new Date(timestamp).getTime(); // Parse ISO date string
  const now = Date.now();
  const ageInMs = now - deploymentTime;

  const days = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  const remainingMsAfterDays = ageInMs % (1000 * 60 * 60 * 24);
  const hours = Math.floor(remainingMsAfterDays / (1000 * 60 * 60));
  const remainingMsAfterHours = remainingMsAfterDays % (1000 * 60 * 60);
  const minutes = Math.floor(remainingMsAfterHours / (1000 * 60));

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "<1m ago";
  }
}

function formatShortSince(timestamp?: string): string {
  if (!timestamp) return "N/A";
  const t = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const dayMs = 1000 * 60 * 60 * 24;
  const hourMs = 1000 * 60 * 60;
  const minMs = 1000 * 60;
  const days = Math.floor(diff / dayMs);
  if (days > 0) return `${days}d`;
  const hours = Math.floor((diff % dayMs) / hourMs);
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor((diff % hourMs) / minMs);
  return `${mins}m`;
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
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [bondingCurveVolumeData, setBondingCurveVolumeData] = useState<any[]>(
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setIsLoading(true);
        const [tokenData, volumeData] = await Promise.all([
          getAllTokens(),
          getBondingCurveVolumeData(),
        ]);
        setTokens(tokenData);
        setBondingCurveVolumeData(volumeData);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        setTokens([]);
        setBondingCurveVolumeData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const handleTokenClick = (token: TokenData) => {
    navigate(`/token/${token.chain}/${token.tokenAddress}`);
  };

  return (
    <div className="h-screen overflow-auto bg-black text-gray-100 text-xs font-mono">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1 h-full">
        {/* Left Column */}
        <div className="lg:col-span-3 space-y-1">
          {/* Volume Leaders */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">VOLUME LEADERS</div>
            {tokens.slice(0, 6).map((token) => (
              <div
                key={token.tokenAddress}
                className="flex justify-between text-xs py-0.5 border-b border-gray-800 last:border-0"
              >
                <span className="text-white">{token.symbol}</span>
                <span className="text-gray-400">
                  {token.volume24h
                    ? formatNumber(Number(token.volume24h))
                    : "N/A"}
                </span>
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
                  <th className="text-left p-1">Symbol</th>
                  <th className="text-left p-1 hidden md:table-cell">Name</th>
                  <th className="text-right p-1">PRICE</th>
                  <th className="text-right p-1">MCAP</th>
                  <th className="text-right p-1">24H</th>
                  <th className="text-right p-1">6H</th>
                  <th className="text-right p-1">1H</th>
                  <th className="text-right p-1">5M</th>
                  <th className="text-right p-1">VOL</th>
                  <th className="text-right p-1 hidden md:table-cell">AGE</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center p-4 text-gray-400">
                      Loading tokens...
                    </td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-4 text-gray-400">
                      No tokens found
                    </td>
                  </tr>
                ) : (
                  tokens.map((token) => (
                    <tr
                      key={token.tokenAddress}
                      className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => handleTokenClick(token)}
                    >
                      <td className="p-1">
                        <div className="flex items-center space-x-2">
                          {token.logoUrl ? (
                            <img
                              src={token.logoUrl}
                              alt={`${token.symbol} logo`}
                              className="w-4 h-4 rounded-full object-cover"
                              onError={(e) => {
                                // Fallback to circle if image fails to load
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <Circle
                            className={`w-4 h-4 text-blue-400 ${
                              token.logoUrl ? "hidden" : ""
                            }`}
                          />
                          <span className="text-white font-bold">
                            {token.symbol}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {token.chain}
                          </span>
                          {token.graduated && (
                            <span className="bg-green-600 text-white px-1 py-0.5 rounded text-xs">
                              GRAD
                            </span>
                          )}
                          {!token.graduated && (
                            <span className="bg-purple-600 text-white px-1 py-0.5 rounded text-xs">
                              BOND
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-1 text-gray-400 text-xs hidden md:table-cell">
                        {token.name}
                      </td>
                      <td className="p-1 text-right text-white font-mono">
                        {token.currentPrice
                          ? `$${Number(token.currentPrice).toFixed(6)}`
                          : "N/A"}
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {token.curveStatus?.marketCap
                          ? `$${formatNumber(
                              Number(token.curveStatus.marketCap)
                            )}`
                          : "N/A"}
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {token.graduated
                          ? "N/A"
                          : `${token.curveStatus?.progress?.toFixed(2) || 0}%`}
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {token.volume6h
                          ? formatNumber(Number(token.volume6h))
                          : "N/A"}
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {token.volume1h
                          ? formatNumber(Number(token.volume1h))
                          : "N/A"}
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {token.volume5m
                          ? formatNumber(Number(token.volume5m))
                          : "N/A"}
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {token.volume24h
                          ? formatNumber(Number(token.volume24h))
                          : "N/A"}
                      </td>
                      <td className="p-1 text-right text-gray-400 hidden md:table-cell">
                        {formatTokenAge(token.deploymentTimestamp || "")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Additional Data */}
        <div className="lg:col-span-3 space-y-1">
          {/* Graduated Tokens */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">GRADUATED TOKENS</div>
            <div className="overflow-y-auto max-h-48">
              <table className="w-full text-xs">
                <thead className="bg-gray-800 sticky top-0">
                  <tr className="text-gray-400">
                    <th className="text-left p-1">Symbol</th>
                    <th className="text-right p-1">MCAP</th>
                    <th className="text-right p-1">GRAD TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens
                    .filter((token) => token.graduated)
                    .sort((a, b) => {
                      if (!a.graduationTimestamp || !b.graduationTimestamp)
                        return 0;
                      return (
                        new Date(b.graduationTimestamp).getTime() -
                        new Date(a.graduationTimestamp).getTime()
                      );
                    })
                    .slice(0, 10)
                    .map((token) => (
                      <tr
                        key={token.tokenAddress}
                        className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => handleTokenClick(token)}
                      >
                        <td className="p-1">
                          <div className="flex items-center space-x-2">
                            {token.logoUrl ? (
                              <img
                                src={token.logoUrl}
                                alt={`${token.symbol} logo`}
                                className="w-4 h-4 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove(
                                    "hidden"
                                  );
                                }}
                              />
                            ) : null}
                            <Circle
                              className={`w-4 h-4 text-green-400 ${
                                token.logoUrl ? "hidden" : ""
                              }`}
                            />
                            <span className="text-white font-bold">
                              {token.symbol}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {token.chain}
                            </span>
                          </div>
                        </td>
                        <td className="p-1 text-right text-gray-400">TODO</td>
                        <td className="p-1 text-right text-gray-400">
                          {formatShortSince(token.graduationTimestamp)}
                        </td>
                      </tr>
                    ))}
                  {tokens.filter((token) => token.graduated).length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center p-4 text-gray-400">
                        No graduated tokens found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bonding Curve Progress */}
          <div className="bg-gray-900 border border-gray-700 p-1">
            <div className="text-orange-400 text-xs mb-1">
              BONDING CURVE PROGRESS
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              <div className="text-gray-400">TOKEN</div>
              <div className="text-gray-400">PROGRESS</div>
              <div className="text-gray-400">VOLUME</div>
              <div className="text-gray-400">MCAP</div>

              {/* Bonding Curve Tokens */}
              {tokens
                .filter((token) => !token.graduated)
                .sort((a, b) => {
                  if (!a.deploymentTimestamp || !b.deploymentTimestamp)
                    return 0;
                  return (
                    new Date(b.deploymentTimestamp).getTime() -
                    new Date(a.deploymentTimestamp).getTime()
                  );
                })
                .slice(0, 6)
                .map((token) => (
                  <div key={token.tokenAddress} className="contents">
                    <div className="text-white flex items-center space-x-1">
                      <Circle className="w-3 h-3 text-blue-400" />
                      <span>{token.symbol}</span>
                    </div>
                    <div className="text-green-400">TODO</div>
                    <div className="text-gray-400">TODO</div>
                    <div className="text-gray-400">TODO</div>
                  </div>
                ))}

              {/* Show message if no bonding curve tokens */}
              {tokens.filter((token) => !token.graduated).length === 0 && (
                <div className="col-span-4 text-center text-gray-400 py-2">
                  No bonding curve tokens found
                </div>
              )}
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
