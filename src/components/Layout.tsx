import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  BarChart,
  Search,
  TrendingUp,
  Rocket,
  Trophy,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectWallet } from "./ConnectWallet";
import { MobileNav } from "./MobileNav";
import SearchBar from "./SearchBar";
import GlobalClock from "./GlobalClock";
import { ProfileDisplay } from "./ProfileDisplay";
import { Button } from "./ui/button";
import { useAppKitAccount } from "@reown/appkit/react";
import { useDisconnect } from "wagmi";

const navItems = [
  { path: "/", label: "Markets", icon: BarChart },
  { path: "/research", label: "Research", icon: Search },
  { path: "/launchpad", label: "Launchpad", icon: Rocket },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { disconnect } = useDisconnect();
  const { isConnected } = useAppKitAccount({ namespace: "eip155" });

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
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center space-x-2 sm:space-x-8">
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="p-2 rounded-md hover:bg-gray-800"
              >
                {isMobileNavOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-orange-400 font-mono tracking-tight">
              STONK EXCHANGE
            </h1>
            <nav className="hidden md:flex space-x-1">
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
        <GlobalClock />
        {/* Search Bar */}
        <SearchBar />
      </header>

      {/* Main Content */}
      <main className="p-0 sm:p-6">{children}</main>
    </div>
  );
}
