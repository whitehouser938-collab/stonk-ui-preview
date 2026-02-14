import { useState, useEffect, useCallback } from "react";
import { useAppKitProvider } from "@reown/appkit/react";
import { useAppKitAccount } from "@reown/appkit/react";
import { BrowserProvider } from "ethers";
import type { Provider } from "@reown/appkit/react";

export const useETHWalletSigner = () => {
  const { walletProvider } = useAppKitProvider<Provider>("eip155");
  const { isConnected, address } = useAppKitAccount();
  const [isProviderReady, setIsProviderReady] = useState(false);

  // Track when provider is actually available
  useEffect(() => {
    if (isConnected && address && walletProvider) {
      setIsProviderReady(true);
    } else {
      setIsProviderReady(false);
    }
  }, [isConnected, address, walletProvider]);

  const getETHSigner = useCallback(async () => {
    if (!walletProvider) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }
    const ethersProvider = new BrowserProvider(walletProvider);
    return await ethersProvider.getSigner();
  }, [walletProvider]);

  return { getETHSigner, isProviderReady };
};
