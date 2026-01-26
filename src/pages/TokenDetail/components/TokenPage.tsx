import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAtom } from "jotai";
import { isSearchModalOpenAtom } from "@/state/app";
import {
  getExplorer,
  getToken,
  getTokenTrades,
  getTokenHolders,
  TokenHolder,
} from "@/api/token";
import { getComments } from "@/api/comment";
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
  Star,
  User,
  ArrowLeft,
  Share2,
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
import { Chain, TokenFullData, TokenMarketOverview, TradeData } from "@/types";
import { CommentsSection } from "@/components/Comments";
import { useTokenMarketUpdates } from "@/hooks/useTokenMarketUpdate";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAppKitAccount } from "@reown/appkit/react";
import { useETHWalletSigner } from "@/hooks/signers/useWalletSigner";
import { ethers } from "ethers";

function formatNumber(num: number): string {
  if (num >= 1e9) return parseFloat((num / 1e9).toFixed(2)) + "B";
  if (num >= 1e6) return parseFloat((num / 1e6).toFixed(2)) + "M";
  if (num >= 1e3) return parseFloat((num / 1e3).toFixed(2)) + "K";
  return parseFloat(num.toFixed(2)) + "";
}

// Helper function to get liquidity display value
function getLiquidityWeth(tokenData: TokenFullData): string {
  if (!tokenData) return "N/A";

  // For non-graduated tokens, show bonding curve asset balance
  if (!tokenData.isGraduated && tokenData.bondingCurve?.assetBalance) {
    const wethAmount = parseFloat(tokenData.bondingCurve.assetBalance) / 1e18;
    return wethAmount.toFixed(4);
  }

  // For graduated tokens, show Uniswap liquidity
  if (tokenData.isGraduated && tokenData.uniswapLiquidity?.wethReserve) {
    const wethAmount =
      parseFloat(tokenData.uniswapLiquidity.wethReserve) / 1e18;
    return wethAmount.toFixed(4);
  }

  // Fallback to legacy liquidityWeth field if available
  if (tokenData.liquidityWeth) {
    const wethAmount = parseFloat(tokenData.liquidityWeth) / 1e18;
    return wethAmount.toFixed(4);
  }

  return "N/A";
}

// Helper function to calculate NYSE trading hours progress
function getNYSETradingProgress(): {
  progress: number;
  status: "open" | "closed" | "pre-market" | "after-hours";
  isWeekend: boolean;
  label: string;
} {
  // Get current time in ET timezone
  const now = new Date();
  const etTimeString = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  const etDate = new Date(etTimeString);

  const dayOfWeek = etDate.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return {
      progress: 0,
      status: "closed",
      isWeekend: true,
      label: "Market Closed (Weekend)",
    };
  }

  // NYSE trading hours: 9:30 AM - 4:00 PM ET
  const marketOpen = new Date(etDate);
  marketOpen.setHours(9, 30, 0, 0);

  const marketClose = new Date(etDate);
  marketClose.setHours(16, 0, 0, 0);

  const currentTime = etDate.getTime();
  const openTime = marketOpen.getTime();
  const closeTime = marketClose.getTime();

  // Before market opens
  if (currentTime < openTime) {
    const minutesUntilOpen = Math.floor((openTime - currentTime) / 60000);
    const hours = Math.floor(minutesUntilOpen / 60);
    const minutes = minutesUntilOpen % 60;
    return {
      progress: 0,
      status: "pre-market",
      isWeekend: false,
      label: `Pre-Market (Opens in ${hours}h ${minutes}m)`,
    };
  }

  // After market closes
  if (currentTime > closeTime) {
    return {
      progress: 100,
      status: "after-hours",
      isWeekend: false,
      label: "After Hours",
    };
  }

  // Market is open - calculate progress
  const totalTradingTime = closeTime - openTime;
  const elapsedTime = currentTime - openTime;
  const progress = Math.min(
    100,
    Math.max(0, (elapsedTime / totalTradingTime) * 100)
  );

  const remainingTime = closeTime - currentTime;
  const hoursRemaining = Math.floor(remainingTime / 3600000);
  const minutesRemaining = Math.floor((remainingTime % 3600000) / 60000);

  return {
    progress,
    status: "open",
    isWeekend: false,
    label: `Market Open (${hoursRemaining}h ${minutesRemaining}m remaining)`,
  };
}

