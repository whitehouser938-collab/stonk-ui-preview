import React, { useState, useEffect, Fragment, useCallback, useRef } from "react";
import {
  Circle,
  Star,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Filter,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { getAllTokens, getTrendingTokens } from "@/api/token";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
      const remainingDigits = priceStr.substring(
        match[0].length,
        match[0].length + 4
      );

      // Convert zeros count to subscript
      const subscriptDigits = [
        "₀",
        "₁",
        "₂",
        "₃",
        "₄",
        "₅",
        "₆",
        "₇",
        "₈",
        "₉",
      ];
      const subscriptZeros = zeros
        .toString()
        .split("")
        .map((d) => subscriptDigits[parseInt(d)])
        .join("");

      return `$0.0${subscriptZeros}${remainingDigits}`;
    }
  }

  return `$${price.toFixed(6)}`;
}

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 5)}...${address.slice(-3)}`;
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
          className="w-full flex justify-between items-center bg-bg-card p-2 mb-1"
        >
          <div className="text-orange-500 text-xs">{title}</div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-orange-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-orange-500" />
          )}
        </button>
        {isOpen && <div>{children}</div>}
      </div>
      {/* Desktop view - always visible */}
      <div className="hidden lg:block">{children}</div>
    </>
  );
};

type FilterType =
  | "age"
  | "last_comment"
  | "last_trade"
  | "new"
  | "graduated"
  | "market_cap";

export function MarketsDashboard() {
  const { chainId } = useParams<{
    chainId: Chain;
  }>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tokens, setTokens] = useState<TokenMarketOverview[]>([]);
  const [trendingTokens, setTrendingTokens] = useState<TokenMarketOverview[]>([]);
  const [bondingCurveVolumeData, setBondingCurveVolumeData] = useState<any[]>(
    []
  );
  const [volumePeriod, setVolumePeriod] = useState<"5m" | "1h" | "6h" | "24h">(
    "24h"
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get("view") === "table" ? "list" : "card") as
    | "card"
    | "list";
  
  // Initialize filter from URL or default to "market_cap"
  const getFilterFromUrl = (): FilterType => {
    const filterParam = searchParams.get("filter");
    const validFilters: FilterType[] = [
      "age",
      "last_comment",
      "last_trade",
      "new",
      "graduated",
      "market_cap",
    ];
    if (filterParam && validFilters.includes(filterParam as FilterType)) {
      return filterParam as FilterType;
    }
    return "market_cap";
  };
  
  // Derive activeFilter from URL params
  const activeFilter = getFilterFromUrl();
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isStickyRowActive, setIsStickyRowActive] = useState(false);
  const stickyRowRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { isInWatchlist, toggleWatchlist } = useWatchlist(address);

  const handleFilterChange = (filter: FilterType) => {
    // Preserve existing search params (like view) and update filter
    const newParams = new URLSearchParams(searchParams);
    newParams.set("filter", filter);
    setSearchParams(newParams, { replace: true });
  };

  const handleViewModeChange = (mode: "card" | "list") => {
    const newParams = new URLSearchParams(searchParams);
    if (mode === "list") {
      newParams.set("view", "table");
    } else {
      newParams.delete("view");
    }
    setSearchParams(newParams, { replace: true });
  };


  // Detect when sticky row becomes active (scrolled past initial position)
  useEffect(() => {
    if (!stickyRowRef.current) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      // Check if scrolled past the initial position (approximately when trending section is out of view)
      const isSticky = scrollTop > 200;
      setIsStickyRowActive(isSticky);
      // Auto-collapse filters when scrolling back to top
      if (!isSticky && isFiltersExpanded) {
        setIsFiltersExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFiltersExpanded]);

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

        // Map activeFilter to API sortBy parameter
        let sortBy: 'new' | 'age' | 'marketcap' | 'last_trade' | 'last_comment' = 'new';
        let graduated: 'true' | 'false' | 'all' = 'all';

        switch (activeFilter) {
          case 'age':
            sortBy = 'age';
            break;
          case 'last_comment':
            sortBy = 'last_comment';
            break;
          case 'last_trade':
            sortBy = 'last_trade';
            break;
          case 'new':
            sortBy = 'new';
            break;
          case 'graduated':
            graduated = 'true';
            sortBy = 'new'; // Sort graduated tokens by newest first
            break;
          case 'market_cap':
            sortBy = 'marketcap';
            break;
          default:
            sortBy = 'new';
        }

        const { tokens: tokenData, pagination: paginationData } =
          await getAllTokens({
            chain: chainId,
            page: currentPage,
            limit: 20,
            sortBy,
            sortOrder: 'desc',
            graduated,
          });

        setTokens(tokenData);
        setPagination(paginationData);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        setTokens([]);
        setBondingCurveVolumeData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, [chainId, currentPage, activeFilter]);

  // Fetch trending tokens separately (cached on backend, consistent across pages)
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const trending = await getTrendingTokens(chainId, 10);
        setTrendingTokens(trending);
      } catch (error) {
        console.error("Error fetching trending tokens:", error);
      }
    };

    fetchTrending();

    // Refresh trending every 5 minutes (matches backend cache TTL)
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [chainId]);

  const handleMarketsUpdate = useCallback(
    (updatedMarketsOverview: TokenMarketOverview[]) => {
      setTokens((prev) => {
        const updatedMarketsMap = new Map(
          updatedMarketsOverview.map((market) => [market.tokenAddress, market])
        );

        // Only update existing tokens - do not add new tokens from websocket updates
        // New tokens should only appear when fetching the appropriate page
        return prev.map((token) => {
          const updatedMarket = updatedMarketsMap.get(token.tokenAddress);
          if (updatedMarket) {
            // Update existing token with fresh data from websocket
            return {
              ...token,
              ...updatedMarket,
            };
          }
          // Return token unchanged if no update available
          return token;
        });
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
    return tokens.length > 0
      ? Math.floor(Math.random() * 40000000) + 30000000
      : 0;
  };

  // NOTE: Filtering now handled by backend API
  // Tokens are already sorted and filtered based on activeFilter
  // No need for client-side filtering anymore

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

  // Tokens are already filtered and sorted by the API based on activeFilter
  const filteredTokens = tokens;

  // Get trending tokens (fetched separately, consistent across pages)
  const getTrendingTokensDisplay = () => {
    return trendingTokens;
  };

  return (
    <div className="text-gray-100 text-xs">
      {/* MOBILE VIEW */}
      <div className="lg:hidden">
        {/* Trending Section - Horizontal Scroll */}
        <div>
          <div className="flex items-center justify-between p-3">
            <h2 className="text-white font-bold text-base font-sans">
              Now trending <span className="rocket-blink">🚀</span>
            </h2>
          </div>
          <div
            className="overflow-x-auto pb-3 px-3"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>{`
              .trending-scroll::-webkit-scrollbar {
                display: none;
              }
              @keyframes blink {
                0%, 49% { opacity: 1; }
                50%, 100% { opacity: 0; }
              }
              .rocket-blink {
                animation: blink 1s infinite;
              }
            `}</style>
            <div className="flex gap-3 trending-scroll">
              {getTrendingTokensDisplay().map((token) => (
                <div
                  key={token.tokenAddress}
                  onClick={() => handleTokenClick(token)}
                  className="flex-shrink-0 w-[280px] bg-bg-card rounded-lg overflow-hidden cursor-pointer hover:bg-bg-card-hover transition-colors"
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
                    {/* Volume and Price Change overlay */}
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-sans flex items-center gap-2">
                      <div>
                        <span className="text-gray-400">vol: </span>
                        <span className="text-white font-bold">
                          ${formatNumber((token.buyVolume1h || 0) + (token.sellVolume1h || 0))}
                        </span>
                      </div>
                      {token.priceChange1h !== undefined && token.priceChange1h !== null && (
                        <div className={`flex items-center gap-0.5 ${
                          token.priceChange1h >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {token.priceChange1h >= 0 ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          <span className="font-bold">
                            {token.priceChange1h >= 0 ? "+" : ""}{token.priceChange1h.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Token Info */}
                  <div className="p-3">
                    <div className="mb-1">
                      <span className="text-white-soft font-bold text-sm font-sans truncate">
                        {token.tokenName && token.tokenName.length > 12
                          ? `${token.tokenName.slice(0, 12)}...`
                          : token.tokenName}
                      </span>
                    </div>
                    {/* Deployer Info + Age */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <img
                        src={token.pfp || "/default-pfp-clear.png"}
                        alt="Deployer"
                        className="w-4 h-4 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/default-pfp-clear.png";
                        }}
                      />
                      <a
                        href={`/profile/${token.deployerAddress || ""}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 text-xs font-sans truncate underline hover:text-white"
                      >
                        {token.username ||
                          (token.deployerAddress
                            ? formatAddress(token.deployerAddress)
                            : "Unknown")}
                      </a>
                      <span className="text-gray-400 text-xs">•</span>
                      <span className="text-white-soft text-xs font-sans">
                        {formatTokenAge(
                          token.deploymentTimestamp || "",
                          currentTime
                        )}
                      </span>
                    </div>
                    {/* Description */}
                    {token.description && (
                      <div className="text-gray-400 text-xs font-sans mb-2 line-clamp-2">
                        {token.description}
                      </div>
                    )}
                    <div className="text-gray-400 text-xs font-sans mb-2">
                      <span className="text-orange-500">market cap: </span>
                      <span className="text-white-soft font-bold">
                        ${formatNumber(token.currentPrice * 1_000_000_000)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* View Toggle and Filter Buttons - Sticky at Top */}
        <div 
          ref={stickyRowRef}
          className="sticky top-0 z-20 bg-bg-card px-3 py-2 flex gap-2 items-center overflow-x-auto scrollbar-hide"
        >
            {/* View Toggle Buttons */}
            <button
              onClick={() => handleViewModeChange("card")}
              className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                viewMode === "card"
                  ? "bg-orange-500 text-black"
                  : "text-gray-400"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleViewModeChange("list")}
              className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                viewMode === "list"
                  ? "bg-orange-500 text-black"
                  : "text-gray-400"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            
            {/* Filter Icon (always visible when sticky, next to card/list toggles) */}
            {isStickyRowActive && (
              <button
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className={`flex-shrink-0 p-2 rounded transition-all duration-300 font-mono ${
                  isFiltersExpanded
                    ? "bg-orange-500 text-black"
                    : "text-gray-400"
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            )}

            {/* Filter Buttons (shown when not sticky OR when sticky and expanded) */}
            <div
              className={`flex gap-2 items-center transition-all duration-300 ease-in-out overflow-x-auto scrollbar-hide flex-1 ${
                isStickyRowActive && !isFiltersExpanded
                  ? "max-w-0 opacity-0 overflow-hidden"
                  : "opacity-100"
              }`}
              style={{
                minWidth: isStickyRowActive && !isFiltersExpanded ? 0 : 'auto',
              }}
            >
                <button
                  onClick={() => handleFilterChange("new")}
                  className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                    activeFilter === "new"
                      ? "bg-orange-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  NEW
                </button>
                <button
                  onClick={() => handleFilterChange("last_comment")}
                  className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                    activeFilter === "last_comment"
                      ? "bg-orange-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  LAST COMMENT
                </button>
                <button
                  onClick={() => handleFilterChange("last_trade")}
                  className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                    activeFilter === "last_trade"
                      ? "bg-orange-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  LAST TRADE
                </button>
                <button
                  onClick={() => handleFilterChange("age")}
                  className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                    activeFilter === "age"
                      ? "bg-orange-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  AGE
                </button>
                <button
                  onClick={() => handleFilterChange("graduated")}
                  className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                    activeFilter === "graduated"
                      ? "bg-orange-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  GRADUATED
                </button>
                <button
                  onClick={() => handleFilterChange("market_cap")}
                  className={`flex-shrink-0 p-2 rounded transition-colors font-mono ${
                    activeFilter === "market_cap"
                      ? "bg-orange-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  MARKET CAP
                </button>
            </div>
        </div>

        {/* Token List/Grid */}
          {isLoading ? (
            <div className="text-center p-8 text-gray-400">
              Loading tokens...
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center p-8 text-gray-400">No tokens found</div>
          ) : viewMode === "card" ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 gap-3 p-3 pb-0">
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
                    {/* Full Name */}
                    <div className="mb-1">
                      <span className="text-white-soft font-bold text-sm font-sans truncate">
                        {token.tokenName}
                      </span>
                    </div>

                    {/* Symbol */}
                    <div className="text-gray-400 text-sm font-sans mb-2">
                      {token.tokenSymbol}
                    </div>

                    {/* Deployer Info + Age */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <img
                        src={token.pfp || "/default-pfp-clear.png"}
                        alt="Deployer"
                        className="w-4 h-4 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/default-pfp-clear.png";
                        }}
                      />
                      <a
                        href={`/profile/${token.deployerAddress || ""}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 text-xs font-sans truncate underline hover:text-white"
                      >
                        {token.username ||
                          (token.deployerAddress
                            ? formatAddress(token.deployerAddress)
                            : "Unknown")}
                      </a>
                      <span className="text-gray-400 text-xs">•</span>
                      <span className="text-white-soft text-xs font-sans">
                        {formatTokenAge(
                          token.deploymentTimestamp || "",
                          currentTime
                        )}
                      </span>
                    </div>

                    {/* Progress Bar for Bonding Curve Tokens */}
                    {!token.graduated && (
                      <div className="w-full mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-xs font-sans">
                            Progress
                          </span>
                          <span className="text-white text-xs font-semibold font-sans">
                            TODO%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="progress-bar-glow h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.floor(Math.random() * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {token.description && (
                      <div className="text-gray-400 text-xs font-sans mb-2 line-clamp-2">
                        {token.description}
                      </div>
                    )}

                    {/* Market Cap - Only for Graduated Tokens */}
                    {token.graduated && (
                      <div className="text-gray-400 text-xs font-sans">
                        <span className="text-gray-400">MC: </span>
                        <span className="text-white-soft font-semibold">
                          ${formatNumber(token.currentPrice * 1_000_000_000)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View - Table */
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[640px]">
                <thead className="bg-gray-800 sticky top-0">
                  <tr className="text-gray-400 text-xs font-sans">
                    <th className="text-left p-2">STONK</th>
                    <th className="text-center p-2">STATUS</th>
                    <th className="text-right p-2">MCAP</th>
                    <th className="text-right p-2">VOLUME</th>
                    <th className="text-right p-2">TXNS</th>
                    <th className="text-right p-2">AGE</th>
                    <th className="text-right p-2">5M</th>
                    <th className="text-right p-2">1H</th>
                    <th className="text-right p-2">24H</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token) => {
                    const priceChange5m = formatPriceChange(token.priceChange5m);
                    const priceChange1h = formatPriceChange(token.priceChange1h);
                    const priceChange24h = formatPriceChange(token.priceChange24h);

                    return (
                      <tr
                        key={token.tokenAddress}
                        className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => handleTokenClick(token)}
                        style={{ touchAction: "manipulation" }}
                      >
                        {/* Stonk Column - with logo, name/symbol stacked */}
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {/* Star */}
                            <button
                              onClick={(e) =>
                                handleToggleWatchlist(
                                  e,
                                  token.tokenAddress,
                                  token.chain
                                )
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

                            {/* Logo/PFP */}
                            <div className="flex-shrink-0">
                              {token.logoUrl ? (
                                <img
                                  src={token.logoUrl}
                                  alt={token.tokenSymbol}
                                  className="w-8 h-8 rounded object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <Circle className="w-8 h-8 text-blue-400" />
                              )}
                            </div>

                            {/* Name and Symbol stacked */}
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="mb-0.5">
                                <span className="text-white font-bold text-sm font-sans max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap block">
                                  {token.tokenSymbol}
                                </span>
                              </div>
                              <div className="text-gray-400 text-xs font-sans truncate">
                                {token.tokenName && token.tokenName.length > 15
                                  ? `${token.tokenName.slice(0, 15)}...`
                                  : token.tokenName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="p-2 text-center">
                          {token.graduated ? (
                            <span className="text-green-400 text-xs font-sans font-bold">
                              bond
                            </span>
                          ) : (
                            <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden mx-auto">
                              <div
                                className="progress-bar-glow h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${token.progress?.toFixed(1) ?? 0}%`,
                                }}
                              />
                            </div>
                          )}
                        </td>

                        {/* MCAP */}
                        <td className="p-2 text-right text-white-soft text-xs font-sans">
                          ${formatNumber(token.currentPrice * 1_000_000_000)}
                        </td>

                        {/* VOLUME */}
                        <td className="p-2 text-right text-white-soft text-xs font-sans">
                          ${formatNumber(token.totalVolume)}
                        </td>

                        {/* TRANSACTIONS */}
                        <td className="p-2 text-right text-white-soft text-xs font-sans">
                          TODO
                        </td>

                        {/* AGE */}
                        <td className="p-2 text-right text-white-soft text-xs font-sans">
                          {formatTokenAge(
                            token.deploymentTimestamp || "",
                            currentTime
                          )}
                        </td>

                        {/* 5M */}
                        <td
                          className={`p-2 text-right text-xs font-sans ${priceChange5m.color}`}
                        >
                          {priceChange5m.text}
                        </td>

                        {/* 1H */}
                        <td
                          className={`p-2 text-right text-xs font-sans ${priceChange1h.color}`}
                        >
                          {priceChange1h.text}
                        </td>

                        {/* 24H */}
                        <td
                          className={`p-2 text-right text-xs font-sans ${priceChange24h.color}`}
                        >
                          {priceChange24h.text}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        {/* Pagination Controls - Mobile */}
        {pagination && (
          <div className="p-3 lg:pb-3">
            <div className="flex items-center justify-center gap-4 font-mono text-sm text-gray-400">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={!pagination.hasPreviousPage}
                className={`transition-all ${
                  pagination.hasPreviousPage
                    ? "text-gray-400 hover:text-white cursor-pointer"
                    : "text-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                [ &lt;&lt; ]
              </button>
              <div className="text-gray-400">
                {pagination.currentPage}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(pagination.totalPages, prev + 1)
                  )
                }
                disabled={!pagination.hasNextPage}
                className={`transition-all ${
                  pagination.hasNextPage
                    ? "text-gray-400 hover:text-white cursor-pointer"
                    : "text-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                [ &gt;&gt; ]
              </button>
            </div>
          </div>
        )}

      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden lg:block h-screen overflow-auto">
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1 h-full">
          {/* Left Column - Terminal Placeholder - Desktop only, order-last on mobile */}
          <div className="lg:col-span-3 space-y-1 order-last lg:order-first">
            <MobileCollapsibleSection title="TERMINAL">
              <div className="bg-bg-card p-4 h-full flex flex-col items-center justify-center">
                <div className="text-orange-500 text-lg font-bold mb-2 lg:block hidden">
                  TERMINAL
                </div>
                <div className="text-gray-500 text-xs text-center">
                  Coming Soon
                </div>
              </div>
            </MobileCollapsibleSection>
          </div>

          {/* Center Column - Main Trading Data */}
          <div className="lg:col-span-6 bg-bg-card order-first lg:order-none">
            <div className="text-orange-500 text-xs p-1">
              ACTIVE TRADING PAIRS
            </div>
            <div className="overflow-x-auto h-full">
              <table className="w-full text-xs min-w-[640px]">
                <thead className="bg-gray-800 sticky top-0">
                  <tr className="text-gray-400 text-xs font-sans">
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
                      <td
                        colSpan={11}
                        className="text-center p-4 text-gray-400"
                      >
                        Loading tokens...
                      </td>
                    </tr>
                  ) : tokens.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center p-4 text-gray-400"
                      >
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
                            <span className="text-white font-bold text-sm font-sans flex-shrink-0">
                              {token.tokenSymbol}
                            </span>
                            <span className="text-gray-400 text-xs font-sans flex-shrink-0">
                              {token.chain}
                            </span>
                            {token.graduated && (
                              <span className="bg-green-600 text-black px-1 py-0.5 rounded text-xs flex-shrink-0 font-mono">
                                GRAD
                              </span>
                            )}
                            {!token.graduated && (
                              <span className="bg-purple-600 text-black px-1 py-0.5 rounded text-xs flex-shrink-0 font-mono">
                                BOND
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-1 text-white-soft text-sm font-sans max-w-[150px] truncate">
                          {token.tokenName}
                        </td>
                        <td className="p-1 text-right text-white-soft text-xs font-sans">
                          {`$${Number(token.currentPrice).toFixed(6)}`}
                        </td>
                        <td className="p-1 text-right text-white-soft text-xs font-sans hidden md:table-cell">
                          {formatNumber(token.currentPrice * 1_000_000_000)}
                        </td>
                        <td
                          className={`p-1 text-right text-xs font-sans ${
                            formatPriceChange(token.priceChange24h).color
                          }`}
                        >
                          {formatPriceChange(token.priceChange24h).text}
                        </td>
                        <td
                          className={`p-1 text-right text-xs font-sans ${
                            formatPriceChange(token.priceChange6h).color
                          }`}
                        >
                          {formatPriceChange(token.priceChange6h).text}
                        </td>
                        <td
                          className={`p-1 text-right text-xs font-sans ${
                            formatPriceChange(token.priceChange1h).color
                          }`}
                        >
                          {formatPriceChange(token.priceChange1h).text}
                        </td>
                        <td
                          className={`p-1 text-right text-xs font-sans ${
                            formatPriceChange(token.priceChange5m).color
                          }`}
                        >
                          {formatPriceChange(token.priceChange5m).text}
                        </td>
                        <td className="p-1 text-right text-white-soft text-xs font-sans hidden md:table-cell">
                          {formatNumber(token.totalVolume)}
                        </td>
                        <td className="p-1 text-right text-white-soft text-xs font-sans hidden md:table-cell">
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
              <div className="bg-bg-card p-1">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-orange-500 text-xs hidden lg:block">
                    VOLUME LEADERS
                  </div>
                  <div className="flex gap-1 w-full lg:w-auto">
                    {(["5m", "1h", "6h", "24h"] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setVolumePeriod(period)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                          volumePeriod === period
                            ? "bg-orange-500 text-black font-bold"
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
                      <span className="text-white font-bold text-sm font-sans">
                        {token.tokenSymbol}
                      </span>
                      <span className="text-gray-400 text-xs font-sans">
                        {token.tokenName.length > 15
                          ? `${token.tokenName.substring(0, 15)}...`
                          : token.tokenName}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs font-sans">
                      {formatNumber(volume)}
                    </span>
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
              <div className="bg-bg-card p-1">
                <div className="text-orange-500 text-xs mb-1 hidden lg:block">
                  GRADUATED TOKENS
                </div>
                <div className="overflow-y-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr className="text-gray-400 text-xs font-sans">
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
                                <span className="text-white font-bold text-sm font-sans">
                                  {token.tokenSymbol}
                                </span>
                                <span className="text-gray-400 text-xs font-sans">
                                  {token.tokenName.length > 15
                                    ? `${token.tokenName.substring(0, 15)}...`
                                    : token.tokenName}
                                </span>
                              </div>
                            </td>
                            <td className="p-1 text-right text-white-soft text-xs font-sans">
                              {formatNumber(token.currentPrice * 1_000_000_000)}
                            </td>
                            <td className="p-1 text-right text-white-soft text-xs font-sans">
                              {formatShortSince(
                                token.graduationTimestamp,
                                currentTime
                              )}
                            </td>
                          </tr>
                        ))}
                      {tokens.filter((token) => token.graduated).length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="text-center p-4 text-gray-400"
                          >
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
              <div className="bg-bg-card p-1">
                <div className="text-orange-500 text-xs mb-1 hidden lg:block">
                  BONDING CURVE PROGRESS
                </div>
                <div className="overflow-y-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr className="text-gray-400 text-xs font-sans">
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
                                <span className="text-white font-bold text-sm font-sans">
                                  {token.tokenSymbol}
                                </span>
                                <span className="text-gray-400 text-xs font-sans">
                                  {token.tokenName.length > 15
                                    ? `${token.tokenName.substring(0, 15)}...`
                                    : token.tokenName}
                                </span>
                              </div>
                            </td>
                            <td className="p-1 text-right text-green-400 text-xs font-sans">
                              {token.progress?.toFixed(1) ?? "0.0"}%
                            </td>
                            <td className="p-1 text-right text-white-soft text-xs font-sans">
                              {formatNumber(token.totalVolume)}
                            </td>
                            <td className="p-1 text-right text-white-soft text-xs font-sans">
                              {formatNumber(token.currentPrice * 1_000_000_000)}
                            </td>
                          </tr>
                        ))}
                      {tokens.filter((token) => !token.graduated).length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center p-4 text-gray-400"
                          >
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
