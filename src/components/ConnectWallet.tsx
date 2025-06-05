import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, Check } from 'lucide-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { useState } from 'react';

export function ConnectWallet() {
  const [hoveredChain, setHoveredChain] = useState<string | null>(null);

  // Ethereum state
  const { address: ethAddress, isConnected: isEthConnected, connector: activeConnector } = useAccount();
  const { connectors: ethConnectors, connect: ethConnect } = useConnect();
  const { disconnect: ethDisconnect } = useDisconnect();

  // Solana state
  const { 
    publicKey: solAddress,
    connected: isSolConnected,
    disconnect: solDisconnect,
    select: selectWallet,
    wallets,
    wallet: connectedSolanaWallet
  } = useWallet();

  // Helper functions
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  const getSolanaAddress = () => {
    return solAddress ? formatAddress(solAddress.toBase58()) : null;
  };

  const getEthAddress = () => {
    return ethAddress ? formatAddress(ethAddress) : null;
  };

  // Overall connection status
  const hasAnyConnection = isEthConnected || isSolConnected;
  const buttonText = hasAnyConnection ? 'Display Connections' : 'Connect Wallet';

  const handleChainDisconnect = (chain: 'ethereum' | 'solana') => {
    if (chain === 'ethereum') {
      ethDisconnect();
    } else {
      solDisconnect();
    }
  };

  const handleWalletConnect = (chain: 'ethereum' | 'solana', walletId?: string) => {
    if (chain === 'ethereum' && walletId) {
      const connector = ethConnectors.find(c => c.id === walletId);
      if (connector) {
        ethConnect({ connector });
      }
    } else if (chain === 'solana' && walletId) {
      selectWallet(walletId as WalletName);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline"
          className="flex items-center space-x-2 border-orange-500/30 bg-orange-600/10 text-orange-400 hover:text-orange-200 hover:bg-orange-800/10 hover:border-orange-300/50 transition-all duration-200"
        >
          <Wallet className="w-4 h-4" />
          <span className="font-medium">{buttonText}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="w-80 bg-gray-900 border-gray-700 text-gray-400"
      >
        <DropdownMenuLabel className="text-gray-200 text-base font-semibold">
          Chains
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        
        {/* Ethereum Chain */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger 
            className="cursor-pointer !text-gray-400 hover:!bg-orange-700/10 hover:!text-gray-100 flex items-center justify-between p-3"
            onMouseEnter={() => setHoveredChain('ethereum')}
            onMouseLeave={() => setHoveredChain(null)}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isEthConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium pr-2">Ethereum</span>
            </div>
            <div className="text-sm text-gray-400">
              {isEthConnected ? getEthAddress() : 'Not connected'}
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-gray-900 border-gray-700 w-64">
            {isEthConnected && (
              <>
                <DropdownMenuItem
                  onClick={() => handleChainDisconnect('ethereum')}
                  className="cursor-pointer hover:!bg-red-700/10 hover:!text-gray-100 text-red-400"
                >
                  Disconnect Ethereum
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
              </>
            )}
            
            {ethConnectors.map((connector) => {
              const isActive = isEthConnected && activeConnector?.id === connector.id;
              return (
                <DropdownMenuItem
                  key={connector.uid}
                  onClick={() => handleWalletConnect('ethereum', connector.id)}
                  className="cursor-pointer hover:!bg-orange-700/10 hover:!text-gray-100 flex items-center justify-between"
                  disabled={isEthConnected && isActive}
                >
                  <span className="font-medium">{connector.name}</span>
                  {isActive && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Solana Chain */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger 
            className="cursor-pointer !text-gray-400 hover:!bg-purple-700/10 hover:!text-gray-100 flex items-center justify-between p-3"
            onMouseEnter={() => setHoveredChain('solana')}
            onMouseLeave={() => setHoveredChain(null)}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isSolConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium pr-2">Solana</span>
            </div>
            <div className="text-sm text-gray-400">
              {isSolConnected ? getSolanaAddress() : 'Not connected'}
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-gray-900 border-gray-700 w-64">
            {isSolConnected && (
              <>
                <DropdownMenuItem
                  onClick={() => handleChainDisconnect('solana')}
                  className="cursor-pointer hover:!bg-red-700/10 hover:!text-gray-100 text-red-400"
                >
                  Disconnect Solana
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
              </>
            )}
            
            {wallets
              .filter((wallet) => ['Phantom', 'Solflare'].includes(wallet.adapter.name))
              .map((wallet) => {
                const isActive = isSolConnected && connectedSolanaWallet?.adapter.name === wallet.adapter.name;
                return (
                  <DropdownMenuItem
                    key={wallet.adapter.name}
                    onClick={() => handleWalletConnect('solana', wallet.adapter.name)}
                    className="cursor-pointer hover:!bg-purple-700/10 hover:!text-gray-100 flex items-center justify-between"
                    disabled={isSolConnected && isActive}
                  >
                    <span className="font-medium">{wallet.adapter.name}</span>
                    {isActive && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 