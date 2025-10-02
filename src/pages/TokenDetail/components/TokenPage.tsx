import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getExplorer,
  getToken,
  getTokenTrades,
  getTokenHolders,
  TokenHolder,
} from "@/api/token";
import LoadingScreen from "@/components/ui/loading";
import { useLoading } from "@/hooks/use-loading";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  formatBalance,
  calculatePercentage,
  abbreviateAddress,
} from "@/lib/utils";

import {
  Globe,
  Activity,
  AlertTriangle,
  Home,
  ArrowUpRight,
  ExternalLink,
  Clock,
  Filter,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TradingForm from "./TradingForm";
import BondingCurveProgress from "./BondingCurveProgress";
import TradingViewChart from "@/components/TradingViewChart";
import OrderBook from "./OrderBook";
import { useTradeUpdates } from "@/hooks/useTradeUpdates";
import { useToast } from "@/hooks/use-toast";
import { Chain, TokenDetails, TradeData } from "@/types";
import { CommentsSection } from "@/components/Comments";

const TokenPage = () => {
  const { chainId, tokenAddress } = useParams<{
    chainId: Chain;
    tokenAddress: string;
  }>();
  const navigate = useNavigate();
  const [tokenData, setTokenData] = useState<TokenDetails>(null);
  const [view, setView] = useState("details");
  const [error, setError] = useState<string | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const { isLoading, startLoading, stopLoading } = useLoading();
  const { toast } = useToast();

  const TRADE_PAGE_SIZE = 20;
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [lastTrade, setLastTrade] = useState<TradeData>(null);
  const [hasMoreTrades, setHasMoreTrades] = useState(true);
  const [isFetchingMoreTrades, setIsFetchingMoreTrades] = useState(false);
  const [filteredTrader, setFilteredTrader] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trades" | "holders">("trades");
  const [holdersData, setHoldersData] = useState<TokenHolder[]>([]);
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleTradeUpdate = useCallback((newTrades: TradeData[]) => {
    console.log(`[TokenPage] Received trade update:`, newTrades);

    setTrades((prevTrades) => {
      // There are no trades before a trade message from websocket
      if (prevTrades.length <= 0 && newTrades.length > 0)
        setLastTrade(newTrades[newTrades.length - 1]);

      // Add new trades to the beginning and remove duplicates (Probably no need to remove duplicates because theres a high chance there won't be any)
      const combinedTrades = [...newTrades, ...prevTrades];
      const uniqueTrades = combinedTrades.filter(
        (trade, index, arr) =>
          arr.findIndex(
            (t) =>
              t.transactionHash === trade.transactionHash &&
              t.logIndex === trade.logIndex
          ) === index
      );

      // Keep only the most recent 1000 trades for performance
      return uniqueTrades.slice(0, 1000);
    });
  }, []);

  // Subscribe to real-time trade updates
  useTradeUpdates(chainId, tokenAddress, handleTradeUpdate);

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

  useEffect(() => {
    const fetchTrades = async () => {
      if (!chainId || !tokenAddress) return;
      try {
        const initialTrades = await getTokenTrades(
          chainId,
          tokenAddress,
          TRADE_PAGE_SIZE
        );

        if (initialTrades.length < TRADE_PAGE_SIZE) setHasMoreTrades(false);
        if (initialTrades.length > 0)
          setLastTrade(initialTrades[initialTrades.length - 1]);
        setTrades(initialTrades);
      } catch (error) {
        console.error("Error fetching trades:", error);
        setTrades([]);
      }
    };
    fetchTrades();
  }, [chainId, tokenAddress]);

  // Fetch holders data
  const fetchHolders = useCallback(async () => {
    if (!tokenAddress) return;

    setIsLoadingHolders(true);
    try {
      const response = await getTokenHolders(tokenAddress);
      setHoldersData(response.data.holders);
    } catch (error) {
      console.error("Error fetching holders:", error);
      setHoldersData([]);
    } finally {
      setIsLoadingHolders(false);
    }
  }, [tokenAddress]);

  // Fetch holders when active tab changes to holders
  useEffect(() => {
    if (activeTab === "holders" && holdersData.length === 0) {
      fetchHolders();
    }
  }, [activeTab, fetchHolders, holdersData.length]);

  // --- Infinite Scroll Handler ---
  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;

    if (!container || !hasMoreTrades || isFetchingMoreTrades) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 100;
    if (isAtBottom) {
      try {
        console.log(
          `[Scroll] Reached bottom. Fetching trades after ${lastTrade.transactionHash}...`
        );
        setIsFetchingMoreTrades(true);
        const cursorId = `${lastTrade.transactionHash}:${lastTrade.logIndex}`;
        const moreTrades = await getTokenTrades(
          chainId,
          tokenAddress,
          TRADE_PAGE_SIZE,
          cursorId
        );

        if (moreTrades.length < TRADE_PAGE_SIZE) setHasMoreTrades(false);
        if (moreTrades.length > 0)
          setLastTrade(moreTrades[moreTrades.length - 1]);
        setTrades((prev) => prev.concat(moreTrades));
      } catch (error) {
        console.error("Error fetching more trades:", error);
      } finally {
        setIsFetchingMoreTrades(false);
      }
    }
  }, [chainId, tokenAddress, hasMoreTrades, isFetchingMoreTrades, lastTrade]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

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

  // Removed legacy financial mock data & formatter; token page now shows
  // crypto-centric metrics with placeholders to be wired up later.
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

  function abbreviateNumber(num: string | number): string {
    const n = typeof num === "string" ? parseFloat(num) : num;
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(2) + "k";
    return n.toString();
  }

  function abbreviateAddress(addr: string): string {
    if (!addr) return "";
    return addr.slice(0, 4) + "..." + addr.slice(-3);
  }

  function formatTimeAgo(timestamp: string | number): string {
    const ts =
      typeof timestamp === "string"
        ? parseInt(timestamp) / 1000
        : timestamp / 1000;
    const now = Date.now() / 1000;
    const diff = now - ts;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;
  }

  function formatTokenAge(deploymentTimestamp: string): string {
    const deploymentTime = new Date(deploymentTimestamp).getTime();
    const now = Date.now();
    const diffMs = now - deploymentTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "<1m";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  }

  function abbreviateTokenAmount(raw: string | number, decimals = 18): string {
    const n = typeof raw === "string" ? parseFloat(raw) : raw;
    const value = n / Math.pow(10, decimals);
    // Round to nearest integer for threshold checks
    const rounded = Math.round(value);
    if (rounded >= 1e9) return (value / 1e9).toFixed(2) + "B";
    if (rounded >= 1e6) return (value / 1e6).toFixed(2) + "M";
    if (rounded >= 1e3) return (value / 1e3).toFixed(2) + "k";
    if (value >= 1) return value.toFixed(2);
    if (value > 0) return value.toPrecision(2);
    return "0";
  }

  // Filter trades by trader if filter is active
  const filteredTrades = React.useMemo(() => {
    if (!filteredTrader) return trades;
    return trades.filter(
      (trade) => trade.maker.toLowerCase() === filteredTrader.toLowerCase()
    );
  }, [trades, filteredTrader]);

  // Display trades - show filtered trades when filter is active, all trades when no filter
  const displayTrades = React.useMemo(() => {
    return filteredTrades;
  }, [filteredTrades]);

  // Memoize the mapped trade rows to avoid unnecessary re-renders
  const tradeRows = React.useMemo(
    () =>
      displayTrades.map((trade, idx) => (
        <tr key={idx} className="border-b border-gray-800 last:border-0">
          <td className="p-1 text-white font-mono">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/profile/${trade.maker}`)}
                className="hover:text-orange-400 underline text-left"
              >
                {abbreviateAddress(trade.maker)}
              </button>
              {filteredTrader ? (
                <button
                  onClick={() => setFilteredTrader(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => setFilteredTrader(trade.maker)}
                  className="text-gray-400 hover:text-orange-400 transition-colors"
                  title="Filter by this trader"
                >
                  <Filter className="w-3 h-3" />
                </button>
              )}
            </div>
          </td>
          <td className="p-1 text-right text-white font-mono">
            {abbreviateTokenAmount(trade.baseAmount)}
          </td>
          <td className="p-1 text-right text-white font-mono">
            {abbreviateTokenAmount(trade.quoteAmount)}
          </td>
          <td className="p-1 text-center">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                trade.tradeType === "BUY"
                  ? "bg-green-600/80 text-white"
                  : "bg-red-600/80 text-white"
              }`}
            >
              {trade.tradeType}
            </span>
          </td>
          <td className="p-1 text-right text-gray-400">
            {formatTimeAgo(trade.timestamp)}
          </td>
          <td className="p-1 text-center">
            <a
              href={`${getExplorer(chainId)}/tx/${trade.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400"
              title="View on Etherscan"
            >
              <ArrowUpRight className="w-4 h-4 inline" />
            </a>
          </td>
        </tr>
      )),
    [displayTrades, chainId, filteredTrader]
  );

  // --- Bonding Curve Progress from Trades (dynamic, client-side) ---
  const GRADUATION_ASSET_THRESHOLD_WEI = React.useMemo(() => {
    // 20 asset tokens, assuming 18 decimals
    const twenty = 20n;
    const wei = 10n ** 18n;
    return twenty * wei;
  }, []);

  const netAssetInCurveWei = React.useMemo(() => {
    // Aggregate BUY quoteAmount (asset in) minus SELL quoteAmount (asset out)
    return trades.reduce((acc, trade) => {
      try {
        const amt = BigInt(trade.quoteAmount || "0");
        return trade.tradeType === "BUY" ? acc + amt : acc - amt;
      } catch {
        return acc;
      }
    }, 0n);
  }, [trades]);

  const progressFromTrades = React.useMemo(() => {
    if (GRADUATION_ASSET_THRESHOLD_WEI <= 0n) return 0;
    const numerator = Number(netAssetInCurveWei);
    const denominator = Number(GRADUATION_ASSET_THRESHOLD_WEI);
    if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0)
      return 0;
    const pct = (numerator / denominator) * 100;
    return Math.max(0, Math.min(100, Math.floor(pct)));
  }, [netAssetInCurveWei, GRADUATION_ASSET_THRESHOLD_WEI]);

  const isGraduatedFromTrades = React.useMemo(
    () => netAssetInCurveWei >= GRADUATION_ASSET_THRESHOLD_WEI,
    [netAssetInCurveWei, GRADUATION_ASSET_THRESHOLD_WEI]
  );

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
            <div className="bg-gray-900 border border-gray-700 p-2 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 min-w-0">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0 min-w-0 flex-1">
                  {/* Token Logo */}
                  {tokenData?.logoUrl ? (
                    <img
                      src={tokenData.logoUrl}
                      alt={`${tokenData.name} logo`}
                      className={`w-16 h-16 object-cover ${
                        isMobile
                          ? "cursor-pointer hover:opacity-80 transition-opacity"
                          : ""
                      }`}
                      onClick={
                        isMobile ? () => setIsLogoModalOpen(true) : undefined
                      }
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 ${
                        isMobile
                          ? "cursor-pointer hover:opacity-80 transition-opacity"
                          : ""
                      }`}
                      onClick={
                        isMobile ? () => setIsLogoModalOpen(true) : undefined
                      }
                    >
                      {tokenData?.symbol}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Mobile: Stack vertically, Desktop: Keep horizontal */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                      <div className="text-orange-400 font-bold text-2xl sm:text-3xl truncate">
                        {tokenData?.symbol}
                      </div>
                      <div className="text-gray-300 text-sm sm:text-base truncate">
                        {tokenData?.name}
                      </div>
                      <span
                        className="text-gray-400 text-xs cursor-pointer hover:text-orange-400 transition-colors truncate flex-shrink-0"
                        onClick={async () => {
                          if (tokenData?.tokenAddress) {
                            await navigator.clipboard.writeText(
                              tokenData.tokenAddress
                            );
                            toast({
                              title: "Address Copied",
                              description: "Token address copied to clipboard",
                              variant: "default",
                            });
                          }
                        }}
                        title="Click to copy address"
                      >
                        {tokenData?.tokenAddress
                          ? `${tokenData.tokenAddress.slice(
                              0,
                              6
                            )}...${tokenData.tokenAddress.slice(-4)}`
                          : "N/A"}
                      </span>
                    </div>

                    {/* Age and Deployer Row */}
                    <div className="flex items-center space-x-4 mt-2 overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-orange-400" />
                        <span className="text-white text-sm">
                          {tokenData?.deploymentTimestamp
                            ? formatTokenAge(tokenData.deploymentTimestamp)
                            : "Unknown"}
                        </span>
                      </div>
                      {tokenData?.deployer && (
                        <button
                          onClick={() =>
                            navigate(`/profile/${tokenData.deployer.address}`)
                          }
                          className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          <img
                            src={tokenData.deployer.pfp}
                            alt={`${tokenData.deployer.username} profile`}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                          <span className="text-sm truncate max-w-32">
                            {tokenData.deployer.username}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Social Links Row */}
                    <div className="flex items-center space-x-2 mt-2 overflow-hidden">
                      {tokenData?.websiteUrl && (
                        <a
                          href={tokenData.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors"
                          title="Website"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {tokenData?.twitterUrl && (
                        <a
                          href={tokenData.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors"
                          title="X (Twitter)"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                      )}
                      {tokenData?.telegramUrl && (
                        <a
                          href={tokenData.telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors"
                          title="Telegram"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M23.1117 4.49449C23.4296 2.94472 21.9074 1.65683 20.4317 2.227L2.3425 9.21601C0.694517 9.85273 0.621087 12.1572 2.22518 12.8975L6.1645 14.7157L8.03849 21.2746C8.13583 21.6153 8.40618 21.8791 8.74917 21.968C9.09216 22.0568 9.45658 21.9576 9.70712 21.707L12.5938 18.8203L16.6375 21.8531C17.8113 22.7334 19.5019 22.0922 19.7967 20.6549L23.1117 4.49449ZM3.0633 11.0816L21.1525 4.0926L17.8375 20.2531L13.1 16.6999C12.7019 16.4013 12.1448 16.4409 11.7929 16.7928L10.5565 18.0292L10.928 15.9861L18.2071 8.70703C18.5614 8.35278 18.5988 7.79106 18.2947 7.39293C17.9906 6.99479 17.4389 6.88312 17.0039 7.13168L6.95124 12.876L3.0633 11.0816ZM8.17695 14.4791L8.78333 16.6015L9.01614 15.321C9.05253 15.1209 9.14908 14.9366 9.29291 14.7928L11.5128 12.573L8.17695 14.4791Z"
                            />
                          </svg>
                        </a>
                      )}
                      {!tokenData?.websiteUrl &&
                        !tokenData?.twitterUrl &&
                        !tokenData?.telegramUrl && (
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4 text-gray-600" />
                            <svg
                              className="w-4 h-4 text-gray-600"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <svg
                              className="w-4 h-4 text-gray-600"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M23.1117 4.49449C23.4296 2.94472 21.9074 1.65683 20.4317 2.227L2.3425 9.21601C0.694517 9.85273 0.621087 12.1572 2.22518 12.8975L6.1645 14.7157L8.03849 21.2746C8.13583 21.6153 8.40618 21.8791 8.74917 21.968C9.09216 22.0568 9.45658 21.9576 9.70712 21.707L12.5938 18.8203L16.6375 21.8531C17.8113 22.7334 19.5019 22.0922 19.7967 20.6549L23.1117 4.49449ZM3.0633 11.0816L21.1525 4.0926L17.8375 20.2531L13.1 16.6999C12.7019 16.4013 12.1448 16.4409 11.7929 16.7928L10.5565 18.0292L10.928 15.9861L18.2071 8.70703C18.5614 8.35278 18.5988 7.79106 18.2947 7.39293C17.9906 6.99479 17.4389 6.88312 17.0039 7.13168L6.95124 12.876L3.0633 11.0816ZM8.17695 14.4791L8.78333 16.6015L9.01614 15.321C9.05253 15.1209 9.14908 14.9366 9.29291 14.7928L11.5128 12.573L8.17695 14.4791Z"
                              />
                            </svg>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Desktop: Price on the right, Mobile: Hidden (shown below instead) */}
                <div className="hidden sm:block text-left sm:text-right min-w-0">
                  <div className="text-xl sm:text-2xl font-mono text-white truncate">
                    ${stockData.price.toFixed(2)}
                  </div>
                  <div
                    className={`text-base sm:text-lg font-mono truncate ${
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

              {/* Mobile: Price row underneath */}
              <div className="sm:hidden mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center min-w-0">
                  <div className="text-xl font-mono text-white truncate">
                    ${stockData.price.toFixed(2)}
                  </div>
                  <div
                    className={`text-lg font-mono flex-shrink-0 ml-2 ${
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
              <TradingViewChart
                symbol={`${tokenData?.symbol}:${chainId}:${tokenAddress}`}
                height={300}
              />
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
                  <div className="text-gray-400">MARKET CAP</div>
                  <div className="text-white font-mono text-sm">TODO</div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">LIQUIDITY</div>
                  <div className="text-white font-mono text-sm">TODO</div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">FDV</div>
                  <div className="text-white font-mono text-sm">TODO</div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">PRICE (USD)</div>
                  <div className="text-white font-mono text-sm">TODO</div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">HOLDERS</div>
                  <div className="text-white font-mono text-sm">TODO</div>
                </div>
                <div className="bg-black border border-gray-800 p-2">
                  <div className="text-gray-400">VOLUME</div>
                  <div className="text-white font-mono text-sm">TODO</div>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="text-orange-400 mb-2">COMPANY INFO</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <Clock
                    className={`w-3 h-3 ${
                      tokenData?.deploymentTimestamp
                        ? "text-orange-400"
                        : "text-gray-600"
                    }`}
                  />
                  <span className="text-gray-400">Age</span>
                  <span className="text-white">
                    {tokenData?.deploymentTimestamp
                      ? formatTokenAge(tokenData.deploymentTimestamp)
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  </div>
                  <span className="text-gray-400">Deployer</span>
                  {tokenData?.deployer ? (
                    <button
                      onClick={() =>
                        navigate(`/profile/${tokenData.deployer.address}`)
                      }
                      className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <img
                        src={tokenData.deployer.pfp}
                        alt={`${tokenData.deployer.username} profile`}
                        className="w-4 h-4 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                      <span className="truncate max-w-32">
                        {tokenData.deployer.username}
                      </span>
                    </button>
                  ) : (
                    <span className="text-gray-600">Unknown</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Globe
                    className={`w-3 h-3 ${
                      tokenData?.websiteUrl
                        ? "text-orange-400"
                        : "text-gray-600"
                    }`}
                  />
                  <span className="text-gray-400">Website</span>
                  {tokenData?.websiteUrl ? (
                    <a
                      href={tokenData.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 transition-colors flex items-center space-x-1"
                    >
                      <span className="truncate max-w-32">
                        {tokenData.websiteUrl}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-600">Not available</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <svg
                    className={`w-3 h-3 ${
                      tokenData?.twitterUrl
                        ? "text-orange-400"
                        : "text-gray-600"
                    }`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-gray-400">X (Twitter)</span>
                  {tokenData?.twitterUrl ? (
                    <a
                      href={tokenData.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 transition-colors flex items-center space-x-1"
                    >
                      <span className="truncate max-w-32">
                        {tokenData.twitterUrl}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-600">Not available</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <svg
                    className={`w-3 h-3 ${
                      tokenData?.telegramUrl
                        ? "text-orange-400"
                        : "text-gray-600"
                    }`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M23.1117 4.49449C23.4296 2.94472 21.9074 1.65683 20.4317 2.227L2.3425 9.21601C0.694517 9.85273 0.621087 12.1572 2.22518 12.8975L6.1645 14.7157L8.03849 21.2746C8.13583 21.6153 8.40618 21.8791 8.74917 21.968C9.09216 22.0568 9.45658 21.9576 9.70712 21.707L12.5938 18.8203L16.6375 21.8531C17.8113 22.7334 19.5019 22.0922 19.7967 20.6549L23.1117 4.49449ZM3.0633 11.0816L21.1525 4.0926L17.8375 20.2531L13.1 16.6999C12.7019 16.4013 12.1448 16.4409 11.7929 16.7928L10.5565 18.0292L10.928 15.9861L18.2071 8.70703C18.5614 8.35278 18.5988 7.79106 18.2947 7.39293C17.9906 6.99479 17.4389 6.88312 17.0039 7.13168L6.95124 12.876L3.0633 11.0816ZM8.17695 14.4791L8.78333 16.6015L9.01614 15.321C9.05253 15.1209 9.14908 14.9366 9.29291 14.7928L11.5128 12.573L8.17695 14.4791Z"
                    />
                  </svg>
                  <span className="text-gray-400">Telegram</span>
                  {tokenData?.telegramUrl ? (
                    <a
                      href={tokenData.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 transition-colors flex items-center space-x-1"
                    >
                      <span className="truncate max-w-32">
                        {tokenData.telegramUrl}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-600">Not available</span>
                  )}
                </div>
              </div>
              {/* Bottom Description */}
              <div className="bg-gray-900 border-t border-orange-500/30 p-2">
                <div className="text-orange-400 mb-1">COMPANY DESCRIPTION</div>
                <div className="text-gray-300 text-xs leading-relaxed">
                  {tokenData?.description}
                </div>
              </div>

              {/* Comments Section */}
              <CommentsSection
                tokenAddress={tokenData?.tokenAddress || ""}
                tokenSymbol={tokenData?.symbol || ""}
              />
            </div>
          </div>

          {/* Right Column - Trading */}
          <div className="col-span-12 lg:col-span-4 space-y-1">
            <TradingForm
              chain={tokenData?.chain}
              symbol={tokenData?.symbol}
              tokenAddress={tokenData?.tokenAddress}
            />
            {/* Bonding Curve Progress & Graduation Badge */}
            <BondingCurveProgress
              progress={progressFromTrades}
              graduated={
                isGraduatedFromTrades ||
                tokenData?.isGraduated ||
                !!tokenData?.uniswapPair
              }
              uniswapPair={tokenData?.uniswapPair}
            />
            {/* Recent Trades / Holders */}
            <div className="bg-gray-900 border border-gray-700 p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveTab("trades")}
                    className={`text-xs font-bold transition-colors ${
                      activeTab === "trades"
                        ? "text-orange-400"
                        : "text-gray-400 hover:text-orange-300"
                    }`}
                  >
                    RECENT TRADES
                  </button>
                  <button
                    onClick={() => setActiveTab("holders")}
                    className={`text-xs font-bold transition-colors ${
                      activeTab === "holders"
                        ? "text-orange-400"
                        : "text-gray-400 hover:text-orange-300"
                    }`}
                  >
                    HOLDERS
                  </button>
                </div>
                {activeTab === "trades" && filteredTrader && (
                  <button
                    onClick={() => setFilteredTrader(null)}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              {activeTab === "trades" ? (
                displayTrades.length === 0 ? (
                  <div className="text-gray-400 text-xs">
                    {filteredTrader
                      ? "No trades found for this trader."
                      : "No recent trades found."}
                  </div>
                ) : (
                  <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto h-96 custom-scrollbar"
                  >
                    <table className="w-full text-xs min-w-[400px]">
                      <thead className="bg-gray-900 sticky top-0 z-10">
                        <tr className="text-gray-400 border-b border-gray-700">
                          <th className="text-left p-1">
                            <div className="flex items-center space-x-1">
                              <span>TRADER</span>
                              {filteredTrader && (
                                <Filter className="w-3 h-3 text-orange-400 fill-current" />
                              )}
                            </div>
                          </th>
                          <th className="text-right p-1">
                            {(tokenData?.symbol || "TOKEN").toUpperCase()}{" "}
                            AMOUNT
                          </th>
                          <th className="text-right p-1">WETH AMOUNT</th>
                          <th className="text-center p-1">TYPE</th>
                          <th className="text-right p-1">TIME</th>
                          <th className="text-center p-1"></th>
                        </tr>
                      </thead>
                      <tbody>{tradeRows}</tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="overflow-x-auto h-96 custom-scrollbar">
                  <table className="w-full text-xs min-w-[400px]">
                    <thead className="bg-gray-900 sticky top-0 z-10">
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left p-1">HOLDER</th>
                        <th className="text-right p-1">BALANCE</th>
                        <th className="text-right p-1">PERCENTAGE</th>
                        <th className="text-center p-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingHolders ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-4 text-center text-gray-400"
                          >
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400"></div>
                              <span>Loading holders...</span>
                            </div>
                          </td>
                        </tr>
                      ) : holdersData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-4 text-center text-gray-400"
                          >
                            No holders found
                          </td>
                        </tr>
                      ) : (
                        holdersData.map((holder, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-gray-800 last:border-0"
                          >
                            <td className="p-1 text-white">
                              <div className="flex items-center space-x-2">
                                <img
                                  src={holder.pfp || "/default-pfp.jpeg"}
                                  alt="Profile"
                                  className="w-6 h-6 rounded-full"
                                  onError={(e) => {
                                    e.currentTarget.src = "/default-pfp.jpeg";
                                  }}
                                />
                                <button
                                  onClick={() =>
                                    navigate(`/profile/${holder.holderAddress}`)
                                  }
                                  className="hover:text-orange-400 underline text-left font-mono"
                                >
                                  {holder.username ||
                                    abbreviateAddress(holder.holderAddress)}
                                </button>
                              </div>
                            </td>
                            <td className="p-1 text-right text-white font-mono">
                              {formatBalance(holder.balance)}
                            </td>
                            <td className="p-1 text-right text-gray-400">
                              {calculatePercentage(holder.balance)}
                            </td>
                            <td className="p-1 text-center">
                              <a
                                href={`${getExplorer(chainId)}/address/${
                                  holder.holderAddress
                                }`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-orange-400"
                                title="View on Etherscan"
                              >
                                <ArrowUpRight className="w-4 h-4 inline" />
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Token Logo Modal - Mobile Only */}
      {isMobile && (
        <Dialog open={isLogoModalOpen} onOpenChange={setIsLogoModalOpen}>
          <DialogContent className="max-w-sm mx-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-center text-orange-400 text-lg">
                {tokenData?.name || tokenData?.symbol}
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center py-8">
              {tokenData?.logoUrl ? (
                <img
                  src={tokenData.logoUrl}
                  alt={`${tokenData.name} logo`}
                  className="w-48 h-48 object-cover shadow-2xl"
                />
              ) : (
                <div className="w-48 h-48 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-4xl flex items-center justify-center shadow-2xl">
                  {tokenData?.symbol}
                </div>
              )}
            </div>
            <div className="text-center text-gray-300 text-sm">
              <p className="mb-2">
                <span className="text-orange-400 font-bold">
                  {tokenData?.symbol}
                </span>
                {tokenData?.name && (
                  <span className="ml-2">{tokenData.name}</span>
                )}
              </p>
              {tokenData?.tokenAddress && (
                <p className="text-gray-400 text-xs">
                  {tokenData.tokenAddress.slice(0, 6)}...
                  {tokenData.tokenAddress.slice(-4)}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TokenPage;
