import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function ConnectWallet() {
  const { open } = useAppKit();
  const { isConnected: isEthConnected } = useAppKitAccount({
    namespace: "eip155",
  });

  const buttonText = isEthConnected ? "Display Connections" : "Sign In";

  return (
    <Button
      onClick={() => open()}
      variant="outline"
      aria-label={isEthConnected ? "Display wallet connections" : "Sign in with wallet"}
      className="flex items-center space-x-2 border-orange-400/30 bg-orange-400/10 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200"
    >
      <Wallet className="w-4 h-4" aria-hidden />
      <span className="font-medium">{buttonText}</span>
    </Button>
  );
}
