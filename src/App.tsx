import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import Index from "./pages/Index";

//Reown imports
import { createAppKit } from "@reown/appkit/react";
import {
  arbitrum,
  mainnet,
  base,
  sepolia,
  AppKitNetwork,
  solana,
  solanaTestnet,
  solanaDevnet,
  polygon,
} from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";

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

const networks = [
  mainnet,
  arbitrum,
  base,
  sepolia,
  polygon,
  solana,
  solanaTestnet,
  solanaDevnet,
] as [AppKitNetwork, ...AppKitNetwork[]];

const solanaWeb3JsAdapter = new SolanaAdapter();
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

const appKit = createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
