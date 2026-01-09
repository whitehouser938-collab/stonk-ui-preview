import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import {
  BarChart,
  Search,
  TrendingUp,
  Rocket,
  Trophy,
  LogOut,
  Star,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectWallet } from "./ConnectWallet";
import SearchBar from "./SearchBar";
import { SearchModal } from "./SearchModal";
import GlobalClock from "./GlobalClock";
import { ProfileDisplay } from "./ProfileDisplay";
import { Button } from "./ui/button";
import { useAppKitAccount } from "@reown/appkit/react";
import { useDisconnect } from "wagmi";
import { isSearchModalOpenAtom } from "@/state/app";

const navItems = [
  { path: "/", label: "Markets", icon: BarChart },
  { path: "/research", label: "Watchlist", icon: Star },
  { path: "/launchpad", label: "Launchpad", icon: Rocket },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isSearchModalOpen, setIsSearchModalOpen] = useAtom(isSearchModalOpenAtom);
  const [disconnecting, setDisconnecting] = useState(false);
  const { disconnect } = useDisconnect();
  const { isConnected } = useAppKitAccount({ namespace: "eip155" });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  
  // Check if we're on a token page
  const isTokenPage = location.pathname.match(/^\/token\/[^/]+\/[^/]+$/);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  // Collapse header text after 2 seconds on mobile
  useEffect(() => {
    const collapseTimer = setTimeout(() => {
      setIsHeaderCollapsed(true);
    }, 2000);
    return () => clearTimeout(collapseTimer);
  }, []);

  const formatTimeMobile = (timezone: string) => {
    return currentTime.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen lg:min-h-screen mobile-viewport-fix bg-bg-main text-gray-100">
      {/* Header */}
      <header className="bg-bg-header/95 backdrop-blur-sm z-40">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4">
          {/* Mobile Layout */}
          <div className="md:hidden flex items-center space-x-2 flex-1 min-w-0">
            {/* Hamburger menu removed - navigation now at bottom */}
            <Link to="/" className={`flex-shrink-0 relative overflow-hidden transition-all duration-1000 ease-in-out ${
              isHeaderCollapsed ? 'w-8' : 'w-32'
            }`}>
              <div className="relative h-6 flex items-center">
                <h1 className={`text-sm font-bold text-orange-500 font-mono tracking-tight whitespace-nowrap hover:text-orange-400 transition-all duration-1000 ease-in-out origin-left ${
                  isHeaderCollapsed ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'
                }`}>
                  STONK EXCHANGE
                </h1>
                <h1 className={`text-sm font-bold text-orange-500 font-mono tracking-tight whitespace-nowrap hover:text-orange-400 absolute left-0 transition-all duration-1000 ease-in-out origin-left ${
                  isHeaderCollapsed ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                }`}>
                  SE
                </h1>
              </div>
            </Link>

            {/* Mobile: Sliding Time Ticker - between title and search */}
            <div className={`overflow-hidden relative h-6 min-w-0 flex items-center transition-all duration-1000 ease-in-out ${
              isHeaderCollapsed ? 'flex-[2.5]' : 'flex-1'
            }`}>
              <div className="absolute whitespace-nowrap animate-scroll-left text-[11px] font-mono text-white">
                <span className="inline-block mx-2">
                  <span className="text-orange-500">NYC</span> {formatTimeMobile("America/New_York")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-500">LON</span> {formatTimeMobile("Europe/London")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-500">TOK</span> {formatTimeMobile("Asia/Tokyo")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-500">SYD</span> {formatTimeMobile("Australia/Sydney")}
                </span>
                {/* Duplicate for seamless loop */}
                <span className="inline-block mx-2">
                  <span className="text-orange-500">NYC</span> {formatTimeMobile("America/New_York")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-500">LON</span> {formatTimeMobile("Europe/London")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-500">TOK</span> {formatTimeMobile("Asia/Tokyo")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-500">SYD</span> {formatTimeMobile("Australia/Sydney")}
                </span>
              </div>
              {/* Search icon - only on token pages */}
              {isTokenPage && (
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="absolute right-0 top-0 h-6 w-6 flex items-center justify-center z-10 bg-bg-header/80 hover:bg-bg-header transition-colors rounded"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 text-orange-500 hover:text-orange-400 transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/">
              <h1 className="text-2xl font-bold text-orange-500 font-mono tracking-tight whitespace-nowrap hover:text-orange-400 transition-colors cursor-pointer">
                STONK EXCHANGE
              </h1>
            </Link>
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all duration-200",
                      isActive
                        ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium hidden lg:inline font-mono">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-4 text-sm">
            <ProfileDisplay />
            {isConnected && (
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {/* MobileNav removed - navigation now at bottom on mobile */}
        {/* Desktop: Show GlobalClock below header */}
        <div className="hidden md:block">
          <GlobalClock />
        </div>
        {/* Search Bar - Desktop Only */}
        <div className="hidden md:block">
          <SearchBar />
        </div>
      </header>

      {/* Search Modal - Mobile Only */}
      <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />

      {/* Main Content */}
      <main className="p-0 sm:p-6 pb-24 lg:pb-6">{children}</main>

      {/* Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-footer p-2.5 z-30 lg:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around gap-1">
          <Link
            to="/"
            className={`flex items-center justify-center flex-1 py-1.5 px-1 rounded transition-all duration-200 ${
              location.pathname === "/" || location.pathname.match(/^\/[A-Z]+$/)
                ? "text-orange-500"
                : "text-gray-400"
            }`}
          >
            <BarChart className="w-5 h-5" />
          </Link>
          <Link
            to="/research"
            className={`flex items-center justify-center flex-1 py-1.5 px-1 rounded transition-all duration-200 ${
              location.pathname === "/research"
                ? "text-orange-500"
                : "text-gray-400"
            }`}
          >
            <Star className="w-5 h-5" />
          </Link>
          <Link
            to="/launchpad"
            className={`flex items-center justify-center flex-1 py-1.5 px-1 rounded transition-all duration-200 ${
              location.pathname === "/launchpad"
                ? "text-orange-500"
                : "text-gray-400"
            }`}
          >
            <Rocket className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center justify-center flex-1 py-1.5 px-1 rounded transition-all duration-200 text-gray-400"
          >
            <Search className="w-5 h-5" />
          </button>
          <Link
            to="/profile"
            className={`flex items-center justify-center flex-1 py-1.5 px-1 rounded transition-all duration-200 ${
              location.pathname === "/profile" || location.pathname.startsWith("/profile/")
                ? "text-orange-500"
                : "text-gray-400"
            }`}
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
