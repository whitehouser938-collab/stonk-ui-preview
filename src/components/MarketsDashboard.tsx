import React, { useState, useEffect, Fragment, useCallback } from "react";
import { Circle, Star, ChevronDown, ChevronUp, LayoutGrid, List } from "lucide-react";
import { getAllTokens } from "@/api/token";
import { useNavigate, useParams } from "react-router-dom";
import { Chain, TokenMarketOverview } from "@/types";
import { useMarketsUpdates } from "@/hooks/useMarketsUpdate";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAppKitAccount } from "@reown/appkit/react";

const DEFAULT_CHAIN: Chain = "SEP";

function formatNumber(num: number): string {
  if (num >= 1e9) {
    const val = num / 1e9;
    return val >= 10 ? Math.floor(val) + "B" : val.toFixed(1) + "B";
  }
  if (num >= 1e6) {
    const val = num / 1e6;
    return val >= 10 ? Math.floor(val) + "M" : val.toFixed(1) + "M";
  }
  if (num >= 1e3) {
    const val = num / 1e3;
    return val >= 10 ? Math.floor(val) + "K" : val.toFixed(1) + "K";
  }
  return Math.floor(num) + "";
}

function formatPrice(price: number): string {
  const priceStr = price.toString();

  // Check if price has leading zeros after decimal point
  if (price < 1 && price > 0) {
    const match = priceStr.match(/^0\.0+/);
    if (match && match[0].length > 3) {
      // Count the zeros after "0."
      const zeros = match[0].length - 2; // subtract "0."
      const remainingDigits = priceStr.substring(match[0].length, match[0].length + 4);

      // Convert zeros count to subscript
      const subscriptDigits = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
      const subscriptZeros = zeros.toString().split('').map(d => subscriptDigits[parseInt(d)]).join('');

      return `$0.0${subscriptZeros}${remainingDigits}`;
    }
  }

  return `$${price.toFixed(6)}`;
}

function formatTokenAge(timestamp: string, _currentTime?: Date): string {
  if (!timestamp) return "N/A";

  const deploymentTime = new Date(timestamp).getTime(); // Parse ISO date string
  const now = Date.now(); // Use current time for calculation
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

function formatShortSince(timestamp?: string, _currentTime?: Date): string {
  if (!timestamp) return "N/A";
  const t = new Date(timestamp).getTime();
  const now = Date.now(); // Use current time for calculation
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

// Helper function to format price change % with color
function formatPriceChange(priceChange: number): {
  text: string;
  color: string;
} {
  // If no price change (0 or very small), show dash
  if (Math.abs(priceChange) < 0.01) {
    return { text: "-", color: "text-gray-400" };
  }

  // Green for positive, red for negative
  const color = priceChange > 0 ? "text-green-400" : "text-red-400";
  const sign = priceChange > 0 ? "+" : "";

  return {
    text: `${sign}${priceChange.toFixed(2)}%`,
    color,
  };
}

// Mobile collapsible section component
const MobileCollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      {/* Mobile view with collapsible header */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center bg-gray-900 p-2 mb-1"
        >
          <div className="text-orange-400 text-xs">{title}</div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-orange-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-orange-400" />
          )}
        </button>
        {isOpen && <div>{children}</div>}
      </div>
      {/* Desktop view - always visible */}
      <div className="hidden lg:block">{children}</div>
    </>
  );
};

type FilterType = "age" | "last_comment" | "last_trade" | "new" | "graduated" | "market_cap" | "liquidity";

