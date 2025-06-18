import { useAppKitProvider } from "@reown/appkit/react";
import { BrowserProvider } from "ethers";
import type { Provider } from "@reown/appkit/react";

export const useETHWalletSigner = () => {
  const { walletProvider } = useAppKitProvider<Provider>("eip155");

  const getETHSigner = async () => {
    const ethersProvider = new BrowserProvider(walletProvider);
    return await ethersProvider.getSigner();
  };

  return { getETHSigner };
};

export const useSOLWalletSigner = () => {
  const { walletProvider } = useAppKitProvider<Provider>("solana");

  const getSOLSigner = async () => {
    // For Solana, we typically use the wallet provider directly
    return walletProvider;
  };

  return { getSOLSigner };
};