const TokenPage = () => {
  const { chainId, tokenAddress } = useParams<{
    chainId: Chain;
    tokenAddress: string;
  }>();
  const navigate = useNavigate();
  const [tokenData, setTokenData] = useState<TokenFullData>(null);
  const [view, setView] = useState("details");
  const [error, setError] = useState<string | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isTradingModalOpen, setIsTradingModalOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const isMobile = useIsMobile();
  const [isSearchModalOpen] = useAtom(isSearchModalOpenAtom);

  const { isLoading, startLoading, stopLoading } = useLoading();
  const { toast } = useToast();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { isInWatchlist, toggleWatchlist } = useWatchlist(address);
  const { getETHSigner } = useETHWalletSigner();

  // Token balance for mobile button logic
  const [userTokenBalance, setUserTokenBalance] = useState<string>("0");

  const TRADE_PAGE_SIZE = 20;
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [lastTrade, setLastTrade] = useState<TradeData>(null);
  const [hasMoreTrades, setHasMoreTrades] = useState(true);
  const [isFetchingMoreTrades, setIsFetchingMoreTrades] = useState(false);
  const [filteredTrader, setFilteredTrader] = useState<string | null>(null);
  const [isFilterBySizeEnabled, setIsFilterBySizeEnabled] = useState(false);
  const [showLiquidity, setShowLiquidity] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "trades" | "holders" | "comments" | "info"
  >(() => {
    // Check if mobile on initial render
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "comments";
    }
    return "trades";
  });
  const [holdersData, setHoldersData] = useState<TokenHolder[]>([]);
  const [holdersCount, setHoldersCount] = useState<number>(0);
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [burntData, setBurntData] = useState<TokenHolder | null>(null);
  const [uniswapData, setUniswapData] = useState<TokenHolder | null>(null);
  const [bondingCurveData, setBondingCurveData] = useState<TokenHolder | null>(
    null
  );

  // NYSE trading hours progress
  const [nyseTradingProgress, setNyseTradingProgress] = useState(
    getNYSETradingProgress()
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const liquidityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showPinnedNav, setShowPinnedNav] = useState(false);

  // Callback refs to notify TradingForm of confirmed trades
  const tradeConfirmCallbackRef = useRef<
    ((txHash: string, tradeType: "BUY" | "SELL") => void) | null
  >(null);

  // Ref to access the trading form for submitting
  const tradingFormRef = useRef<HTMLFormElement>(null);

  // Fetch user token balance on page load (for mobile button logic)
  const fetchUserTokenBalance = useCallback(async () => {
    if (!isConnected || !address || !tokenAddress) {
      setUserTokenBalance("0");
      return;
    }

    try {
      const signer = await getETHSigner();
      const token = new ethers.Contract(
        tokenAddress,
        ["function balanceOf(address) view returns (uint256)"],
        signer
      );
      const balance = await token.balanceOf(address);
      setUserTokenBalance(balance.toString());
    } catch (error) {
      console.error("Error fetching user token balance:", error);
      setUserTokenBalance("0");
    }
  }, [isConnected, address, tokenAddress, getETHSigner]);

  // Refresh balance when trades are confirmed
  const handleTradeUpdate = useCallback((newTrades: TradeData[]) => {
    console.log(
      `[TokenPage] Received trade update at ${Date.now()}:`,
      newTrades
    );

    // Notify TradingForm if any of these trades match pending tx
    if (tradeConfirmCallbackRef.current) {
      newTrades.forEach((trade) => {
        tradeConfirmCallbackRef.current?.(
          trade.transactionHash,
          trade.tradeType
        );
      });
    }

    // Refresh user balance if user made a trade
    if (isConnected && address) {
      const userMadeTrade = newTrades.some(
        (trade) => trade.maker.toLowerCase() === address.toLowerCase()
      );
      if (userMadeTrade) {
        fetchUserTokenBalance();
      }
    }

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
  }, [isConnected, address, fetchUserTokenBalance]);

  // Subscribe to real-time trade updates
  useTradeUpdates(chainId, tokenAddress, handleTradeUpdate);

  // Subscribe to real-time volume updates
  const handleMarketUpdate = useCallback(
    (freshMarketOverview: TokenMarketOverview) => {
      setTokenData((prev) => ({
        ...prev,
        price: freshMarketOverview,
        // Update bonding curve and liquidity data from market overview
        bondingCurve: freshMarketOverview.bondingCurve,
        uniswapLiquidity: freshMarketOverview.uniswapLiquidity,
        // Update progress if available
        progress: freshMarketOverview.bondingCurve?.progress ?? prev.progress,
      }));
    },
    []
  );

  useTokenMarketUpdates(chainId, tokenAddress, handleMarketUpdate);

  // Fetch user token balance on page load
  useEffect(() => {
    fetchUserTokenBalance();
  }, [fetchUserTokenBalance]);

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

  // Update meta tags when token data is loaded
  useEffect(() => {
    if (tokenData) {
      const tokenSymbol = tokenData.symbol || tokenData.name || "Token";
      const title = `${tokenSymbol} on Stonk Market`;
      const imageUrl = tokenData.logoUrl
        ? tokenData.logoUrl.startsWith("https")
          ? tokenData.logoUrl
          : `${window.location.origin}${tokenData.logoUrl}`
        : `${window.location.origin}/default-pfp.jpeg`;

      // Update document title
      document.title = title;

      // Update or create og:title
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement("meta");
        ogTitle.setAttribute("property", "og:title");
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute("content", title);

      // Update or create og:image
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement("meta");
        ogImage.setAttribute("property", "og:image");
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute("content", imageUrl);

      // Update or create og:description
      let ogDescription = document.querySelector(
        'meta[property="og:description"]'
      );
      if (!ogDescription) {
        ogDescription = document.createElement("meta");
        ogDescription.setAttribute("property", "og:description");
        document.head.appendChild(ogDescription);
      }
      ogDescription.setAttribute(
        "content",
        `View ${tokenSymbol} on Stonk Market`
      );

      // Update or create twitter:title
      let twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (!twitterTitle) {
        twitterTitle = document.createElement("meta");
        twitterTitle.setAttribute("name", "twitter:title");
        document.head.appendChild(twitterTitle);
      }
      twitterTitle.setAttribute("content", title);

      // Update or create twitter:image
      let twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (!twitterImage) {
        twitterImage = document.createElement("meta");
        twitterImage.setAttribute("name", "twitter:image");
        document.head.appendChild(twitterImage);
      }
      twitterImage.setAttribute("content", imageUrl);
    } else {
      // Reset to default when no token data
      document.title = "Stonk Market";
      const defaultImage = `${window.location.origin}/default-pfp.jpeg`;

      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", "Stonk Market");

      let ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute("content", defaultImage);

      let twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) twitterImage.setAttribute("content", defaultImage);
    }
  }, [tokenData]);

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
      const allHolders = response.data.holders;

      // Define special addresses that should be excluded from holder count
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      const specialAddresses = [
        burnAddress.toLowerCase(),
        tokenData?.uniswapPair?.toLowerCase(),
        tokenData?.bondingCurveAddress?.toLowerCase(),
      ].filter(Boolean);

      // Find special holders
      const burntHolder = allHolders.find(
        (holder) =>
          holder.holderAddress.toLowerCase() === burnAddress.toLowerCase()
      );

      const uniswapHolder = tokenData?.uniswapPair
        ? allHolders.find(
            (holder) =>
              holder.holderAddress.toLowerCase() ===
              tokenData.uniswapPair.toLowerCase()
          )
        : null;

      const bondingCurveHolder = tokenData?.bondingCurveAddress
        ? allHolders.find(
            (holder) =>
              holder.holderAddress.toLowerCase() ===
              tokenData.bondingCurveAddress.toLowerCase()
          )
        : null;

      // Filter out special addresses from regular holders
      const regularHolders = allHolders.filter(
        (holder) =>
          !specialAddresses.includes(holder.holderAddress.toLowerCase())
      );

      setHoldersData(regularHolders);
      setBurntData(burntHolder || null);
      setUniswapData(uniswapHolder || null);
      setBondingCurveData(bondingCurveHolder || null);
      // Holder count should only include regular holders, not special addresses
      setHoldersCount(regularHolders.length);
    } catch (error) {
      console.error("Error fetching holders:", error);
      setHoldersData([]);
      setBurntData(null);
      setUniswapData(null);
      setBondingCurveData(null);
      setHoldersCount(0);
    } finally {
      setIsLoadingHolders(false);
    }
  }, [tokenAddress, tokenData?.uniswapPair, tokenData?.bondingCurveAddress]);

  // Fetch comments count on page load
  const fetchCommentsCount = useCallback(async () => {
    if (!tokenAddress) return;

    try {
      const response = await getComments({
        tokenId: tokenAddress,
        page: 1,
        limit: 1, // We only need the count, not the actual comments
      });

      if (response.success && response.data?.pagination) {
        setCommentsCount(response.data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching comments count:", error);
      setCommentsCount(0);
    }
  }, [tokenAddress]);

  // Fetch holders by default when token data is loaded
  useEffect(() => {
    if (tokenData && holdersData.length === 0) {
      fetchHolders();
    }
  }, [tokenData, fetchHolders, holdersData.length]);

  // Fetch comments count when token data is loaded
  useEffect(() => {
    if (tokenData) {
      fetchCommentsCount();
    }
  }, [tokenData, fetchCommentsCount]);


  // --- Infinite Scroll Handler ---
  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;

    if (!container || !hasMoreTrades || isFetchingMoreTrades) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 20;
    if (isAtBottom) {
      try {
        console.log(
          `[Scroll] Reached bottom. Fetching trades after ${lastTrade.transactionHash}...`
        );
        setIsFetchingMoreTrades(true);
        const cursorId = `${lastTrade.transactionHash}:${lastTrade.logIndex}:${lastTrade.timestamp}`;
        const moreTrades = await getTokenTrades(
          chainId,
          tokenAddress,
          TRADE_PAGE_SIZE,
          cursorId
        );

        console.log(`[Scroll] Fetched ${moreTrades.length} trades`);

        // Check for duplicates before updating state
        const uniqueNewTrades = moreTrades.filter(
          (newTrade) =>
            !trades.some(
              (existingTrade) =>
                existingTrade.transactionHash === newTrade.transactionHash &&
                existingTrade.logIndex === newTrade.logIndex
            )
        );

        console.log(
          `[Scroll] ${uniqueNewTrades.length} unique new trades out of ${moreTrades.length}`
        );

        // Stop pagination if we got fewer trades than requested or no unique trades
        if (
          moreTrades.length < TRADE_PAGE_SIZE ||
          uniqueNewTrades.length === 0
        ) {
          console.log(
            `[Scroll] Stopping pagination (moreTrades: ${moreTrades.length}, unique: ${uniqueNewTrades.length})`
          );
          setHasMoreTrades(false);
        }

        if (uniqueNewTrades.length > 0) {
          setLastTrade(uniqueNewTrades[uniqueNewTrades.length - 1]);
          setTrades((prev) => [...prev, ...uniqueNewTrades]);
        }
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
  }, [handleScroll, scrollContainerRef.current]);

  // Scroll detection for pinned navigation (mobile only)
  useEffect(() => {
    if (!isMobile || !headerRef.current || !tokenData) return;

    const handleScrollForPinnedNav = () => {
      const header = headerRef.current;
      if (!header) return;

      // Get scroll position from window or document
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      
      // Get header position relative to viewport
      const headerRect = header.getBoundingClientRect();
      const headerBottom = headerRect.bottom;
      
      // Show pinned nav when header has scrolled out of view (when header bottom is above viewport top)
      setShowPinnedNav(headerBottom < 0);
    };

    // Use both window and document scroll events for better compatibility
    window.addEventListener("scroll", handleScrollForPinnedNav, { passive: true });
    document.addEventListener("scroll", handleScrollForPinnedNav, { passive: true });
    
    // Check on mount in case page is already scrolled
    handleScrollForPinnedNav();

    return () => {
      window.removeEventListener("scroll", handleScrollForPinnedNav);
      document.removeEventListener("scroll", handleScrollForPinnedNav);
    };
  }, [isMobile, tokenData]);

  // Removed legacy financial mock data & formatter; token page now shows
  // crypto-centric metrics with placeholders to be wired up later.
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedView, setSelectedView] = useState("EQUITY RESEARCH");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update NYSE trading progress every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setNyseTradingProgress(getNYSETradingProgress());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Cleanup liquidity timeout on unmount
  useEffect(() => {
    return () => {
      if (liquidityTimeoutRef.current) {
        clearTimeout(liquidityTimeoutRef.current);
      }
    };
  }, []);

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
        <tr
          key={idx}
          className={isMobile ? "" : "border-b border-gray-800 last:border-0"}
        >
          <td className="p-1 font-sans" style={{ color: '#FAFAFA' }}>
            <div className="flex items-center space-x-2">
              {trade.makerPfp && (
                <img
                  src={trade.makerPfp}
                  alt="Profile"
                  className="w-6 h-6 rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <button
                onClick={() => navigate(`/profile/${trade.maker}`)}
                className="hover:text-orange-400 underline text-left"
              >
                {trade.makerUsername || abbreviateAddress(trade.maker)}
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
          <td className="p-1 text-center">
            {isMobile ? (
              <span
                className={`text-xs ${
                  trade.tradeType === "BUY"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {trade.tradeType === "BUY" ? "Buy" : "Sell"}
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  trade.tradeType === "BUY"
                    ? "bg-green-600/80 text-[#FAFAFA]"
                    : "bg-red-600/80 text-[#FAFAFA]"
                }`}
              >
                {trade.tradeType === "BUY" ? "Buy" : "Sell"}
              </span>
            )}
          </td>
          <td className="p-1 pl-4 text-left font-sans" style={{ color: '#F8FAFC' }}>
            {abbreviateTokenAmount(trade.baseAmount)}
          </td>
          <td className="p-1 pl-6 text-left font-sans" style={{ color: '#F8FAFC' }}>
            {abbreviateTokenAmount(trade.quoteAmount)}
          </td>
          {!isMobile && (
            <td className="p-1 text-right text-gray-400">
              {formatTimeAgo(trade.timestamp)}
            </td>
          )}
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
    [displayTrades, chainId, filteredTrader, isMobile]
  );

  return (
    <div className="bg-bg-main text-gray-100 text-xs font-sans">
      {isLoading && <LoadingScreen />}

      {/* Error/Not Found Screen */}
      {error && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-bg-main border border-gray-700 p-8 max-w-md w-full text-center">
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
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-400 hover:bg-orange-500 text-black font-bold text-sm transition-all duration-200"
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
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-1 p-1 ${
            isMobile ? "pb-20" : ""
          }`}
        >
          {/* Left Column - Stock Overview */}
          <div className="col-span-12 lg:col-span-8 space-y-1">
            {/* Stock Header */}
            <div
              ref={headerRef}
              className={`${
                isMobile ? "bg-bg-main" : "bg-bg-main border border-gray-700"
              } p-2 overflow-hidden`}
            >
              {isMobile ? (
                /* Mobile Layout - New Design */
                <div className="space-y-2">
                  {/* Back Button and Timer Row */}
                  <div className="flex items-center justify-between py-2">
                    {/* Back Button */}
                    <button
                      onClick={() => navigate(-1)}
                      className="p-2 hover:bg-gray-800 rounded transition-colors"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="w-5 h-5 text-[#FAFAFA]" />
                    </button>

                    {/* Timer */}
                    <div className="text-[#FAFAFA] font-mono text-base">
                      {currentTime.toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Logo and Token Info Row */}
                  <div className="flex items-start gap-3">
                    {/* Token Logo */}
                    <div className="flex-shrink-0">
                      {tokenData?.logoUrl ? (
                        <img
                          src={tokenData.logoUrl}
                          alt={`${tokenData.name} logo`}
                          className="w-28 h-28 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-orange-400"
                          onClick={() => setIsLogoModalOpen(true)}
                        />
                      ) : (
                        <div
                          className="w-28 h-28 bg-gradient-to-br from-orange-400 to-red-600 text-[#FAFAFA] font-bold text-3xl flex items-center justify-center rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-orange-400"
                          onClick={() => setIsLogoModalOpen(true)}
                        >
                          {tokenData?.symbol?.slice(0, 3)}
                        </div>
                      )}
                    </div>

                    {/* Token Name, Symbol, and Address */}
                    <div className="flex-1 flex flex-col gap-1">
                      {/* Token Name */}
                      <div className="text-[#FAFAFA] font-bold text-xl leading-tight">
                        {tokenData?.name && tokenData.name.length > 20
                          ? tokenData.name.slice(0, 20) + "..."
                          : tokenData?.name}
                      </div>

                      {/* Token Symbol */}
                      <div className="text-[#FAFAFA] text-base leading-tight">
                        {tokenData?.symbol}
                      </div>

                      {/* Contract Address with Age */}
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <div
                          className="flex items-center space-x-1 cursor-pointer hover:text-orange-400 transition-colors"
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
                        >
                          <span>
                            {tokenData?.tokenAddress
                              ? `${tokenData.tokenAddress.slice(
                                  0,
                                  6
                                )}...${tokenData.tokenAddress.slice(-4)}`
                              : "N/A"}
                          </span>
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        {tokenData?.deploymentTimestamp && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span>
                              {formatTokenAge(tokenData.deploymentTimestamp)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Spacer div for future use */}
                  <div className="h-12"></div>

                  {/* Market Cap / Liquidity and Price Change - Combined container */}
                  <div className="flex flex-col gap-0">
                    {/* Market Cap / Liquidity Row with Star and Share */}
                    <div className="flex items-baseline justify-between">
                      <div 
                        className={`flex items-baseline space-x-2 ${isMobile && (tokenData?.isGraduated || tokenData?.uniswapPair) ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (isMobile && (tokenData?.isGraduated || tokenData?.uniswapPair)) {
                            // Clear any existing timeout
                            if (liquidityTimeoutRef.current) {
                              clearTimeout(liquidityTimeoutRef.current);
                            }
                            setShowLiquidity(true);
                            liquidityTimeoutRef.current = setTimeout(() => {
                              setShowLiquidity(false);
                              liquidityTimeoutRef.current = null;
                            }, 3000);
                          }
                        }}
                      >
                        {showLiquidity ? (
                          <>
                            <div className="text-[#FAFAFA] font-sans text-3xl font-bold">
                              $
                              {formatNumber(
                                parseFloat(getLiquidityWeth(tokenData)) * 2000
                              )}
                            </div>
                            <div className="text-gray-400 text-xs">Liquidity</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[#FAFAFA] font-sans text-3xl font-bold">
                              $
                              {formatNumber(
                                tokenData.price.currentPrice * 1_000_000_000
                              )}
                            </div>
                            <div className="text-gray-400 text-xs">Market cap</div>
                          </>
                        )}
                      </div>

                      {/* Star and Share Icons */}
                      <div className="flex items-center gap-1">
                        {/* Watchlist Star */}
                        {isConnected && tokenData?.tokenAddress && (
                          <button
                            onClick={async () => {
                              try {
                                await toggleWatchlist(tokenData.tokenAddress, chainId);
                                toast({
                                  title: isInWatchlist(tokenData.tokenAddress, chainId)
                                    ? "Removed from watchlist"
                                    : "Added to watchlist",
                                  description: isInWatchlist(tokenData.tokenAddress, chainId)
                                    ? "Token removed from your watchlist"
                                    : "Token added to your watchlist",
                                  variant: "default",
                                });
                              } catch (error) {
                                console.error("Error toggling watchlist:", error);
                                toast({
                                  title: "Error",
                                  description: "Failed to update watchlist",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded transition-colors"
                            aria-label={
                              isInWatchlist(tokenData.tokenAddress, chainId)
                                ? "Remove from watchlist"
                                : "Add to watchlist"
                            }
                          >
                            <Star
                              className={`w-5 h-5 ${
                                isInWatchlist(tokenData.tokenAddress, chainId)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-[#FAFAFA] hover:text-orange-400"
                              }`}
                            />
                          </button>
                        )}

                        {/* Share Icon */}
                        <button
                          onClick={() => {
                            toast({
                              title: "Share",
                              description: "Share functionality coming soon",
                              variant: "default",
                            });
                          }}
                          className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded transition-colors"
                          aria-label="Share"
                        >
                          <Share2 className="w-5 h-5 text-[#FAFAFA]" />
                        </button>
                      </div>
                    </div>

                    {/* Price Change */}
                    <div
                      className={`text-sm font-sans leading-none ${
                        tokenData.price.priceChange24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {tokenData.price.priceChange24h >= 0 ? "+" : ""}$
                      {(
                        (tokenData.price.currentPrice *
                          tokenData.price.priceChange24h) /
                        100
                      ).toFixed(2)}{" "}
                      ({tokenData.price.priceChange24h >= 0 ? "+" : ""}
                      {tokenData.price.priceChange24h.toFixed(2)}%) Past 24h
                    </div>
                  </div>
                </div>
              ) : (
                /* Desktop Layout - Keep Original */
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 min-w-0">
                  <div className="flex items-center space-x-3 mb-2 sm:mb-0 min-w-0 flex-1">
                    {/* Token Logo */}
                    {tokenData?.logoUrl ? (
                      <img
                        src={tokenData.logoUrl}
                        alt={`${tokenData.name} logo`}
                        className="w-16 h-16 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-600 text-[#FAFAFA] font-bold text-lg flex items-center justify-center flex-shrink-0">
                        {tokenData?.symbol}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Desktop: Keep horizontal */}
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
                                description:
                                  "Token address copied to clipboard",
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
                          <span className="text-[#FAFAFA] text-sm">
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
                            className="flex items-center space-x-2 text-orange-400 hover:text-orange-400 transition-colors"
                          >
                            {tokenData.deployer.pfp && (
                              <img
                                src={tokenData.deployer.pfp}
                                alt={`${
                                  tokenData.deployer.username ||
                                  tokenData.deployer.address
                                } profile`}
                                className="w-5 h-5 rounded object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                            )}
                            <span className="text-sm truncate max-w-32">
                              {tokenData.deployer.username ||
                                abbreviateAddress(tokenData.deployer.address)}
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
                            className="text-orange-400 hover:text-orange-400 transition-colors"
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
                            className="text-orange-400 hover:text-orange-400 transition-colors"
                            title="X"
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
                            className="text-orange-400 hover:text-orange-400 transition-colors"
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

                        {/* Watchlist Star - Only show if wallet connected */}
                        {isConnected && tokenData?.tokenAddress && (
                          <>
                            <div className="w-px h-4 bg-gray-600 mx-1"></div>
                            <button
                              onClick={async () => {
                                await toggleWatchlist(
                                  tokenData.tokenAddress,
                                  chainId
                                );
                                toast({
                                  title: isInWatchlist(
                                    tokenData.tokenAddress,
                                    chainId
                                  )
                                    ? "Removed from Watchlist"
                                    : "Added to Watchlist",
                                  description: isInWatchlist(
                                    tokenData.tokenAddress,
                                    chainId
                                  )
                                    ? "Token removed from your watchlist"
                                    : "Token added to your watchlist",
                                  variant: "default",
                                });
                              }}
                              className="hover:scale-110 transition-transform"
                              title={
                                isInWatchlist(tokenData.tokenAddress, chainId)
                                  ? "Remove from watchlist"
                                  : "Add to watchlist"
                              }
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  isInWatchlist(tokenData.tokenAddress, chainId)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-orange-400 hover:text-orange-400"
                                }`}
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop: Price on the right */}
                  <div className="text-left sm:text-right min-w-0">
                    <div className="text-xl sm:text-2xl font-sans text-[#FAFAFA] truncate">
                      $
                      {tokenData.price.currentPrice
                        ? parseFloat(tokenData.price.currentPrice.toFixed(7))
                        : "N/A"}
                    </div>
                    <div
                      className={`text-base sm:text-lg font-sans truncate ${
                        tokenData.price.priceChange24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {tokenData.price.priceChange24h >= 0 ? "+" : ""}
                      {tokenData.price.priceChange24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Price Chart */}
            <div
              className={`${
                isMobile ? "bg-bg-main" : "bg-bg-main border border-gray-700"
              } ${isMobile ? "p-0" : "p-2"}`}
            >
              {!isMobile && (
                <div className="mb-2">INTRADAY CHART</div>
              )}
              <TradingViewChart
                tokenSymbol={tokenData.symbol}
                tokenAddress={tokenAddress}
                tokenSupply={tokenData.totalSupply}
                chain={chainId}
                height={isMobile ? 458 : 500}
                isMobile={isMobile}
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
                          className="bg-orange-400 w-full rounded-t"
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

            {/* Mobile Content Under Chart */}
            {isMobile && (
              <div className="bg-bg-main space-y-3 p-2">
                {/* Horizontally Scrolling Metric Bubbles */}
                <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
                  <div className="flex space-x-2 min-w-max">
                    {/* Vol 24h */}
                    <div className="bg-bg-card rounded-lg p-3 min-w-[100px] flex-shrink-0 text-center">
                      <div className="text-gray-400 text-xs mb-1">Vol 24h</div>
                      <div className="text-[#FAFAFA] font-sans text-sm">
                        ${formatNumber(tokenData.price.totalVolume || 0)}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="bg-bg-card rounded-lg p-3 min-w-[100px] flex-shrink-0 text-center">
                      <div className="text-gray-400 text-xs mb-1">Price</div>
                      <div className="text-[#FAFAFA] font-sans text-sm">
                        $
                        {tokenData.price.currentPrice
                          ? parseFloat(tokenData.price.currentPrice.toFixed(7))
                          : "0.00"}
                      </div>
                    </div>

                    {/* 5m */}
                    <div className="bg-bg-card rounded-lg p-3 min-w-[100px] flex-shrink-0 text-center">
                      <div className="text-gray-400 text-xs mb-1">5m</div>
                      <div
                        className={`font-sans text-sm ${
                          (tokenData.price.priceChange5m || 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {(tokenData.price.priceChange5m || 0) >= 0 ? "+" : ""}
                        {(tokenData.price.priceChange5m || 0).toFixed(2)}%
                      </div>
                    </div>

                    {/* 1h */}
                    <div className="bg-bg-card rounded-lg p-3 min-w-[100px] flex-shrink-0 text-center">
                      <div className="text-gray-400 text-xs mb-1">1h</div>
                      <div
                        className={`font-sans text-sm ${
                          (tokenData.price.priceChange1h || 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {(tokenData.price.priceChange1h || 0) >= 0 ? "+" : ""}
                        {(tokenData.price.priceChange1h || 0).toFixed(2)}%
                      </div>
                    </div>

                    {/* 24h */}
                    <div className="bg-bg-card rounded-lg p-3 min-w-[100px] flex-shrink-0 text-center">
                      <div className="text-gray-400 text-xs mb-1">24h</div>
                      <div
                        className={`font-sans text-sm ${
                          (tokenData.price.priceChange24h || 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {(tokenData.price.priceChange24h || 0) >= 0 ? "+" : ""}
                        {(tokenData.price.priceChange24h || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bonding Curve Progress */}
                <div className="bg-bg-main">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[#FAFAFA] font-bold text-sm">
                      Bonding Curve Progress
                    </div>
                    <div className="text-[#FAFAFA] text-sm">
                      {tokenData?.isGraduated || tokenData?.uniswapPair
                        ? "100.0%"
                        : `${
                            (
                              tokenData?.bondingCurve?.progress ??
                              tokenData?.progress ??
                              0
                            ).toFixed(1)
                          }%`}
                    </div>
                  </div>
                  <div className="w-full bg-bg-card h-2 rounded-full overflow-hidden">
                    <div
                      className={`progress-bar-glow h-2 rounded-full transition-all duration-300 ${
                        tokenData?.isGraduated || tokenData?.uniswapPair
                          ? "!bg-green-500"
                          : "!bg-yellow-400"
                      }`}
                      style={{
                        width: `${
                          tokenData?.isGraduated || tokenData?.uniswapPair
                            ? 100
                            : Math.min(
                                100,
                                Math.max(
                                  0,
                                  tokenData?.bondingCurve?.progress ??
                                    tokenData?.progress ??
                                    0
                                )
                              )
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                {tokenData?.description && (
                  <div className="text-gray-300 text-sm leading-relaxed">
                    {tokenData.description}
                  </div>
                )}

                {/* Social Links in 3 Rows */}
                <div className="space-y-2">
                  {/* Row 1: Telegram */}
                  {tokenData?.telegramUrl && (
                    <a
                      href={tokenData.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 bg-bg-card rounded-lg p-3 hover:bg-bg-card-hover transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-[#FAFAFA]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M23.1117 4.49449C23.4296 2.94472 21.9074 1.65683 20.4317 2.227L2.3425 9.21601C0.694517 9.85273 0.621087 12.1572 2.22518 12.8975L6.1645 14.7157L8.03849 21.2746C8.13583 21.6153 8.40618 21.8791 8.74917 21.968C9.09216 22.0568 9.45658 21.9576 9.70712 21.707L12.5938 18.8203L16.6375 21.8531C17.8113 22.7334 19.5019 22.0922 19.7967 20.6549L23.1117 4.49449ZM3.0633 11.0816L21.1525 4.0926L17.8375 20.2531L13.1 16.6999C12.7019 16.4013 12.1448 16.4409 11.7929 16.7928L10.5565 18.0292L10.928 15.9861L18.2071 8.70703C18.5614 8.35278 18.5988 7.79106 18.2947 7.39293C17.9906 6.99479 17.4389 6.88312 17.0039 7.13168L6.95124 12.876L3.0633 11.0816ZM8.17695 14.4791L8.78333 16.6015L9.01614 15.321C9.05253 15.1209 9.14908 14.9366 9.29291 14.7928L11.5128 12.573L8.17695 14.4791Z"
                        />
                      </svg>
                      <span className="text-[#FAFAFA] text-sm">
                        {tokenData.telegramUrl
                          .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//, "")
                          .replace(/\/$/, "")}
                      </span>
                    </a>
                  )}

                  {/* Row 2: Twitter/X */}
                  {tokenData?.twitterUrl && (
                    <a
                      href={tokenData.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 bg-bg-card rounded-lg p-3 hover:bg-bg-card-hover transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-[#FAFAFA]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="text-[#FAFAFA] text-sm">
                        {tokenData.twitterUrl
                          .replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com)\//, "")
                          .replace(/^@/, "")
                          .replace(/\/$/, "")
                          .split("/")[0]}
                      </span>
                    </a>
                  )}

                  {/* Row 3: Website */}
                  {tokenData?.websiteUrl && (
                    <a
                      href={tokenData.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 bg-bg-card rounded-lg p-3 hover:bg-bg-card-hover transition-colors"
                    >
                      <Globe className="w-5 h-5 text-[#FAFAFA]" />
                      <span className="text-[#FAFAFA] text-sm">
                        {tokenData.websiteUrl
                          .replace(/^https?:\/\/(www\.)?/, "")
                          .replace(/\/$/, "")
                          .split("/")[0]}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Financial Metrics - Hidden on Mobile */}
            {!isMobile && (
              <div className="bg-bg-main border border-gray-700 p-2">
                <div className="text-orange-400 mb-2">FINANCIAL METRICS</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs">
                  <div className="bg-bg-main border border-black p-2">
                    <div className="text-gray-400">MARKET CAP</div>
                    <div className="text-[#FAFAFA] font-sans text-sm">
                      {formatNumber(
                        tokenData.price.currentPrice * 1_000_000_000
                      )}
                    </div>
                  </div>
                  <div className="bg-bg-main border border-black p-2">
                    <div className="text-gray-400">LIQUIDITY</div>
                    <div className="text-[#FAFAFA] font-sans text-sm">
                      {getLiquidityWeth(tokenData)} WETH
                    </div>
                  </div>
                  <div className="bg-bg-main border border-black p-2">
                    <div className="text-gray-400">FDV</div>
                    <div className="text-[#FAFAFA] font-sans text-sm">
                      {formatNumber(
                        tokenData.price.currentPrice * 1_000_000_000
                      )}
                    </div>
                  </div>
                  <div className="bg-bg-main border border-black p-2">
                    <div className="text-gray-400">PRICE (USD)</div>
                    <div className="text-[#FAFAFA] font-sans text-sm">
                      $
                      {tokenData.price.currentPrice
                        ? parseFloat(tokenData.price.currentPrice.toFixed(7))
                        : "N/A"}
                    </div>
                  </div>
                  <div className="bg-bg-main border border-black p-2">
                    <div className="text-gray-400">HOLDERS</div>
                    <div className="text-[#FAFAFA] font-sans text-sm">
                      {holdersCount > 0 ? holdersCount : "Loading..."}
                    </div>
                  </div>
                  <div className="bg-bg-main border border-black p-2">
                    <div className="text-gray-400">VOLUME</div>
                    <div className="text-[#FAFAFA] font-sans text-sm">
                      {formatNumber(tokenData.price.totalVolume)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Company Info - Hidden on Mobile (shown in INFO tab instead) */}
            {!isMobile && (
              <div className="bg-bg-main border border-gray-700 p-2">
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
                    <span className="text-[#FAFAFA]">
                      {tokenData?.deploymentTimestamp
                        ? formatTokenAge(tokenData.deploymentTimestamp)
                        : "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User
                      className={`w-3 h-3 ${
                        tokenData?.deployer
                          ? "text-orange-400"
                          : "text-gray-600"
                      }`}
                    />
                    <span className="text-gray-400">Deployer</span>
                    {tokenData?.deployer ? (
                      <button
                        onClick={() =>
                          navigate(`/profile/${tokenData.deployer.address}`)
                        }
                        className="flex items-center space-x-2 text-orange-400 hover:text-orange-400 transition-colors"
                      >
                        {tokenData.deployer.pfp && (
                          <img
                            src={tokenData.deployer.pfp}
                            alt={`${
                              tokenData.deployer.username ||
                              tokenData.deployer.address
                            } profile`}
                            className="w-4 h-4 rounded object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        )}
                        <span className="truncate max-w-32">
                          {tokenData.deployer.username ||
                            abbreviateAddress(tokenData.deployer.address)}
                        </span>
                      </button>
                    ) : (
                      <span className="text-gray-600">Unknown</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="w-3 h-3 text-orange-400" />
                    <span className="text-gray-400">Website</span>
                    {tokenData?.websiteUrl ? (
                      <a
                        href={tokenData.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-400 transition-colors flex items-center space-x-1"
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
                      className="w-3 h-3 text-orange-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="text-gray-400">X</span>
                    {tokenData?.twitterUrl ? (
                      <a
                        href={tokenData.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-400 transition-colors flex items-center space-x-1"
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
                      className="w-3 h-3 text-orange-400"
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
                        className="text-orange-400 hover:text-orange-400 transition-colors flex items-center space-x-1"
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
                {tokenData?.description && (
                  <div className="border-t border-orange-500/30 pt-2 mt-2">
                    <div className="text-orange-400 mb-1">
                      COMPANY DESCRIPTION
                    </div>
                    <div className="text-gray-300 text-xs leading-relaxed">
                      {tokenData.description}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Trading */}
          <div className="col-span-12 lg:col-span-4 space-y-1">
            {/* Desktop: Show TradingForm inline */}
            {!isMobile && (
              <TradingForm
                chain={tokenData?.chain}
                symbol={tokenData?.symbol}
                tokenAddress={tokenData?.tokenAddress}
                onTradeConfirmed={(callback) => {
                  tradeConfirmCallbackRef.current = callback;
                }}
              />
            )}

            {/* Trades / Holders / Comments */}
            <div
              className={`${
                isMobile ? "bg-bg-main" : "bg-bg-main border border-gray-700"
              } p-2`}
            >
              <div className={`flex items-center mb-2 ${isMobile ? "justify-center" : "justify-between"}`}>
                <div className={`flex items-center ${isMobile ? "space-x-8" : "space-x-6"}`}>
                  {isMobile ? (
                    <>
                      <button
                        onClick={() => setActiveTab("comments")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "comments"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Comments({commentsCount})
                        {activeTab === "comments" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("trades")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "trades"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Trades
                        {activeTab === "trades" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("holders")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "holders"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Holders{holdersCount > 0 ? `(${holdersCount})` : ""}
                        {activeTab === "holders" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("info")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "info"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Info
                        {activeTab === "info" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setActiveTab("trades")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "trades"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Trades
                        {activeTab === "trades" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("holders")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "holders"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Holders{holdersCount > 0 ? `(${holdersCount})` : ""}
                        {activeTab === "holders" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("comments")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "comments"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Comments({commentsCount})
                        {activeTab === "comments" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("info")}
                        className={`text-sm font-bold transition-colors relative pb-1 ${
                          activeTab === "info"
                            ? "text-[#FAFAFA]"
                            : "text-gray-400 hover:text-orange-400"
                        }`}
                      >
                        Info
                        {activeTab === "info" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></span>
                        )}
                      </button>
                    </>
                  )}
                </div>
                {activeTab === "trades" && filteredTrader && (
                  <button
                    onClick={() => setFilteredTrader(null)}
                    className="text-xs text-orange-400 hover:text-orange-400 transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              {activeTab === "trades" && isMobile && (
                <div className="mb-3 flex items-center space-x-2">
                  <span className="text-xs text-gray-400">filter by size</span>
                  <button
                    onClick={() => setIsFilterBySizeEnabled(!isFilterBySizeEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isFilterBySizeEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isFilterBySizeEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <input
                    type="text"
                    placeholder="0.05"
                    className="w-16 rounded bg-gray-700 px-2 py-1 text-xs text-[#FAFAFA]"
                    disabled={!isFilterBySizeEnabled}
                  />
                  {isFilterBySizeEnabled && (
                    <span className="text-xs text-gray-400">
                      (showing trades greater than 0.05 {tokenData?.symbol || 'TOKEN'})
                    </span>
                  )}
                </div>
              )}
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
                    className="overflow-y-auto max-h-96 custom-scrollbar"
                  >
                    <table className="w-full text-xs min-w-[400px]">
                      <thead
                        className={`${
                          isMobile ? "bg-bg-main" : "bg-bg-main"
                        } sticky top-0 z-10`}
                      >
                        <tr
                          className={`text-gray-400 ${
                            isMobile ? "" : "border-b border-gray-700"
                          }`}
                        >
                          <th className={`text-left p-1 ${isMobile ? "font-normal" : ""}`}>
                            <div className="flex items-center space-x-1">
                              <span>Trader</span>
                              {filteredTrader && (
                                <Filter className="w-3 h-3 text-orange-400 fill-current" />
                              )}
                            </div>
                          </th>
                          <th className={`text-center p-1 ${isMobile ? "font-normal" : ""}`}>Type</th>
                          <th className={`text-left p-1 pl-4 ${isMobile ? "font-normal" : ""}`}>
                            <div className="flex flex-col leading-tight">
                              <span>Amount</span>
                              <span>{(tokenData?.symbol || "Token")}</span>
                            </div>
                          </th>
                          <th className={`text-left p-1 pl-6 ${isMobile ? "font-normal" : ""}`}>
                            <div className="flex flex-col leading-tight">
                              <span>Amount</span>
                              <span>WETH</span>
                            </div>
                          </th>
                          {!isMobile && <th className="text-right p-1">Time</th>}
                          <th className={`text-center p-1 ${isMobile ? "font-normal" : ""}`}></th>
                        </tr>
                      </thead>
                      <tbody>{tradeRows}</tbody>
                    </table>
                  </div>
                )
              ) : activeTab === "holders" ? (
                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                  <table className="w-full text-xs min-w-[400px]">
                    <thead
                      className={`${
                        isMobile ? "bg-bg-main" : "bg-bg-main"
                      } sticky top-0 z-10`}
                    >
                      <tr
                        className={`text-gray-400 ${
                          isMobile ? "" : "border-b border-gray-700"
                        }`}
                      >
                        <th className={`text-left p-1 pr-2 ${isMobile ? "font-normal" : ""}`} style={{ width: 'auto', maxWidth: '200px' }}>Holder</th>
                        <th className={`text-right p-1 pl-2 ${isMobile ? "font-normal" : ""}`}>Balance</th>
                        <th className={`text-right p-1 ${isMobile ? "font-normal" : ""}`}>Percentage</th>
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
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                              <span>Loading holders...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* Burnt tokens section */}
                          {burntData && (
                            <tr
                              className={`${
                                isMobile ? "" : "border-b border-gray-800"
                              } bg-red-900/20`}
                            >
                              <td className="p-1 pr-2 text-red-400">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🔥</span>
                                  <span className="font-sans text-xs">
                                    0x0000...dEaD
                                  </span>
                                </div>
                              </td>
                              <td className="p-1 pl-2 text-right text-red-400 font-sans">
                                {formatBalance(burntData.balance)}
                              </td>
                              <td className="p-1 text-right text-red-400">
                                {calculatePercentage(burntData.balance)}
                              </td>
                              <td className="p-1 text-center">
                                <a
                                  href={`${getExplorer(
                                    chainId
                                  )}/address/0x000000000000000000000000000000000000dEaD`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-red-300"
                                  title="View on Etherscan"
                                >
                                  <ArrowUpRight className="w-4 h-4 inline" />
                                </a>
                              </td>
                            </tr>
                          )}

                          {/* Uniswap pair section */}
                          {uniswapData && (
                            <tr
                              className={`${
                                isMobile ? "" : "border-b border-gray-800"
                              } bg-blue-900/20`}
                            >
                              <td className="p-1 pr-2 text-blue-400">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🏦</span>
                                  <span className="font-sans text-xs">
                                    UNISWAP
                                  </span>
                                </div>
                              </td>
                              <td className="p-1 pl-2 text-right text-blue-400 font-sans">
                                {formatBalance(uniswapData.balance)}
                              </td>
                              <td className="p-1 text-right text-blue-400">
                                {calculatePercentage(uniswapData.balance)}
                              </td>
                              <td className="p-1 text-center">
                                <a
                                  href={`${getExplorer(chainId)}/address/${
                                    uniswapData.holderAddress
                                  }`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-300"
                                  title="View on Etherscan"
                                >
                                  <ArrowUpRight className="w-4 h-4 inline" />
                                </a>
                              </td>
                            </tr>
                          )}

                          {/* Bonding curve section - only for non-graduated tokens */}
                          {bondingCurveData && (
                            <tr
                              className={`${
                                isMobile ? "" : "border-b border-gray-800"
                              } bg-purple-900/20`}
                            >
                              <td className="p-1 pr-2 text-purple-400">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">🔮</span>
                                  <span className="font-sans text-sm">
                                    BONDING CURVE
                                  </span>
                                </div>
                              </td>
                              <td className="p-1 pl-2 text-right text-purple-400 font-sans">
                                {formatBalance(bondingCurveData.balance)}
                              </td>
                              <td className="p-1 text-right text-purple-400">
                                {calculatePercentage(bondingCurveData.balance)}
                              </td>
                              <td className="p-1 text-center">
                                <a
                                  href={`${getExplorer(chainId)}/address/${
                                    bondingCurveData.holderAddress
                                  }`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-purple-300"
                                  title="View on Etherscan"
                                >
                                  <ArrowUpRight className="w-4 h-4 inline" />
                                </a>
                              </td>
                            </tr>
                          )}

                          {/* Regular holders */}
                          {holdersData.length === 0 && !burntData ? (
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
                                className={
                                  isMobile
                                    ? ""
                                    : "border-b border-gray-800 last:border-0"
                                }
                              >
                                <td className="p-1 pr-2 text-[#FAFAFA]">
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={holder.pfp || "/default-pfp.jpeg"}
                                      alt="Profile"
                                      className="w-6 h-6 rounded"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/default-pfp.jpeg";
                                      }}
                                    />
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/profile/${holder.holderAddress}`
                                        )
                                      }
                                      className="hover:text-orange-400 underline text-left font-sans"
                                    >
                                      {holder.username ||
                                        abbreviateAddress(holder.holderAddress)}
                                    </button>
                                  </div>
                                </td>
                                <td className="p-1 pl-2 text-right text-[#FAFAFA] font-sans">
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
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "comments" ? (
                <div className={isMobile ? "" : "max-h-96 overflow-y-auto custom-scrollbar"}>
                  <CommentsSection
                    tokenAddress={tokenData?.tokenAddress || ""}
                    tokenSymbol={tokenData?.symbol || ""}
                    onCommentsChange={setCommentsCount}
                  />
                </div>
              ) : activeTab === "info" ? (
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  <div className="space-y-3 text-xs p-2">
                    {/* Age */}
                    <div className="flex items-center space-x-2">
                      <Clock
                        className={`w-3 h-3 ${
                          tokenData?.deploymentTimestamp
                            ? "text-orange-400"
                            : "text-gray-600"
                        }`}
                      />
                      <span className="text-gray-400">Age</span>
                      <span className="text-[#FAFAFA]">
                        {tokenData?.deploymentTimestamp
                          ? formatTokenAge(tokenData.deploymentTimestamp)
                          : "Unknown"}
                      </span>
                    </div>

                    {/* Deployer */}
                    <div className="flex items-center space-x-2">
                      <User
                        className={`w-3 h-3 ${
                          tokenData?.deployer
                            ? "text-orange-400"
                            : "text-gray-600"
                        }`}
                      />
                      <span className="text-gray-400">Deployer</span>
                      {tokenData?.deployer ? (
                        <button
                          onClick={() =>
                            navigate(`/profile/${tokenData.deployer.address}`)
                          }
                          className="flex items-center space-x-2 text-orange-400 hover:text-orange-400 transition-colors"
                        >
                          {tokenData.deployer.pfp && (
                            <img
                              src={tokenData.deployer.pfp}
                              alt={`${
                                tokenData.deployer.username ||
                                tokenData.deployer.address
                              } profile`}
                              className="w-4 h-4 rounded object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          )}
                          <span className="truncate max-w-32">
                            {tokenData.deployer.username ||
                              abbreviateAddress(tokenData.deployer.address)}
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-600">Unknown</span>
                      )}
                    </div>

                    {/* Website */}
                    <div className="flex items-center space-x-2">
                      <Globe className="w-3 h-3 text-orange-400" />
                      <span className="text-gray-400">Website</span>
                      {tokenData?.websiteUrl ? (
                        <a
                          href={tokenData.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-400 transition-colors flex items-center space-x-1"
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

                    {/* X */}
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-3 h-3 text-orange-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="text-gray-400">X</span>
                      {tokenData?.twitterUrl ? (
                        <a
                          href={tokenData.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-400 transition-colors flex items-center space-x-1"
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

                    {/* Telegram */}
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-3 h-3 text-orange-400"
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
                          className="text-orange-400 hover:text-orange-400 transition-colors flex items-center space-x-1"
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

                    {/* Uniswap Pair - if graduated */}
                    {tokenData?.uniswapPair && (
                      <div className="flex items-center space-x-2">
                        <img
                          src="/Uniswap_Logo.svg.png"
                          alt="Uniswap"
                          className="w-5 h-5"
                        />
                        <span className="text-gray-400">Uniswap Pair</span>
                        <a
                          href={`${getExplorer(chainId)}/address/${
                            tokenData.uniswapPair
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:text-pink-300 transition-colors flex items-center space-x-1"
                        >
                          <span className="truncate max-w-32">
                            {abbreviateAddress(tokenData.uniswapPair)}
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Description */}
                    {tokenData?.description && (
                      <div
                        className={`pt-3 ${
                          isMobile ? "" : "border-t border-gray-700"
                        }`}
                      >
                        <div className="text-orange-400 mb-2">DESCRIPTION</div>
                        <div className="text-gray-300 leading-relaxed">
                          {tokenData.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Token Logo Modal - Mobile Only */}
      {isMobile && (
        <Dialog open={isLogoModalOpen} onOpenChange={setIsLogoModalOpen}>
          <DialogContent className="max-w-sm mx-auto bg-bg-main border-gray-700">
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
                <div className="w-48 h-48 bg-gradient-to-br from-orange-400 to-red-600 text-[#FAFAFA] font-bold text-4xl flex items-center justify-center shadow-2xl">
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

      {/* Trading Modal - Mobile Only - Slide Up from Bottom */}
      {isMobile && (
        <>
          {/* Backdrop */}
          {isTradingModalOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
              onClick={() => setIsTradingModalOpen(false)}
            />
          )}
          {/* Slide-up Modal - Fixed height, not scrollable, doesn't resize on toggle */}
          <div
            className={`fixed ${isMobile ? 'left-1 right-1' : 'left-0 right-0'} bottom-[calc(48px+env(safe-area-inset-bottom))] bg-bg-main rounded-t-lg z-50 transition-transform duration-300 ease-out h-[38vh] ${
              isTradingModalOpen
                ? "translate-y-0"
                : "translate-y-full"
            }`}
          >
            <div className="h-full flex flex-col">
              {/* Content - Not scrollable, expands to fit */}
              <div className="flex-1 overflow-hidden">
                <TradingForm
                  chain={tokenData?.chain}
                  symbol={tokenData?.symbol}
                  tokenAddress={tokenData?.tokenAddress}
                  initialMode={tradeMode}
                  lockMode={true}
                  formRef={tradingFormRef}
                  onClose={() => setIsTradingModalOpen(false)}
                  onTradeConfirmed={(callback) => {
                    tradeConfirmCallbackRef.current = callback;
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pinned Navigation Bar - Mobile Only */}
      {isMobile && showPinnedNav && tokenData && (
        <div className="fixed top-0 left-1 right-1 bg-bg-main border-b border-gray-700 z-[70] py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Back Arrow */}
            <button
              onClick={() => navigate("/")}
              className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded transition-colors"
              aria-label="Back to main page"
            >
              <ArrowLeft className="w-5 h-5 text-[#FAFAFA]" />
            </button>

            {/* Center: Token Name, Symbol, and Market Cap */}
            <div className="flex-1 min-w-0 flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[#FAFAFA] font-bold text-sm truncate">
                  {tokenData.name && tokenData.name.length > 15
                    ? tokenData.name.slice(0, 15) + "..."
                    : tokenData.name}
                </span>
                <span className="text-gray-400 text-sm">
                  ${tokenData.symbol}
                </span>
              </div>
              <div className="text-gray-400 text-xs">
                MC ${formatNumber(tokenData.price.currentPrice * 1_000_000_000)}
              </div>
            </div>

            {/* Right: Star and Share */}
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  if (!isConnected) {
                    toast({
                      title: "Sign in required",
                      description: "Please sign in to add tokens to your watchlist",
                      variant: "default",
                    });
                    return;
                  }
                  try {
                    await toggleWatchlist(tokenData.tokenAddress, chainId);
                    toast({
                      title: isInWatchlist(tokenData.tokenAddress, chainId)
                        ? "Removed from watchlist"
                        : "Added to watchlist",
                      description: isInWatchlist(tokenData.tokenAddress, chainId)
                        ? `${tokenData.symbol} has been removed from your watchlist`
                        : `${tokenData.symbol} has been added to your watchlist`,
                      variant: "default",
                    });
                  } catch (error) {
                    console.error("Error toggling watchlist:", error);
                    toast({
                      title: "Error",
                      description: "Failed to update watchlist",
                      variant: "destructive",
                    });
                  }
                }}
                className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded transition-colors"
                aria-label={
                  isInWatchlist(tokenData.tokenAddress, chainId)
                    ? "Remove from watchlist"
                    : "Add to watchlist"
                }
              >
                <Star
                  className={`w-5 h-5 ${
                    isInWatchlist(tokenData.tokenAddress, chainId)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-[#FAFAFA]"
                  }`}
                />
              </button>
              <button
                onClick={() => {
                  // Placeholder for share functionality
                  toast({
                    title: "Share",
                    description: "Share functionality coming soon",
                    variant: "default",
                  });
                }}
                className="flex-shrink-0 p-1.5 hover:bg-gray-800 rounded transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5 text-[#FAFAFA]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Trade Button - Mobile Only - Only show when modal is closed */}
      {isMobile && !isSearchModalOpen && !isTradingModalOpen && (
        <div className="fixed left-0 right-0 bottom-[calc(48px+env(safe-area-inset-bottom))] z-[60] py-4 flex justify-center">
          {!isConnected ? (
            /* Not signed in - Show "Log in to trade" */
            <button
              onClick={() => {
                // Open wallet connection modal - this will be handled by AppKit
                // For now, just open the trading modal which will show wallet prompt
                setIsTradingModalOpen(true);
              }}
              className="w-full bg-orange-400 hover:bg-orange-500 text-black font-bold py-4 px-4 transition-all duration-200 rounded"
            >
              Log in to trade
            </button>
          ) : BigInt(userTokenBalance) === 0n ? (
            /* Signed in but no token balance - Show "Buy" */
            <button
              onClick={() => {
                setTradeMode("buy");
                setIsTradingModalOpen(true);
              }}
              className="w-[90%] bg-orange-400 hover:bg-orange-500 text-black font-bold text-lg py-2 px-4 transition-all duration-200 rounded"
            >
              Buy
            </button>
          ) : (
            /* Signed in with token balance - Show "Trade" */
            <button
              onClick={() => {
                // Default to sell mode if user has tokens
                setTradeMode("sell");
                setIsTradingModalOpen(true);
              }}
              className="w-full bg-orange-400 hover:bg-orange-500 text-black font-bold py-4 px-4 transition-all duration-200 rounded"
            >
              Trade
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenPage;
