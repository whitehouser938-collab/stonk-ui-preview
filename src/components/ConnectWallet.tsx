import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function ConnectWallet() {
  const { open } = useAppKit();
  const { isConnected: isEthConnected } = useAppKitAccount({
    namespace: "eip155",
  });

  const buttonText = isEthConnected ? "Display Connections" : "Connect Wallet";

  return (
    <Button
      onClick={() => open()}
      variant="outline"
      className="flex items-center space-x-2 border-orange-500/30 bg-orange-600/10 text-orange-400 hover:text-orange-200 hover:bg-orange-800/10 hover:border-orange-300/50 transition-all duration-200"
    >
      <Wallet className="w-4 h-4" />
      <span className="font-medium">{buttonText}</span>
    </Button>
  );
}
