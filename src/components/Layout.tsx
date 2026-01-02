import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  BarChart,
  Search,
  TrendingUp,
  Rocket,
  Trophy,
  Menu,
  X,
  LogOut,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectWallet } from "./ConnectWallet";
import { MobileNav } from "./MobileNav";
import SearchBar from "./SearchBar";
import { SearchModal } from "./SearchModal";
import GlobalClock from "./GlobalClock";
import { ProfileDisplay } from "./ProfileDisplay";
import { Button } from "./ui/button";
import { useAppKitAccount } from "@reown/appkit/react";
import { useDisconnect } from "wagmi";

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { disconnect } = useDisconnect();
  const { isConnected } = useAppKitAccount({ namespace: "eip155" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-black/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4">
          {/* Mobile Layout */}
          <div className="md:hidden flex items-center space-x-2 flex-1 min-w-0">
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-2 rounded-md hover:bg-gray-800 flex-shrink-0"
            >
              {isMobileNavOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-sm font-bold text-orange-400 font-mono tracking-tight whitespace-nowrap hover:text-orange-300 transition-colors">
                STONK EXCHANGE
              </h1>
            </Link>

            {/* Mobile: Sliding Time Ticker - between title and search */}
            <div className="flex-1 overflow-hidden relative h-6 min-w-0 flex items-center">
              <div className="absolute whitespace-nowrap animate-scroll-left text-[11px] font-mono text-white">
                <span className="inline-block mx-2">
                  <span className="text-orange-400">NYC</span> {formatTimeMobile("America/New_York")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-400">LON</span> {formatTimeMobile("Europe/London")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-400">TOK</span> {formatTimeMobile("Asia/Tokyo")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-400">SYD</span> {formatTimeMobile("Australia/Sydney")}
                </span>
                {/* Duplicate for seamless loop */}
                <span className="inline-block mx-2">
                  <span className="text-orange-400">NYC</span> {formatTimeMobile("America/New_York")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-400">LON</span> {formatTimeMobile("Europe/London")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-400">TOK</span> {formatTimeMobile("Asia/Tokyo")}
                </span>
                <span className="inline-block mx-2">
                  <span className="text-orange-400">SYD</span> {formatTimeMobile("Australia/Sydney")}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/">
              <h1 className="text-2xl font-bold text-orange-400 font-mono tracking-tight whitespace-nowrap hover:text-orange-300 transition-colors cursor-pointer">
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
                        ? "bg-orange-600/20 text-orange-400 border border-orange-500/30"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium hidden lg:inline">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Mobile Search Icon - Right Side */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="md:hidden p-2 rounded-md hover:bg-gray-800 text-orange-400 flex-shrink-0"
          >
            <Search className="w-5 h-5" />
          </button>
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
        <MobileNav
          isOpen={isMobileNavOpen}
          navItems={navItems}
          location={location}
          onClose={() => setIsMobileNavOpen(false)}
        />
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
      <main className="p-0 sm:p-6">{children}</main>
    </div>
  );
}
