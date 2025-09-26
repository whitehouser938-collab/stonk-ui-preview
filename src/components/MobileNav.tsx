import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ProfileDisplay } from "./ProfileDisplay";
import { Location } from "react-router-dom";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useDisconnect } from "wagmi";
import { useState } from "react";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface MobileNavProps {
  isOpen: boolean;
  navItems: NavItem[];
  location: Location;
  onClose: () => void;
}

export function MobileNav({
  isOpen,
  navItems,
  location,
  onClose,
}: MobileNavProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const { disconnect } = useDisconnect();
  const { isConnected } = useAppKitAccount({ namespace: "eip155" });

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect();
      onClose(); // Close mobile nav after disconnect
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-full md:hidden px-4 sm:px-6 pb-4">
      <nav className="flex flex-col space-y-2 p-4 bg-gray-900 rounded-lg border border-gray-800">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg text-base transition-all duration-200",
                isActive
                  ? "bg-orange-600/20 text-orange-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        <div className="border-t border-gray-700 my-2"></div>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
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
      </nav>
    </div>
  );
}
