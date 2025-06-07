import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { MetaMaskSolanaWalletAdapter } from './metamask-solana-adapter'

export const network = WalletAdapterNetwork.Mainnet
export const endpoint = clusterApiUrl(network)

// Main Solana wallets including support for MetaMask native Solana
// Note: MetaMask with native Solana support should be automatically detected
// by the wallet adapter system and appear in the wallet list
export const wallets = [
  new PhantomWalletAdapter({ network }),
  new SolflareWalletAdapter({ network }),
  new CoinbaseWalletAdapter({ network })
] 