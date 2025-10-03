import React, { useState, useEffect, Fragment } from "react";
import { Circle } from "lucide-react";
import { getAllTokens } from "@/api/token";
import { useNavigate } from "react-router-dom";
import { TokenMarketOverview } from "@/types";


function formatNumber(num: number): string {
  if (num >= 1e9) return parseFloat((num / 1e9).toFixed(2)) + "B";
  if (num >= 1e6) return parseFloat((num / 1e6).toFixed(2)) + "M";
  if (num >= 1e3) return parseFloat((num / 1e3).toFixed(2)) + "K";
  return parseFloat(num.toFixed(2))+"";
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

export function MarketsDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tokens, setTokens] = useState<TokenMarketOverview[]>([]);
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
        const tokenData = await getAllTokens();
        setTokens(tokenData);
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

  const handleTokenClick = (token: TokenMarketOverview) => {
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
                <span className="text-white">{token.tokenSymbol}</span>
                <span className="text-gray-400">
                  {formatNumber(Number(token.totalVolume))}
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
                              alt={`${token.tokenSymbol} logo`}
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
                            {token.tokenSymbol}
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
                      <td className="p-1 text-gray-400 text-xs">
                        {token.tokenName}
                      </td>
                      <td className="p-1 text-right text-white font-mono">
                        {`$${Number(token.currentPrice).toFixed(6)}`}
                      </td>
                      <td className="p-1 text-right text-gray-400 hidden md:table-cell">
                        {formatNumber(token.currentPrice * 1_000_000_000)}
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {/* {formatNumber(Number(token.buyVolume24h + token.sellVolume24h))} */}
                        {parseFloat(token.priceChange24h.toFixed(2))}%
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {/* {formatNumber(Number(token.buyVolume6h + token.sellVolume6h))} */}
                        {parseFloat(token.priceChange6h.toFixed(2))}%
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {/* {formatNumber(Number(token.buyVolume1h + token.sellVolume1h))} */}
                        {parseFloat(token.priceChange1h.toFixed(2))}%
                      </td>
                      <td className="p-1 text-right text-gray-400">
                        {/* {formatNumber(Number(token.buyVolume5m + token.sellVolume5m))} */}
                        {parseFloat(token.priceChange5m.toFixed(2))}%
                      </td>
                      <td className="p-1 text-right text-gray-400 hidden md:table-cell">
                        {formatNumber(token.totalVolume)}
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
                                alt={`${token.tokenSymbol} logo`}
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
                              {token.tokenSymbol}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {token.chain}
                            </span>
                          </div>
                        </td>
                        <td className="p-1 text-right text-gray-400">
                          {formatNumber(token.currentPrice * 1_000_000_000)}
                        </td>
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
                      <span>{token.tokenSymbol}</span>
                    </div>
                    <div className="text-green-400">TODO</div>
                    <div className="text-gray-400">
                      {formatNumber(token.totalVolume)}
                    </div>
                    <div className="text-gray-400">
                      {formatNumber(token.currentPrice * 1_000_000_000)}
                    </div>
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