export function MarketsDashboard() {
  const { chainId } = useParams<{
    chainId: Chain;
  }>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tokens, setTokens] = useState<TokenMarketOverview[]>([]);
  const [bondingCurveVolumeData, setBondingCurveVolumeData] = useState<any[]>(
    []
  );
  const [volumePeriod, setVolumePeriod] = useState<"5m" | "1h" | "6h" | "24h">(
    "24h"
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>("new");
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [headerHeight, setHeaderHeight] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { isInWatchlist, toggleWatchlist } = useWatchlist(address);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  useEffect(() => {
    if (!chainId) {
      navigate(`/${DEFAULT_CHAIN}`, { replace: true });
    }
  }, [chainId, navigate]);

  // Update current time every 60 seconds to refresh age displays
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // 60 seconds
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

  const handleMarketsUpdate = useCallback(
    (updatedMarketsOverview: TokenMarketOverview[]) => {
      setTokens((prev) => {
        const updatedMarketsMap = new Map(
          updatedMarketsOverview.map((market) => [market.tokenAddress, market])
        );

        const existingTokensMap = new Map(
          prev.map((token) => [token.tokenAddress, token])
        );

        // Merge existing with updates
        updatedMarketsMap.forEach((updatedMarket, tokenAddress) => {
          const existing = existingTokensMap.get(tokenAddress);
          if (existing) {
            existingTokensMap.set(tokenAddress, {
              ...existing,
              ...updatedMarket,
            });
          } else {
            existingTokensMap.set(tokenAddress, updatedMarket);
          }
        });

        // Convert back to array and sort by totalVolume descending
        return Array.from(existingTokensMap.values()).sort(
          (a, b) => b.totalVolume - a.totalVolume
        );
      });
    },
    []
  );

  useMarketsUpdates(chainId, handleMarketsUpdate);

  const handleTokenClick = (token: TokenMarketOverview) => {
    navigate(`/token/${token.chain}/${token.tokenAddress}`);
  };

  const handleToggleWatchlist = async (
    e: React.MouseEvent,
    tokenAddress: string,
    chain: string
  ) => {
    e.stopPropagation(); // Prevent row click
    if (!isConnected) {
      alert("Please connect your wallet to use the watchlist feature");
      return;
    }
    await toggleWatchlist(tokenAddress, chain);
  };

  // Calculate total 24h volume
  const getTotalVolume24h = () => {
    return tokens.reduce((sum, token) => sum + token.totalVolume, 0);
  };

  // Calculate total 24h transactions (approximate based on volume)
  const getTotalTransactions24h = () => {
    // Placeholder - you can update this when you have actual transaction data
    return tokens.length > 0 ? Math.floor(Math.random() * 40000000) + 30000000 : 0;
  };

  // Get filtered tokens based on active filter
  const getFilteredTokens = () => {
    let filtered = [...tokens];

    switch (activeFilter) {
      case "age":
        // Sort by deployment timestamp (oldest first)
        filtered.sort((a, b) => {
          const timeA = new Date(a.deploymentTimestamp || 0).getTime();
          const timeB = new Date(b.deploymentTimestamp || 0).getTime();
          return timeA - timeB;
        });
        break;
      case "last_comment":
        // TODO: Sort by last comment time when this data is available
        // For now, sort by deployment time
        filtered.sort((a, b) => {
          const timeA = new Date(a.deploymentTimestamp || 0).getTime();
          const timeB = new Date(b.deploymentTimestamp || 0).getTime();
          return timeB - timeA;
        });
        break;
      case "last_trade":
        // TODO: Sort by last trade time when this data is available
        // For now, sort by volume as proxy for recent activity
        filtered.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case "new":
        // Sort by deployment timestamp (newest first)
        filtered.sort((a, b) => {
          const timeA = new Date(a.deploymentTimestamp || 0).getTime();
          const timeB = new Date(b.deploymentTimestamp || 0).getTime();
          return timeB - timeA;
        });
        break;
      case "graduated":
        // Show graduated tokens first, then sort by graduation time
        filtered = filtered.filter(token => token.graduated);
        filtered.sort((a, b) => {
          const timeA = new Date(a.graduationTimestamp || 0).getTime();
          const timeB = new Date(b.graduationTimestamp || 0).getTime();
          return timeB - timeA;
        });
        break;
      case "market_cap":
        // Sort by market cap (price * supply)
        filtered.sort((a, b) => {
          const mcapA = a.currentPrice * 1_000_000_000;
          const mcapB = b.currentPrice * 1_000_000_000;
          return mcapB - mcapA;
        });
        break;
      case "liquidity":
        // Sort by liquidity (approximated as 30% of volume)
        filtered.sort((a, b) => {
          const liqA = a.totalVolume * 0.3;
          const liqB = b.totalVolume * 0.3;
          return liqB - liqA;
        });
        break;
    }

    return filtered;
  };

  // Get volume leaders for selected time period (no backend request, use existing data)
  const getVolumeLeaders = () => {
    const getVolumeForPeriod = (token: TokenMarketOverview) => {
      switch (volumePeriod) {
        case "5m":
          return token.buyVolume5m + token.sellVolume5m;
        case "1h":
          return token.buyVolume1h + token.sellVolume1h;
        case "6h":
          return token.buyVolume6h + token.sellVolume6h;
        case "24h":
        default:
          return token.totalVolume;
      }
    };

    return tokens
      .map((token) => ({ token, volume: getVolumeForPeriod(token) }))
      .filter((item) => item.volume > 0) // Filter non-zero values only
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 6);
  };

  const filteredTokens = getFilteredTokens();

  // Get top trending tokens based on volume and recent activity
  const getTrendingTokens = () => {
    return tokens
      .slice()
      .sort((a, b) => {
        // Sort by combination of 24h volume and price change
        const scoreA = a.totalVolume * (1 + Math.abs(a.priceChange24h) / 100);
        const scoreB = b.totalVolume * (1 + Math.abs(b.priceChange24h) / 100);
        return scoreB - scoreA;
      })
      .slice(0, 10); // Top 10 trending
  };

  return (
    <div className="bg-black text-gray-100 text-xs font-mono">
      {/* MOBILE VIEW */}
      <div className="lg:hidden fixed inset-0 flex flex-col" style={{ top: headerHeight }}>
        {/* Scrollable Container - includes trending and tokens */}
        <div className="flex-1 overflow-y-auto pb-[72px]" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {/* Trending Section - Horizontal Scroll */}
          <div className="bg-black">
            <div className="flex items-center justify-between p-3">
              <h2 className="text-white font-bold text-sm">Now trending</h2>
            </div>
            <div className="overflow-x-auto pb-3 px-3" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`
                .trending-scroll::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="flex gap-3 trending-scroll">
                {getTrendingTokens().map((token) => (
                  <div
                    key={token.tokenAddress}
                    onClick={() => handleTokenClick(token)}
                    className="flex-shrink-0 w-[280px] bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-800 transition-colors"
                  >
                    {/* Token Image */}
                    <div className="relative h-[140px] bg-gray-800">
                      {token.logoUrl ? (
                        <img
                          src={token.logoUrl}
                          alt={token.tokenSymbol}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Circle className="w-16 h-16 text-blue-400" />
                        </div>
                      )}
                      {/* Market cap overlay */}
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px]">
                        <span className="text-gray-400">market cap: </span>
                        <span className="text-white font-bold">${formatNumber(token.currentPrice * 1_000_000_000)}</span>
                      </div>
                    </div>
                    {/* Token Info */}
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-white font-bold text-sm truncate">
                          {token.tokenName}
                        </span>
                        {token.graduated ? (
                          <span className="bg-green-600 text-white px-1 py-0.5 rounded text-[9px] flex-shrink-0">
                            GRAD
                          </span>
                        ) : (
                          <span className="bg-purple-600 text-white px-1 py-0.5 rounded text-[9px] flex-shrink-0">
                            BOND
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-[11px] mb-2">
                        <span className="text-orange-400">market cap: </span>
                        <span className="text-white font-bold">${formatNumber(token.currentPrice * 1_000_000_000)}</span>
                      </div>
                      <div className="text-gray-400 text-[10px]">
                        {token.tokenSymbol} • {formatTokenAge(token.deploymentTimestamp || "", currentTime)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="bg-black px-3 py-2 flex gap-2">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded transition-colors ${
                viewMode === "card"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Token List/Grid */}
          {isLoading ? (
            <div className="text-center p-8 text-gray-400">Loading tokens...</div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center p-8 text-gray-400">No tokens found</div>
          ) : viewMode === "card" ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 gap-3 p-3">
              {filteredTokens.map((token) => (
                <div
                  key={token.tokenAddress}
                  onClick={() => handleTokenClick(token)}
                  className="rounded-lg p-3 cursor-pointer transition-colors flex gap-3"
                >
                  {/* Token Image - Left Side */}
                  <div className="flex-shrink-0">
                    {token.logoUrl ? (
                      <img
                        src={token.logoUrl}
                        alt={token.tokenSymbol}
                        className="w-28 h-28 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-gray-800 flex items-center justify-center">
                        <Circle className="w-14 h-14 text-blue-400" />
                      </div>
                    )}
                  </div>

                  {/* Token Info - Right Side */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-white font-bold text-sm truncate">
                        {token.tokenName}
                      </span>
                      {token.graduated ? (
                        <span className="bg-green-600 text-white px-1 py-0.5 rounded text-[9px] flex-shrink-0">
                          GRAD
                        </span>
                      ) : (
                        <span className="bg-purple-600 text-white px-1 py-0.5 rounded text-[9px] flex-shrink-0">
                          BOND
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      {token.logoUrl ? (
                        <img
                          src={token.logoUrl}
                          alt={token.tokenSymbol}
                          className="w-3 h-3 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Circle className="w-3 h-3 text-blue-400" />
                      )}
                      <span className="text-gray-400 text-[10px] truncate">
                        {token.tokenSymbol}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs mb-1">
                      <span className="text-orange-400">MC: </span>
                      <span className="text-white font-semibold">${formatNumber(token.currentPrice * 1_000_000_000)}</span>
                    </div>
                    <div className="text-gray-400 text-[10px]">
                      {formatTokenAge(token.deploymentTimestamp || "", currentTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            filteredTokens.map((token) => {
              const priceChange1h = formatPriceChange(token.priceChange1h);
              const priceChange24h = formatPriceChange(token.priceChange24h);

              return (
                <div
                  key={token.tokenAddress}
                  className="bg-black rounded-lg p-2.5 cursor-pointer hover:bg-gray-900 transition-colors"
                  onClick={() => handleTokenClick(token)}
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Single row with logo and all content */}
                  <div className="flex items-center justify-between">
                    {/* Left Side */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Star - centered with logo */}
                      <button
                        onClick={(e) =>
                          handleToggleWatchlist(e, token.tokenAddress, token.chain)
                        }
                        className="flex-shrink-0"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isInWatchlist(token.tokenAddress, token.chain)
                              ? "fill-gray-500 text-gray-500"
                              : "text-gray-500"
                          }`}
                        />
                      </button>

                      {/* Logo */}
                      <div className="flex-shrink-0">
                        {token.logoUrl ? (
                          <img
                            src={token.logoUrl}
                            alt={token.tokenSymbol}
                            className="w-9 h-9 rounded object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Circle className="w-9 h-9 text-blue-400" />
                        )}
                      </div>

                      {/* Token Info - both rows in one block */}
                      <div className="flex flex-col flex-1">
                        {/* Row 1: Symbol and BOND/GRAD badge */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-white font-bold text-sm max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {token.tokenSymbol}
                          </span>
                          {token.graduated ? (
                            <span className="bg-green-600 text-white px-1 py-0.5 rounded text-[9px] flex-shrink-0">
                              GRAD
                            </span>
                          ) : (
                            <span className="bg-purple-600 text-white px-1 py-0.5 rounded text-[9px] flex-shrink-0">
                              BOND
                            </span>
                          )}
                        </div>
                        {/* Row 2: Token Name */}
                        <div className="text-gray-400 text-[11px] truncate">
                          {token.tokenName}
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Price, Stats stacked */}
                    <div className="flex flex-col items-end gap-0.5 ml-2 flex-shrink-0">
                      {/* Top: Price, 1H, 24H */}
                      <div className="flex items-center gap-2">
                        <div className="text-white font-mono text-xs">
                          {formatPrice(token.currentPrice)}
                        </div>
                        <span className={`${priceChange1h.color} text-[11px] font-semibold`}>
                          1H {priceChange1h.text}
                        </span>
                        <span className={`${priceChange24h.color} text-[11px] font-semibold`}>
                          24H {priceChange24h.text}
                        </span>
                      </div>
                      {/* Bottom: Stats in boxes */}
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded whitespace-nowrap inline-block w-[60px] text-center">
                          <span className="text-orange-400">LIQ </span>
                          <span className="text-white">${formatNumber(token.totalVolume * 0.3)}</span>
                        </span>
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded whitespace-nowrap inline-block w-[60px] text-center">
                          <span className="text-orange-400">VOL </span>
                          <span className="text-white">${formatNumber(token.totalVolume)}</span>
                        </span>
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded whitespace-nowrap inline-block w-[68px] text-center">
                          <span className="text-orange-400">MCAP </span>
                          <span className="text-white">${formatNumber(token.currentPrice * 1_000_000_000)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Filter Tabs - Fixed at Bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 p-4 z-30">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveFilter("age")}
              className={`flex-shrink-0 font-bold py-4 px-4 transition-all duration-200 rounded ${
                activeFilter === "age"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              AGE
            </button>
            <button
              onClick={() => setActiveFilter("last_comment")}
              className={`flex-shrink-0 font-bold py-4 px-4 transition-all duration-200 rounded ${
                activeFilter === "last_comment"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              LAST COMMENT
            </button>
            <button
              onClick={() => setActiveFilter("last_trade")}
              className={`flex-shrink-0 font-bold py-4 px-4 transition-all duration-200 rounded ${
                activeFilter === "last_trade"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              LAST TRADE
            </button>
            <button
              onClick={() => setActiveFilter("new")}
              className={`flex-shrink-0 font-bold py-4 px-4 transition-all duration-200 rounded ${
                activeFilter === "new"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              NEW
            </button>
            <button
              onClick={() => setActiveFilter("graduated")}
              className={`flex-shrink-0 font-bold py-4 px-4 transition-all duration-200 rounded ${
                activeFilter === "graduated"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              GRADUATED
            </button>
            <button
              onClick={() => setActiveFilter("market_cap")}
              className={`flex-shrink-0 font-bold py-4 px-4 transition-all duration-200 rounded ${
                activeFilter === "market_cap"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              MARKET CAP
            </button>
            <button
              onClick={() => setActiveFilter("liquidity")}
              className={`flex-shrink-0 font-bold py-4 px-4 transition-all duration-200 rounded ${
                activeFilter === "liquidity"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              LIQUIDITY
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden lg:block h-screen overflow-auto">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1 h-full">
        {/* Left Column - Terminal Placeholder - Desktop only, order-last on mobile */}
        <div className="lg:col-span-3 space-y-1 order-last lg:order-first">
          <MobileCollapsibleSection title="TERMINAL">
            <div className="bg-gray-900 p-4 h-full flex flex-col items-center justify-center">
              <div className="text-orange-400 text-lg font-bold mb-2 lg:block hidden">
                TERMINAL
              </div>
              <div className="text-gray-500 text-xs text-center">Coming Soon</div>
            </div>
          </MobileCollapsibleSection>
        </div>

        {/* Center Column - Main Trading Data */}
        <div className="lg:col-span-6 bg-gray-900 order-first lg:order-none">
          <div className="text-orange-400 text-xs p-1">
            ACTIVE TRADING PAIRS
          </div>
          <div className="overflow-x-auto h-full">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="bg-gray-800 sticky top-0">
                <tr className="text-gray-400">
                  <th className="text-center p-1 w-8"></th>
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
                    <td colSpan={11} className="text-center p-4 text-gray-400">
                      Loading tokens...
                    </td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center p-4 text-gray-400">
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
                      <td className="p-1 text-center">
                        <button
                          onClick={(e) =>
                            handleToggleWatchlist(
                              e,
                              token.tokenAddress,
                              token.chain
                            )
                          }
                          className="hover:scale-110 transition-transform"
                          title={
                            isInWatchlist(token.tokenAddress, token.chain)
                              ? "Remove from watchlist"
                              : "Add to watchlist"
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isInWatchlist(token.tokenAddress, token.chain)
                                ? "fill-gray-500 text-gray-500"
                                : "text-gray-500"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-1">
                        <div className="flex items-center space-x-2 whitespace-nowrap">
                          {token.logoUrl ? (
                            <img
                              src={token.logoUrl}
                              alt={`${token.tokenSymbol} logo`}
                              className="w-4 h-4 rounded object-cover flex-shrink-0"
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
                            className={`w-4 h-4 text-blue-400 flex-shrink-0 ${
                              token.logoUrl ? "hidden" : ""
                            }`}
                          />
                          <span className="text-white font-bold flex-shrink-0">
                            {token.tokenSymbol}
                          </span>
                          <span className="text-gray-400 text-xs flex-shrink-0">
                            {token.chain}
                          </span>
                          {token.graduated && (
                            <span className="bg-green-600 text-white px-1 py-0.5 rounded text-xs flex-shrink-0">
                              GRAD
                            </span>
                          )}
                          {!token.graduated && (
                            <span className="bg-purple-600 text-white px-1 py-0.5 rounded text-xs flex-shrink-0">
                              BOND
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-1 text-gray-400 text-xs max-w-[150px] truncate">
                        {token.tokenName}
                      </td>
                      <td className="p-1 text-right text-white font-mono">
                        {`$${Number(token.currentPrice).toFixed(6)}`}
                      </td>
                      <td className="p-1 text-right text-gray-400 hidden md:table-cell">
                        {formatNumber(token.currentPrice * 1_000_000_000)}
                      </td>
                      <td
                        className={`p-1 text-right ${
                          formatPriceChange(token.priceChange24h).color
                        }`}
                      >
                        {formatPriceChange(token.priceChange24h).text}
                      </td>
                      <td
                        className={`p-1 text-right ${
                          formatPriceChange(token.priceChange6h).color
                        }`}
                      >
                        {formatPriceChange(token.priceChange6h).text}
                      </td>
                      <td
                        className={`p-1 text-right ${
                          formatPriceChange(token.priceChange1h).color
                        }`}
                      >
                        {formatPriceChange(token.priceChange1h).text}
                      </td>
                      <td
                        className={`p-1 text-right ${
                          formatPriceChange(token.priceChange5m).color
                        }`}
                      >
                        {formatPriceChange(token.priceChange5m).text}
                      </td>
                      <td className="p-1 text-right text-gray-400 hidden md:table-cell">
                        {formatNumber(token.totalVolume)}
                      </td>
                      <td className="p-1 text-right text-gray-400 hidden md:table-cell">
                        {formatTokenAge(
                          token.deploymentTimestamp || "",
                          currentTime
                        )}
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
          {/* Volume Leaders */}
          <MobileCollapsibleSection title="VOLUME LEADERS">
            <div className="bg-gray-900 p-1">
              <div className="flex justify-between items-center mb-2">
                <div className="text-orange-400 text-xs hidden lg:block">VOLUME LEADERS</div>
                <div className="flex gap-1 w-full lg:w-auto">
                  {(["5m", "1h", "6h", "24h"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setVolumePeriod(period)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        volumePeriod === period
                          ? "bg-orange-400 text-black font-bold"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {period.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {getVolumeLeaders().map(({ token, volume }) => (
                <div
                  key={token.tokenAddress}
                  className="flex justify-between items-center text-xs py-1 border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() => handleTokenClick(token)}
                >
                  <div className="flex items-center space-x-2">
                    {token.logoUrl ? (
                      <img
                        src={token.logoUrl}
                        alt={`${token.tokenSymbol} logo`}
                        className="w-4 h-4 rounded object-cover"
                        onError={(e) => {
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
                      {token.tokenName.length > 15
                        ? `${token.tokenName.substring(0, 15)}...`
                        : token.tokenName}
                    </span>
                  </div>
                  <span className="text-gray-400">{formatNumber(volume)}</span>
                </div>
              ))}
              {getVolumeLeaders().length === 0 && (
                <div className="text-center text-gray-400 py-2 text-xs">
                  No volume data for {volumePeriod}
                </div>
              )}
            </div>
          </MobileCollapsibleSection>

          {/* Graduated Tokens */}
          <MobileCollapsibleSection title="GRADUATED TOKENS">
            <div className="bg-gray-900 p-1">
              <div className="text-orange-400 text-xs mb-1 hidden lg:block">GRADUATED TOKENS</div>
              <div className="overflow-y-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr className="text-gray-400">
                      <th className="text-left p-1">Token</th>
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
                                  className="w-4 h-4 rounded object-cover"
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
                                {token.tokenName.length > 15
                                  ? `${token.tokenName.substring(0, 15)}...`
                                  : token.tokenName}
                              </span>
                            </div>
                          </td>
                          <td className="p-1 text-right text-gray-400">
                            {formatNumber(token.currentPrice * 1_000_000_000)}
                          </td>
                          <td className="p-1 text-right text-gray-400">
                            {formatShortSince(
                              token.graduationTimestamp,
                              currentTime
                            )}
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
          </MobileCollapsibleSection>

          {/* Bonding Curve Progress */}
          <MobileCollapsibleSection title="BONDING CURVE PROGRESS">
            <div className="bg-gray-900 p-1">
              <div className="text-orange-400 text-xs mb-1 hidden lg:block">
                BONDING CURVE PROGRESS
              </div>
              <div className="overflow-y-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr className="text-gray-400">
                      <th className="text-left p-1">Token</th>
                      <th className="text-right p-1">PROGRESS</th>
                      <th className="text-right p-1">VOL</th>
                      <th className="text-right p-1">MCAP</th>
                    </tr>
                  </thead>
                  <tbody>
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
                                  className="w-4 h-4 rounded object-cover"
                                  onError={(e) => {
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
                                {token.tokenName.length > 15
                                  ? `${token.tokenName.substring(0, 15)}...`
                                  : token.tokenName}
                              </span>
                            </div>
                          </td>
                          <td className="p-1 text-right text-green-400">
                            {token.progress?.toFixed(1) ?? "0.0"}%
                          </td>
                          <td className="p-1 text-right text-gray-400">
                            {formatNumber(token.totalVolume)}
                          </td>
                          <td className="p-1 text-right text-gray-400">
                            {formatNumber(token.currentPrice * 1_000_000_000)}
                          </td>
                        </tr>
                      ))}
                    {tokens.filter((token) => !token.graduated).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center p-4 text-gray-400">
                          No bonding curve tokens found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </MobileCollapsibleSection>
        </div>
      </div>
      </div>
    </div>
  );
}
