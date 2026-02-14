import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Wallet, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/utils/logger";

export function ConnectWallet() {
  const { open } = useAppKit();
  const { isConnected: isEthConnected } = useAppKitAccount({
    namespace: "eip155",
  });
  const { isAuthenticated, signIn, isAuthenticating } = useAuth();

  // If wallet connected but not authenticated, show "Sign In" button
  const handleClick = async () => {
    if (isEthConnected && !isAuthenticated) {
      try {
        logger.info("User clicked manual sign-in button");
        await signIn({ isManual: true });
      } catch (error) {
        logger.error("Manual sign-in failed:", error);
        // Don't show error if user rejected
        if (!(error as Error).message?.includes("rejected")) {
          alert("Sign in failed: " + (error as Error).message);
        }
      }
    } else {
      open();
    }
  };

  const buttonText = isEthConnected
    ? (isAuthenticated ? "Display Connections" : "Sign In")
    : "Connect Wallet";

  const Icon = isEthConnected && !isAuthenticated ? LogIn : Wallet;

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      disabled={isAuthenticating}
      aria-label={buttonText}
      className="flex items-center space-x-2 border-orange-400/30 bg-orange-400/10 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200"
    >
      <Icon className="w-4 h-4" aria-hidden />
      <span className="font-medium">{isAuthenticating ? "Signing..." : buttonText}</span>
    </Button>
  );
}
