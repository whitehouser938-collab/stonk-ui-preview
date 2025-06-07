import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, polygon, arbitrum, base } from 'wagmi/chains'
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'
// import { coinbaseWallet, safe } from 'wagmi/connectors' // if we want to expand connections

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '' // for walletconnect

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, arbitrum, base],
  connectors: [
    // Primary connectors
    metaMask(),
    coinbaseWallet({ appName: 'Stonk Terminal' }),
    walletConnect({ projectId }),
    
    // Fallback
    injected(),

    // Secondary options
    // coinbaseWallet({ appName: 'Stonk Terminal' }),
    // safe(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
} 