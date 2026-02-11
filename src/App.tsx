import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { apiClient } from "@/services/apiClient";
import { useEffect } from "react";
import Index from "./pages/Index";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { env } from "@/utils/env";
import { logger } from "@/utils/logger";

//Reown imports
import { createAppKit } from "@reown/appkit/react";
import { sepolia, AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { injected } from "@wagmi/connectors";

import Markets from "./pages/Markets";
import Research from "./pages/Research";
import Launchpad from "./pages/Launchpad/Launchpad";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import TokenDetail from "./pages/TokenDetail/TokenDetail";
import { SentryTestButton } from "./components/SentryTestButton";

const queryClient = new QueryClient();
const projectId = env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set. Check your environment variables.");
}

const metadata = {
  name: "Stonk Terminal",
  description: "Stonk Terminal",
  url: window.location.origin,
  icons: ["https://stonkterminal.com/favicon.ico"],
};

const networks = [sepolia] as [AppKitNetwork, ...AppKitNetwork[]];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
  connectors: [
    injected(), // Auto-detects MetaMask, Coinbase Wallet, etc.
  ],
});

const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true,
  },
});

/**
 * AppContent – wires up the apiClient auth-error handler.
 *
 * With httpOnly cookies there is no need to pass tokens around in JS.
 * - REST requests: cookies are sent automatically via `credentials: "include"`
 * - WebSocket:     the browser sends cookies with the WS upgrade request
 */
const AppContent = () => {
  useEffect(() => {
    // When the API returns a 401, try to silently refresh the session cookie
    apiClient.setOnAuthError(async () => {
      try {
        const res = await fetch(`${env.VITE_AUTH_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          logger.warn("Session refresh failed during API retry");
        }
      } catch (error) {
        logger.error("Token refresh failed:", error);
      }
    });
  }, []);

  return (
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SentryTestButton />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Markets />} />
            <Route path="/:chainId" element={<Markets />} />
            <Route path="/research" element={<Research />} />
            <Route
              path="/token/:chainId/:tokenAddress"
              element={<TokenDetail />}
            />
            <Route path="/launchpad" element={<Launchpad />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:walletAddress" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </ErrorBoundary>
);

export default App;
