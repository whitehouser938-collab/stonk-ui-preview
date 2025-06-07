import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

export const network = WalletAdapterNetwork.Mainnet
export const endpoint = clusterApiUrl(network)

export const wallets = [
  new PhantomWalletAdapter({ network }),
  new SolflareWalletAdapter({ network }),
  new CoinbaseWalletAdapter({ network })
] 