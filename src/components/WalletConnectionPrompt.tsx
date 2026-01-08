import { useAppKit } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, AlertCircle } from "lucide-react";

interface WalletConnectionPromptProps {
  title?: string;
  description?: string;
  actionText?: string;
  variant?: "default" | "compact" | "minimal";
  className?: string;
}

export function WalletConnectionPrompt({
  title = "Sign In",
  description = "Sign in to access this feature",
  actionText = "Sign In",
  variant = "default",
  className = "",
}: WalletConnectionPromptProps) {
  const { open } = useAppKit();

  if (variant === "minimal") {
    return (
      <div className={`text-center py-4 ${className}`}>
        <Wallet className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-400 text-sm mb-3">{description}</p>
        <Button
          onClick={() => open()}
          variant="outline"
          size="sm"
          className="border-orange-500/30 bg-orange-500/10 text-orange-500 hover:text-orange-300 hover:bg-orange-600/10 hover:border-orange-400/50"
        >
          {actionText}
        </Button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <Wallet className="w-6 h-6 text-orange-500" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-200">{title}</h3>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
          <Button
            onClick={() => open()}
            variant="outline"
            size="sm"
            className="border-orange-500/30 bg-orange-500/10 text-orange-500 hover:text-orange-300 hover:bg-orange-600/10 hover:border-orange-400/50"
          >
            {actionText}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-orange-500" />
        </div>
        <CardTitle className="text-xl text-gray-200">{title}</CardTitle>
        <CardDescription className="text-gray-400">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button
          onClick={() => open()}
          variant="outline"
          size="lg"
          className="border-orange-500/30 bg-orange-500/10 text-orange-500 hover:text-orange-300 hover:bg-orange-600/10 hover:border-orange-400/50 transition-all duration-200"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {actionText}
        </Button>
      </CardContent>
    </Card>
  );
}

export function WalletRequiredAlert({
  message = "Please connect your wallet to continue",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center space-x-2 text-red-400 text-sm ${className}`}
    >
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}
