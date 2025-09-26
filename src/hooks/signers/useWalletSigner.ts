import { useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider } from "ethers";
import type { Provider } from "@reown/appkit/react";

export const useETHWalletSigner = () => {
  const { walletProvider } = useAppKitProvider<Provider>("eip155");

  const getETHSigner = async () => {
    if (!walletProvider) {
      throw new Error(
        "Wallet not connected. Please connect your wallet first."
      );
    }
    const ethersProvider = new BrowserProvider(walletProvider);
    return await ethersProvider.getSigner();
  };

  return { getETHSigner };
};
