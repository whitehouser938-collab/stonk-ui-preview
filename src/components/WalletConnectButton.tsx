import React from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const WalletConnectButton: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { user, login, logout } = useUser();
  const { toast } = useToast();

  // Auto-login when wallet connects
  React.useEffect(() => {
    if (isConnected && address && !user) {
      login(address);
    } else if (!isConnected && user) {
      logout();
    }
  }, [isConnected, address, user, login, logout]);

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-400">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(address);
                toast({
                  title: "Address Copied",
                  description: "Wallet address copied to clipboard",
                  variant: "default",
                });
              } catch (error) {
                console.error("Failed to copy address:", error);
                toast({
                  title: "Copy Failed",
                  description: "Failed to copy address to clipboard",
                  variant: "destructive",
                });
              }
            }}
            className="text-gray-400 hover:text-orange-400 transition-colors"
            title="Copy wallet address"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
        <Button onClick={() => disconnect()} variant="outline" size="sm">
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          variant="default"
          size="sm"
        >
          Connect {connector.name}
        </Button>
      ))}
    </div>
  );
};
