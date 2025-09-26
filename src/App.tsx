import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { UserProvider } from "@/contexts/UserContext";
import Index from "./pages/Index";

//Reown imports
import { createAppKit } from "@reown/appkit/react";
import { sepolia, AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

import Markets from "./pages/Markets";
import Research from "./pages/Research";
import Launchpad from "./pages/Launchpad/Launchpad";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import TokenDetail from "./pages/TokenDetail/TokenDetail";

const queryClient = new QueryClient();
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set");
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

const App = () => (
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Markets />} />
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
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
