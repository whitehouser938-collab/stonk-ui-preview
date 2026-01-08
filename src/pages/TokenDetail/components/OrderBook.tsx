import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";

interface Trade {
  id: string;
  type: "buy" | "sell";
  price: number;
  amount: number;
  timestamp: Date;
  txHash: string;
  trader: string;
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface OrderBookProps {
  tokenAddress: string;
  chain: string;
  currentPrice?: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ 
  tokenAddress, 
  chain, 
  currentPrice = 0 
}) => {
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [buyOrders, setBuyOrders] = useState<OrderBookEntry[]>([]);
  const [sellOrders, setSellOrders] = useState<OrderBookEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"trades" | "orderbook">("trades");
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration - replace with actual API calls
  useEffect(() => {
    const fetchTradeData = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock recent trades
      const mockTrades: Trade[] = [
        {
          id: "1",
          type: "buy",
          price: 0.00234,
          amount: 1500,
          timestamp: new Date(Date.now() - 5 * 60000),
          txHash: "0x1234...5678",
          trader: "0xabc...def"
        },
        {
          id: "2", 
          type: "sell",
          price: 0.00231,
          amount: 800,
          timestamp: new Date(Date.now() - 12 * 60000),
          txHash: "0x2345...6789",
          trader: "0xbcd...efa"
        },
        {
          id: "3",
          type: "buy", 
          price: 0.00235,
          amount: 2200,
          timestamp: new Date(Date.now() - 18 * 60000),
          txHash: "0x3456...789a",
          trader: "0xcde...fab"
        },
        {
          id: "4",
          type: "sell",
          price: 0.00229,
          amount: 1200,
          timestamp: new Date(Date.now() - 25 * 60000),
          txHash: "0x4567...89ab",
          trader: "0xdef...abc"
        },
        {
          id: "5",
          type: "buy",
          price: 0.00236,
          amount: 950,
          timestamp: new Date(Date.now() - 32 * 60000),
          txHash: "0x5678...9abc",
          trader: "0xefa...bcd"
        }
      ];

      // Mock order book data
      const mockBuyOrders: OrderBookEntry[] = [
        { price: 0.00233, amount: 1500, total: 1500 },
        { price: 0.00232, amount: 2200, total: 3700 },
        { price: 0.00231, amount: 1800, total: 5500 },
        { price: 0.00230, amount: 3200, total: 8700 },
        { price: 0.00229, amount: 1900, total: 10600 },
      ];

      const mockSellOrders: OrderBookEntry[] = [
        { price: 0.00235, amount: 1200, total: 1200 },
        { price: 0.00236, amount: 1800, total: 3000 },
        { price: 0.00237, amount: 2500, total: 5500 },
        { price: 0.00238, amount: 1600, total: 7100 },
        { price: 0.00239, amount: 2100, total: 9200 },
      ];

      setRecentTrades(mockTrades);
      setBuyOrders(mockBuyOrders);
      setSellOrders(mockSellOrders);
      setIsLoading(false);
    };

    fetchTradeData();
  }, [tokenAddress, chain]);

  const formatPrice = (price: number) => {
    return price.toFixed(8);
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getMaxOrderAmount = () => {
    const maxBuy = Math.max(...buyOrders.map(o => o.total), 0);
    const maxSell = Math.max(...sellOrders.map(o => o.total), 0);
    return Math.max(maxBuy, maxSell);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-white font-bold text-sm">Order Book & Trades</h3>
        </div>
        <div className="p-4 text-center text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Loading trade data...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded">
      {/* Header with tabs */}
      <div className="border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab("trades")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "trades"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            RECENT TRADES
          </button>
          <button
            onClick={() => setActiveTab("orderbook")}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "orderbook"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <DollarSign className="w-3 h-3 inline mr-1" />
            ORDER BOOK
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === "trades" ? (
          <div>
            {/* Trades Header */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-gray-800 text-gray-400 text-xs font-bold border-b border-gray-700">
              <div>TYPE</div>
              <div className="text-right">PRICE</div>
              <div className="text-right">AMOUNT</div>
              <div className="text-right">TIME</div>
            </div>

            {/* Trades List */}
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="grid grid-cols-4 gap-2 p-3 text-xs hover:bg-gray-800 transition-colors border-b border-gray-800"
              >
                <div className="flex items-center space-x-1">
                  {trade.type === "buy" ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 font-bold">BUY</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-red-400" />
                      <span className="text-red-400 font-bold">SELL</span>
                    </>
                  )}
                </div>
                <div className={`text-right font-mono ${
                  trade.type === "buy" ? "text-green-400" : "text-red-400"
                }`}>
                  {formatPrice(trade.price)}
                </div>
                <div className="text-right text-white font-mono">
                  {formatAmount(trade.amount)}
                </div>
                <div className="text-right text-gray-400">
                  {formatTime(trade.timestamp)}
                </div>
              </div>
            ))}

            {/* Trade Details Footer */}
            <div className="p-3 bg-gray-800 text-xs">
              <div className="text-gray-400 mb-2">Recent Trade Details:</div>
              {recentTrades.slice(0, 3).map((trade) => (
                <div key={trade.id} className="flex justify-between text-gray-500 mb-1">
                  <span>Trader: {formatAddress(trade.trader)}</span>
                  <span>Tx: {formatAddress(trade.txHash)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Order Book Header */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-800 text-gray-400 text-xs font-bold border-b border-gray-700">
              <div className="text-right">PRICE</div>
              <div className="text-right">AMOUNT</div>
              <div className="text-right">TOTAL</div>
            </div>

            {/* Sell Orders (Red - Top) */}
            <div className="border-b border-gray-700">
              {sellOrders.reverse().map((order, index) => {
                const percentage = (order.total / getMaxOrderAmount()) * 100;
                return (
                  <div
                    key={`sell-${index}`}
                    className="relative grid grid-cols-3 gap-2 p-2 text-xs hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className="absolute inset-0 bg-red-900 opacity-20"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="relative text-right text-red-400 font-mono">
                      {formatPrice(order.price)}
                    </div>
                    <div className="relative text-right text-white font-mono">
                      {formatAmount(order.amount)}
                    </div>
                    <div className="relative text-right text-gray-400 font-mono">
                      {formatAmount(order.total)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Price Separator */}
            <div className="p-3 bg-gray-800 border-y border-gray-600">
              <div className="text-center">
                <span className="text-orange-500 font-bold text-sm">
                  Current Price: {formatPrice(currentPrice || 0.00234)}
                </span>
              </div>
            </div>

            {/* Buy Orders (Green - Bottom) */}
            <div>
              {buyOrders.map((order, index) => {
                const percentage = (order.total / getMaxOrderAmount()) * 100;
                return (
                  <div
                    key={`buy-${index}`}
                    className="relative grid grid-cols-3 gap-2 p-2 text-xs hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className="absolute inset-0 bg-green-900 opacity-20"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="relative text-right text-green-400 font-mono">
                      {formatPrice(order.price)}
                    </div>
                    <div className="relative text-right text-white font-mono">
                      {formatAmount(order.amount)}
                    </div>
                    <div className="relative text-right text-gray-400 font-mono">
                      {formatAmount(order.total)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Book Stats */}
            <div className="p-3 bg-gray-800 text-xs border-t border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-green-400 font-bold">Total Bids</div>
                  <div className="text-white">
                    {formatAmount(buyOrders.reduce((sum, o) => sum + o.amount, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-red-400 font-bold">Total Asks</div>
                  <div className="text-white">
                    {formatAmount(sellOrders.reduce((sum, o) => sum + o.amount, 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderBook;
