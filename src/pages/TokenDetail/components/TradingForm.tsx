import React, { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitBalance } from "@reown/appkit/react";
import LoadingScreen from "@/components/ui/loading";
import { useLoading } from "@/hooks/use-loading";
import { sellTokenETH } from "../utils/trade-token";
import { useETHWalletSigner } from "@/hooks/signers/useWalletSigner";
import { useToast } from "@/hooks/use-toast";

interface TradingFormProps {
  chain?: string;
  symbol?: string;
  tokenAddress?: string;
}

export interface TokenTradeData {
  chain: string;
  symbol: string;
  tokenAddress: string;
  amount: string;
  currency: string; // Optional currency for the trade
  isBuy: boolean; // true for buy, false for sell
  deadline?: number; // Optional deadline for the trade
  slippage?: number; // Optional minimum amount for the trade
}

const presetAmounts = [0.1, 0.5, 1]; // Preset amounts for quick selection
const slippageOptions = [0.5, 1, 2.5, 5]; // Slippage options in percentage

const TradingForm = (props: TradingFormProps) => {
  const [isBuy, setIsBuy] = useState(true); // "buy" or "sell"
  const [selectedCurrency, setSelectedCurrency] = useState(props.symbol); // Default currency
  const [amount, setAmount] = useState("");
  const [slippagePercent, setSlippagePercent] = useState(1); // Default 1% slippage
  const [customSlippage, setCustomSlippage] = useState(""); // For custom slippage input
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { getETHSigner } = useETHWalletSigner();
  const { toast } = useToast();

  const { isConnected: isEthConnected } = useAppKitAccount({
    namespace: "eip155",
  });
  const { isConnected: isSolConnected } = useAppKitAccount({
    namespace: "solana",
  });

  const isWalletConnected =
    (props.chain === "BASE" && isEthConnected) ||
    (props.chain === "SOL" && isSolConnected); // Check if any wallet is connected

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!isWalletConnected) {
      alert("Please connect your wallet to trade.");
      return;
    }
    startLoading();
    try {
      const tradeData: TokenTradeData = {
        chain: props.chain,
        symbol: props.symbol,
        tokenAddress: props.tokenAddress,
        amount: amount,
        currency: selectedCurrency, // Use the selected currency
        isBuy: isBuy,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // Default deadline of 20 minutes
        slippage: slippagePercent / 100, // Convert percentage to decimal
      };

      if (props.chain === "BASE") {
        // Call the trade function based on the selected action
        let tradeResponse;
        const signer = await getETHSigner();
        if (isBuy) {
          console.log("Submitting buy order:", tradeData);
          tradeResponse = await sellTokenETH(tradeData, signer);
        } else {
          // Call sell function here
          tradeResponse = await sellTokenETH(tradeData, signer);
        }
        if (tradeResponse.success) {
          toast({
            title: "Trade Successful",
            description: `Transaction Hash: ${tradeResponse.transactionHash}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Trade Failed",
            description: "An error occurred while processing the trade.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting trade:", error);
      alert("An error occurred while submitting the trade.");
    } finally {
      stopLoading();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2 bg-gray-900 border border-gray-700 space-y-6 text-gray-400"
    >
      {isLoading && <LoadingScreen />}
      {/* Buy and Sell Buttons */}
      <div className="flex space-x-4">
        {/* Buy Button */}
        <button
          type="button"
          onClick={() => setIsBuy(true)}
          className={`
      w-full p-3 text-sm font-bold transition-all duration-200
      ${
        isBuy
          ? "bg-orange-600 text-black"
          : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
      }
    `}
        >
          Buy
        </button>

        {/* Sell Button */}
        <button
          type="button"
          onClick={() => setIsBuy(false)}
          className={`
      w-full p-3  text-sm font-bold transition-all duration-200
      ${
        !isBuy
          ? "bg-orange-600 text-black"
          : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
      }
    `}
        >
          Sell
        </button>
      </div>
      {/* Currency Selector */}
      <div>
        <label htmlFor="currency" className="block mb-2 text-sm text-gray-500">
          Select Currency
        </label>
        <select
          id="currency"
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="w-full p-3 bg-gray-900 border border-gray-700  text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value={props.symbol}>{props.symbol}</option>
          <option value={props.chain}>{props.chain}</option>
          {/* Add more options as needed */}
        </select>
      </div>

      {/* Slippage Tolerance */}
      <div>
        <label htmlFor="slippage" className="block mb-2 text-sm text-gray-500">
          Slippage Tolerance
        </label>
        <div className="space-y-3">
          {/* Preset Slippage Buttons */}
          <div className="flex space-x-2">
            {slippageOptions.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setSlippagePercent(preset);
                  setCustomSlippage("");
                }}
                className={`px-3 py-2 text-xs font-medium transition-all duration-200 ${
                  slippagePercent === preset && !customSlippage
                    ? "bg-orange-600 text-black"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                }`}
              >
                {preset}%
              </button>
            ))}
            <div className="flex items-center space-x-1">
              <input
                type="number"
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomSlippage(value);
                  if (value && !isNaN(Number(value))) {
                    setSlippagePercent(Number(value));
                  }
                }}
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-400"
                min="0"
                max="50"
                step="0.1"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </div>
          {/* Current Slippage Display */}
          <div className="text-xs text-gray-400">
            Current slippage: <span className="text-orange-400">{slippagePercent}%</span>
            {slippagePercent > 5 && (
              <span className="text-yellow-400 ml-2">⚠️ High slippage warning</span>
            )}
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label htmlFor="amount" className="block mb-2 text-sm text-gray-500">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          placeholder="Enter token amount"
          value={amount}
          required
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 bg-gray-900 border border-gray-700  text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {/* Preset Pills */}
        <div className="flex space-x-2 mt-2">
          <button
            key="reset"
            type="button"
            onClick={() => setAmount("")}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xsm font-medium transition-all duration-200"
          >
            Reset
          </button>

          {presetAmounts.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset.toString())}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xsm font-medium transition-all duration-200"
            >
              {preset} {selectedCurrency}
            </button>
          ))}

          {/* TODO: implement this */}
          <button
            key="max"
            type="button"
            onClick={() => setAmount("")}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xsm font-medium transition-all duration-200"
          >
            Max
          </button>
        </div>
      </div>
      {/* Submit Button */}
      {!isWalletConnected && (
        <div className="text-red-500 text-sm">
          Please connect your wallet to trade.
        </div>
      )}
      <button
        type="submit"
        disabled={!isWalletConnected}
        className={`
    w-full p-3 text-sm font-bold transition-all duration-200
    ${
      isBuy
        ? "bg-green-600 hover:bg-green-700 text-black"
        : "bg-red-600 hover:bg-red-700 text-white"
    }
  `}
      >
        {isBuy ? "Submit Buy Order" : "Submit Sell Order"}
      </button>
    </form>
  );
};

export default TradingForm;
