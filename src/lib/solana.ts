import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

export const network = WalletAdapterNetwork.Mainnet
export const endpoint = clusterApiUrl(network)

// Initialize wallets with network configuration
export const wallets = [
  new PhantomWalletAdapter({ network }),
  new SolflareWalletAdapter({ network })
] 