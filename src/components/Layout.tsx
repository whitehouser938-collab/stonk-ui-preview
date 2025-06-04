import { Link, useLocation } from "react-router-dom";
import { BarChart, Search, TrendingUp, Rocket, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-cyan-400 font-mono tracking-tight">
              STONK EXCHANGE
            </h1>
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
                        ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-gray-400">
              <span className="text-gray-500">Server:</span>{" "}
              <span className="text-green-400 font-mono">ONLINE</span>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}