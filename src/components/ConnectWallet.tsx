import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, Check, ChevronLeft } from 'lucide-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { useState } from 'react';

type MenuView = 'main' | 'ethereum' | 'solana';

export function ConnectWallet() {
  const [menuView, setMenuView] = useState<MenuView>('main');

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

  const handleDisconnect = (chain: 'ethereum' | 'solana') => {
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

  const renderMainMenu = () => (
    <>
      <DropdownMenuLabel className="text-gray-200 text-base font-semibold">
        Chains
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-gray-700" />
      <DropdownMenuItem
        onSelect={(e) => e.preventDefault()}
        onClick={() => setMenuView('ethereum')}
        className="cursor-pointer !text-gray-400 hover:!bg-orange-700/10 hover:!text-gray-100 flex items-center justify-between p-3"
      >
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isEthConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium pr-2">Ethereum</span>
        </div>
        <div className="text-sm text-gray-400">
          {isEthConnected ? getEthAddress() : 'Not connected'}
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(e) => e.preventDefault()}
        onClick={() => setMenuView('solana')}
        className="cursor-pointer !text-gray-400 hover:!bg-purple-700/10 hover:!text-gray-100 flex items-center justify-between p-3"
      >
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isSolConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium pr-2">Solana</span>
        </div>
        <div className="text-sm text-gray-400">
          {isSolConnected ? getSolanaAddress() : 'Not connected'}
        </div>
      </DropdownMenuItem>
    </>
  );

  const renderBackMenuItem = (title: string) => (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setMenuView('main')} className="cursor-pointer hover:!bg-gray-700/10">
      <div className="flex items-center space-x-2 text-gray-400">
        <ChevronLeft className="w-4 h-4" />
        <span>{title}</span>
      </div>
    </DropdownMenuItem>
  );

  const renderEthereumMenu = () => (
    <>
      {renderBackMenuItem('Ethereum Wallets')}
      <DropdownMenuSeparator className="bg-gray-700" />
      {isEthConnected && (
        <DropdownMenuItem
          onClick={() => handleDisconnect('ethereum')}
          className="cursor-pointer hover:!bg-red-700/10 hover:!text-gray-100 text-red-400"
        >
          Disconnect Ethereum
        </DropdownMenuItem>
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
            {isActive && <Check className="w-4 h-4 text-green-500" />}
          </DropdownMenuItem>
        );
      })}
    </>
  );

  const renderSolanaMenu = () => (
    <>
      {renderBackMenuItem('Solana Wallets')}
      <DropdownMenuSeparator className="bg-gray-700" />
      {isSolConnected && (
        <DropdownMenuItem
          onClick={() => handleDisconnect('solana')}
          className="cursor-pointer hover:!bg-red-700/10 hover:!text-gray-100 text-red-400"
        >
          Disconnect Solana
        </DropdownMenuItem>
      )}
      {wallets
        .filter((wallet) => ['Phantom', 'Solflare', 'Coinbase Wallet'].includes(wallet.adapter.name))
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
              {isActive && <Check className="w-4 h-4 text-green-500" />}
            </DropdownMenuItem>
          );
        })}
    </>
  );

  return (
    <DropdownMenu onOpenChange={(open) => !open && setMenuView('main')}>
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
        {menuView === 'main' && renderMainMenu()}
        {menuView === 'ethereum' && renderEthereumMenu()}
        {menuView === 'solana' && renderSolanaMenu()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 