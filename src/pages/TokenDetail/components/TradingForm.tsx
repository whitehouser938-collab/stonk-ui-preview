import React, { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitBalance } from "@reown/appkit/react";
import LoadingScreen from "@/components/ui/loading";
import { useLoading } from "@/hooks/use-loading";
import { sellTokenETH, buyTokenETH } from "../utils/trade-token";
import { useETHWalletSigner } from "@/hooks/signers/useWalletSigner";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ethers } from "ethers";
import {
  WalletConnectionPrompt,
  WalletRequiredAlert,
} from "@/components/WalletConnectionPrompt";
import { X } from "lucide-react";
// Direct contract calls using signed-in user's provider

const MaxUint256 = ethers.MaxUint256;

interface TradingFormProps {
  chain?: string;
  symbol?: string;
  tokenAddress?: string;
  initialMode?: 'buy' | 'sell';
  lockMode?: boolean;
  onTradeConfirmed?: (
    callback: (txHash: string, tradeType: "BUY" | "SELL") => void
  ) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onClose?: () => void;
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
  decimals?: number; // Token decimals
}

const presetAmounts = [0.1, 0.25, 0.5, 1]; // Preset amounts for quick selection
const slippageOptions = [0.5, 1, 2.5, 5]; // Slippage options in percentage

const EVILWETH_ADDRESS = import.meta.env.VITE_EVILWETH_ADDRESS;
const ROUTER_ADDRESS = import.meta.env.VITE_EVM_ROUTER_ADDRESS;

// Utility function to robustly detect user rejection errors
function isUserRejectedError(error: any): boolean {
  const patterns = [
    "user rejected",
    "User rejected",
    "MetaMask Tx Signature: User denied",
    "User denied",
    "rejected",
    "cancelled",
    "Cancelled",
  ];
  const codeMatches = error?.code === "ACTION_REJECTED" || error?.code === 4001;
  if (codeMatches) return true;
  // Recursively check all string properties
  function check(obj: any): boolean {
    if (!obj) return false;
    if (typeof obj === "string") {
      return patterns.some((p) => obj.includes(p));
    }
    if (typeof obj === "object") {
      return Object.values(obj).some(check);
    }
    return false;
  }
  return check(error);
}

// RPC provider removed - now using API calls

// Add abbreviateTokenAmount utility
function abbreviateTokenAmount(raw: string | number, decimals = 18): string {
  try {
    // Use ethers to properly handle BigInt values
    const value = parseFloat(ethers.formatUnits(raw, decimals));

    // Round to nearest integer for threshold checks
    const rounded = Math.round(value);
    if (rounded >= 1e9) return (value / 1e9).toFixed(2) + "B";
    if (rounded >= 1e6) return (value / 1e6).toFixed(2) + "M";
    if (rounded >= 1e3) return (value / 1e3).toFixed(2) + "k";
    if (value >= 1) return value.toFixed(2);
    if (value > 0) return value.toPrecision(2);
    return "0";
  } catch (error) {
    console.error("Error formatting token amount:", error);
    return "0";
  }
}

function abbreviateHash(transactionHash: string): string {
  try {
    if (!transactionHash || transactionHash.length <= 16)
      return transactionHash || "";
    const prefix = transactionHash.slice(0, 10);
    const suffix = transactionHash.slice(-6);
    return `${prefix}…${suffix}`;
  } catch {
    return transactionHash || "";
  }
}

const TradingForm = (props: TradingFormProps) => {
  const isMobile = useIsMobile();
  const [isBuy, setIsBuy] = useState(props.initialMode === 'sell' ? false : true); // "buy" or "sell"
  const [paymentMethod, setPaymentMethod] = useState<"ETH" | "WETH">("ETH"); // Payment method for buy
  const [amount, setAmount] = useState("");
  const [slippagePercent, setSlippagePercent] = useState(1); // Default 1% slippage
  const [customSlippage, setCustomSlippage] = useState(""); // For custom slippage input
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { getETHSigner, isProviderReady } = useETHWalletSigner();
  const getETHSignerRef = React.useRef(getETHSigner);
  React.useEffect(() => {
    getETHSignerRef.current = getETHSigner;
  }, [getETHSigner]);

  // Update isBuy when initialMode prop changes
  React.useEffect(() => {
    setIsBuy(props.initialMode === 'sell' ? false : true);
  }, [props.initialMode]);
  const { toast } = useToast();
  const { isConnected: isEthConnected, address: userAddress } =
    useAppKitAccount({ namespace: "eip155" });

  const [evilWETHBalance, setEvilWETHBalance] = useState("0");
  const [ethBalance, setEthBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isApproving, setIsApproving] = useState(false);
  const [wethAllowance, setWethAllowance] = useState("0");
  const [tokenAllowance, setTokenAllowance] = useState("0"); // Still needed for display
  const [tokenDecimals, setTokenDecimals] = useState(18); // Default to 18 decimals
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null); // Track pending tx
  const [pendingTradeType, setPendingTradeType] = useState<
    "BUY" | "SELL" | null
  >(null); // Track pending trade type

  // Use ref to store latest values without causing re-registration
  const pendingTxRef = React.useRef<{
    hash: string;
    type: "BUY" | "SELL";
  } | null>(null);
  React.useEffect(() => {
    if (pendingTxHash && pendingTradeType) {
      pendingTxRef.current = { hash: pendingTxHash, type: pendingTradeType };
    } else {
      pendingTxRef.current = null;
    }
  }, [pendingTxHash, pendingTradeType]);

  // Fetch balances (debounced to avoid RPC rate limits)
  const lastBalanceFetchRef = React.useRef<number>(0);
  const balanceFetchInFlightRef = React.useRef<boolean>(false);
  const fetchBalancesNow = React.useCallback(async () => {
    if (!isEthConnected || !userAddress || !props.tokenAddress || !isProviderReady) return;
    if (balanceFetchInFlightRef.current) return;
    balanceFetchInFlightRef.current = true;
    try {
      // Get signer for direct contract calls
      const signer = await getETHSigner();

      // Create contracts for direct calls
      const token = new ethers.Contract(
        props.tokenAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function allowance(address,address) view returns (uint256)",
          "function decimals() view returns (uint8)",
        ],
        signer
      );

      const evilWETH = new ethers.Contract(
        EVILWETH_ADDRESS,
        [
          "function balanceOf(address) view returns (uint256)",
          "function allowance(address,address) view returns (uint256)",
        ],
        signer
      );

      // Fetch all balances in parallel using direct calls
      const [
        tokenBalance,
        ethBalance,
        evilWETHBalance,
        tokenAllowance,
        wethAllowance,
        decimals,
      ] = await Promise.all([
        token.balanceOf(userAddress),
        signer.provider.getBalance(userAddress),
        evilWETH.balanceOf(userAddress),
        token.allowance(userAddress, ROUTER_ADDRESS),
        evilWETH.allowance(userAddress, ROUTER_ADDRESS),
        token.decimals(),
      ]);

      // Update state with direct call results
      setTokenBalance(tokenBalance.toString());
      setEthBalance(ethBalance.toString());
      setEvilWETHBalance(evilWETHBalance.toString());
      setTokenAllowance(tokenAllowance.toString());
      setWethAllowance(wethAllowance.toString());
      // Convert decimals to number (it may be a BigInt from contract call)
      setTokenDecimals(Number(decimals));

      lastBalanceFetchRef.current = Date.now();
    } catch (error) {
      console.error("Error fetching balances:", error);
      setEvilWETHBalance("0");
      setEthBalance("0");
      setTokenBalance("0");
      setWethAllowance("0");
      setTokenAllowance("0");
    } finally {
      balanceFetchInFlightRef.current = false;
    }
  }, [isEthConnected, userAddress, props.tokenAddress, isProviderReady]);

  const fetchBalancesDebounced = React.useCallback(() => {
    const now = Date.now();
    const elapsed = now - (lastBalanceFetchRef.current || 0);
    const MIN_INTERVAL_MS = 5000; // at most once per 5s by default
    if (elapsed >= MIN_INTERVAL_MS) {
      void fetchBalancesNow();
    }
  }, [fetchBalancesNow]);

  React.useEffect(() => {
    fetchBalancesDebounced();
  }, [fetchBalancesDebounced, isEthConnected, userAddress, props.tokenAddress]);

  // Timeout for pending transactions - if not confirmed in 60 seconds, clear pending state
  React.useEffect(() => {
    if (!pendingTxHash) return;

    const timeoutId = setTimeout(() => {
      console.log(
        "[TradingForm] Transaction confirmation timeout - clearing pending state"
      );
      toast({
        title: "Transaction Submitted",
        description: `Transaction sent but confirmation is taking longer than expected. Check recent trades or refresh the page.`,
        variant: "default",
      });
      setPendingTxHash(null);
      setPendingTradeType(null);
      void fetchBalancesNow();
    }, 30_000); // 60 second timeout

    return () => clearTimeout(timeoutId);
  }, [pendingTxHash]);

  // Register callback with parent to receive trade confirmations
  React.useEffect(() => {
    if (props.onTradeConfirmed) {
      props.onTradeConfirmed((txHash: string, tradeType: "BUY" | "SELL") => {
        console.log(
          "[TradingForm] Trade confirmed via WebSocket:",
          txHash,
          tradeType
        );
        const pending = pendingTxRef.current;
        if (pending && txHash === pending.hash) {
          // Our pending transaction was confirmed!
          const explorerUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
          const tickerTitle = `${props.symbol ? `$${props.symbol}` : "Token"} ${
            tradeType === "BUY" ? "Buy" : "Sell"
          } Successful`;
          toast({
            title: tickerTitle,
            description: (
              <div>
                <div>Transaction Hash:</div>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {abbreviateHash(txHash)}
                </a>
              </div>
            ),
            variant: tradeType === "BUY" ? "success" : "softDestructive",
          });
          // Refresh balances
          void fetchBalancesNow();
          // Clear pending state
          setPendingTxHash(null);
          setPendingTradeType(null);
        }
      });
    }
  }, [props.onTradeConfirmed, props.symbol, toast, fetchBalancesNow]);

  // Calculate expected token amount for buy (when user enters asset amount)
  const [expectedTokenAmount, setExpectedTokenAmount] = useState("0");
  React.useEffect(() => {
    const calc = async () => {
      if (!isBuy || !amount || !props.tokenAddress) {
        return setExpectedTokenAmount("0");
      }

      // Validate amount is a valid positive number
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return setExpectedTokenAmount("0");
      }

      try {
        // Use direct contract call for price calculation
        const signer = await getETHSigner();
        const router = new ethers.Contract(
          ROUTER_ADDRESS,
          [
            "function calculateBuyPrice(address,uint256) view returns (uint256)",
          ],
          signer
        );

        const assetAmount = ethers.parseEther(amount);
        const tokenAmount = await router.calculateBuyPrice(
          props.tokenAddress,
          assetAmount
        );
        setExpectedTokenAmount(tokenAmount.toString());
      } catch (error) {
        console.error("Error calculating expected token amount:", error);
        setExpectedTokenAmount("0");
      }
    };
    calc();
  }, [isBuy, amount, props.tokenAddress, slippagePercent]);

  // Calculate expected WETH amount for sell (when user enters token amount)
  const [expectedWethAmount, setExpectedWethAmount] = useState("0");
  const [isCalculatingSellConversion, setIsCalculatingSellConversion] =
    useState(false);
  React.useEffect(() => {
    let cancelled = false;

    const calc = async () => {
      if (isBuy || !amount || !props.tokenAddress) {
        setExpectedWethAmount("0");
        return;
      }

      // Validate amount is a valid positive number
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setExpectedWethAmount("0");
        return;
      }

      setIsCalculatingSellConversion(true);
      try {
        // Use signed-in user's provider for direct contract call
        const signer = await getETHSignerRef.current();

        if (cancelled) return; // Don't continue if effect was cancelled

        const router = new ethers.Contract(
          ROUTER_ADDRESS,
          [
            "function calculateSellWithFees(address,uint256) view returns (uint256,uint256,bool)",
          ],
          signer
        );

        // Truncate amount to token decimals to avoid parseUnits error
        // Convert tokenDecimals to number for toFixed() (it may be a BigInt)
        const decimalsNum = Number(tokenDecimals);
        const truncatedAmount = parseFloat(amount).toFixed(decimalsNum);
        const tokenAmount = ethers.parseUnits(truncatedAmount, tokenDecimals);

        console.log("[SELL CONVERSION]", {
          amount,
          truncatedAmount,
          tokenDecimals,
          tokenAmount: tokenAmount.toString(),
        });

        const [assetAmount, fee, isBondingCurve] =
          await router.calculateSellWithFees(props.tokenAddress, tokenAmount);

        if (cancelled) return; // Don't update state if effect was cancelled

        // Calculate net amount after fees (what user actually receives)
        // For graduated tokens (isBondingCurve = false), fee should be 0
        const netAmount = isBondingCurve ? assetAmount - fee : assetAmount;
        setExpectedWethAmount(netAmount.toString());
        console.log("[SELL CONVERSION SUCCESS]", {
          amount,
          netAmount: netAmount.toString(),
          fee: fee.toString(),
          isBondingCurve,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Error calculating expected WETH amount:", error, {
          amount,
          truncatedAmount: parseFloat(amount).toFixed(Number(tokenDecimals)),
          tokenDecimals,
          tokenAddress: props.tokenAddress,
        });
        setExpectedWethAmount("0");
      } finally {
        if (!cancelled) {
          setIsCalculatingSellConversion(false);
        }
      }
    };
    calc();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuy, amount, props.tokenAddress, tokenDecimals]);

  // Note: sellTokenAmount calculation removed - approval is now handled automatically in sellTokens function

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const signer = await getETHSigner();
      const evilWETH = new ethers.Contract(
        EVILWETH_ADDRESS,
        ["function approve(address,uint256) returns (bool)"],
        signer
      );
      const tx = await evilWETH.approve(ROUTER_ADDRESS, MaxUint256);
      await tx.wait();
      toast({
        title: "Approval Successful",
        description: "You can now buy tokens with WETH.",
        variant: "default",
      });
      // Refresh allowance after approval
      await fetchBalancesNow();
      setIsApproving(false);
    } catch (error) {
      // Check if user rejected the transaction
      if (isUserRejectedError(error)) {
        toast({
          title: "Trade Cancelled",
          description: "You rejected the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description: error?.message || JSON.stringify(error),
          variant: "destructive",
        });
      }
      setIsApproving(false);
    }
  };

  // Handle token approval for selling (mirrors WETH approval for buying)
  const handleTokenApprove = async () => {
    setIsApproving(true);
    try {
      const signer = await getETHSigner();
      const token = new ethers.Contract(
        props.tokenAddress!,
        ["function approve(address,uint256) returns (bool)"],
        signer
      );
      // Approve max amount to avoid repeated approvals
      const tx = await token.approve(ROUTER_ADDRESS, MaxUint256);
      await tx.wait();

      // Immediately update allowance state to MaxUint256 (we just approved it)
      // This ensures the UI updates instantly without waiting for RPC
      setTokenAllowance(MaxUint256.toString());

      toast({
        title: "Approval Successful",
        description: `You can now sell ${props.symbol}.`,
        variant: "default",
      });
      setIsApproving(false);

      // Also refresh balances in background (but UI already updated)
      fetchBalancesNow();
    } catch (error) {
      // Check if user rejected the transaction
      if (isUserRejectedError(error)) {
        toast({
          title: "Approval Cancelled",
          description: "You rejected the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Approval Failed",
          description: error?.message || JSON.stringify(error),
          variant: "destructive",
        });
      }
      setIsApproving(false);
    }
  };

  const isWalletConnected = isEthConnected;

  const handleMax = async () => {
    if (isBuy) {
      if (paymentMethod === "ETH") {
        // Convert ETH balance to a reasonable amount (leave some for gas)
        const ethBalanceNum = parseFloat(ethers.formatEther(ethBalance));
        const maxAmount = Math.max(0, ethBalanceNum - 0.01); // Leave 0.01 ETH for gas
        setAmount(maxAmount.toString());
      } else if (paymentMethod === "WETH") {
        // Format with limited precision to avoid ethers parsing issues
        const wethBalanceFormatted = ethers.formatUnits(evilWETHBalance, 18);
        const limitedPrecision = parseFloat(wethBalanceFormatted).toFixed(6);
        setAmount(limitedPrecision);
      }
    } else {
      // Format with limited precision to avoid ethers parsing issues
      const tokenBalanceFormatted = ethers.formatUnits(
        tokenBalance,
        tokenDecimals
      );
      const limitedPrecision = parseFloat(tokenBalanceFormatted).toFixed(6); // Limit to 6 decimal places
      setAmount(limitedPrecision);

      console.log("[MAX BUTTON DEBUG]", {
        tokenBalance,
        tokenDecimals,
        tokenBalanceFormatted,
        limitedPrecision,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate amount more thoroughly
    const numAmount = parseFloat(amount);
    if (!amount || amount.trim() === "" || isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    if (!isWalletConnected) {
      toast({
        title: "Not Signed In",
        description: "Please sign in to trade.",
        variant: "destructive",
      });
      return;
    }
    if (!props.tokenAddress) {
      toast({
        title: "Token Not Found",
        description: "Token address is missing.",
        variant: "destructive",
      });
      return;
    }
    startLoading();
    try {
      const signer = await getETHSigner();
      let tradeResponse;
      if (isBuy) {
        // User input is payment method amount (ETH or WETH), pass directly to util
        const tradeData = {
          chain: "sepolia",
          symbol: props.symbol,
          tokenAddress: props.tokenAddress!,
          amount: amount, // payment method amount (ETH or WETH) as string
          currency: paymentMethod,
          isBuy: true,
          deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
          slippage: slippagePercent / 100,
        };
        tradeResponse = await buyTokenETH(tradeData, signer);
      } else {
        // Create tradeData for sell orders - match working script exactly
        const tradeData = {
          chain: "sepolia",
          symbol: props.symbol,
          tokenAddress: props.tokenAddress!,
          amount: amount, // Use actual user input amount
          currency: "WETH", // Always returns WETH from selling (consistent with working script)
          isBuy: false,
          deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes like the script
          slippage: 0.05, // FIXED: Use 5% slippage like working script (hardcoded for reliability)
          // Note: slippage is now hardcoded to match working script's 5% tolerance
        };

        console.log("[UI SELL PARAMS]", {
          tokenAddress: props.tokenAddress,
          amount: amount,
          actualAmountUsed: tradeData.amount,
          slippage: tradeData.slippage,
          deadline: tradeData.deadline,
          from: userAddress,
          isBuy: false,
          tradeData,
        });

        // Debug the current balance and decimals state
        console.log("[FORM STATE DEBUG]", {
          tokenBalance,
          tokenDecimals,
          tokenBalanceFormatted: ethers.formatUnits(
            tokenBalance,
            tokenDecimals
          ),
          userInputAmount: amount,
          amountAsNumber: parseFloat(amount),
        });
        try {
          tradeResponse = await sellTokenETH(tradeData, signer);
        } catch (sellError) {
          console.error("[SELL ERROR - FULL OBJECT]", sellError);
          throw sellError;
        }
      }
      console.log("Trade response:", tradeResponse);
      if (tradeResponse && tradeResponse.success) {
        if (tradeResponse.pending) {
          // Transaction sent but not confirmed - store tx hash and type
          // Toast will be shown when WebSocket confirms it
          console.log(
            "[TradingForm] Setting pending state for tx:",
            tradeResponse.transactionHash,
            isBuy ? "BUY" : "SELL"
          );
          setPendingTxHash(tradeResponse.transactionHash);
          setPendingTradeType(isBuy ? "BUY" : "SELL");
          console.log(
            "[TradingForm] Pending state set. Waiting for WebSocket confirmation..."
          );
        } else {
          // Shouldn't happen anymore since we removed tx.wait()
          const explorerUrl = `https://sepolia.etherscan.io/tx/${tradeResponse.transactionHash}`;
          const tickerTitle = `${props.symbol ? `$${props.symbol}` : "Token"} ${
            isBuy ? "Buy" : "Sell"
          } Successful`;
          toast({
            title: tickerTitle,
            description: (
              <div>
                <div>Transaction Hash:</div>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {abbreviateHash(tradeResponse.transactionHash)}
                </a>
              </div>
            ),
            variant: isBuy ? "success" : "softDestructive",
          });
          // Refresh balances immediately after successful trade
          void fetchBalancesNow();
        }
      } else if (
        tradeResponse &&
        tradeResponse.error &&
        isUserRejectedError(tradeResponse.error)
      ) {
        toast({
          title: "Trade Cancelled",
          description: "You rejected the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description:
            tradeResponse?.error ||
            "An error occurred while processing the trade.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting trade:", error);

      // Check if user rejected the transaction
      if (isUserRejectedError(error)) {
        toast({
          title: "Trade Cancelled",
          description: "You rejected the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description:
            error?.message || "An error occurred while submitting the trade.",
          variant: "destructive",
        });
      }
    } finally {
      stopLoading();
    }
  };

  // Show wallet connection prompt if not connected
  if (!isWalletConnected) {
    return (
      <div className={`p-2 ${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-700`}>
        <WalletConnectionPrompt
          title="Sign In to Trade"
          description="Sign in to buy and sell tokens"
          actionText="Sign In"
          variant="compact"
        />
      </div>
    );
  }

  // Mobile redesign when lockMode is true
  if (props.lockMode && isMobile) {
    return (
      <form
        ref={props.formRef}
        onSubmit={handleSubmit}
        className="h-full flex flex-col bg-bg-main"
      >
        {/* Top Bar: Buy/Sell Toggles + Close Button */}
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <div className="flex space-x-2 flex-1">
            <button
              type="button"
              onClick={() => {
                setIsBuy(true);
                setAmount("");
              }}
              className={`flex-1 py-2 px-3 text-xs font-bold transition-all duration-200 rounded ${
                isBuy
                  ? "bg-orange-400 text-black"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => {
                setIsBuy(false);
                setAmount("");
              }}
              className={`flex-1 py-2 px-3 text-xs font-bold transition-all duration-200 rounded ${
                !isBuy
                  ? "bg-orange-400 text-black"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              Sell
            </button>
          </div>
          {props.onClose && (
            <button
              type="button"
              onClick={props.onClose}
              className="ml-3 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content - Not scrollable, fixed height to prevent resize on toggle */}
        <div className="flex-1 overflow-hidden p-2 space-y-2">
          {/* Payment Method Selector (only for buy mode) - Fixed height container */}
          <div className="h-[48px]">
            {isBuy && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Payment Method</span>
                  <div className="flex space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("ETH")}
                      className={`px-2 py-1 text-xs font-medium transition-all duration-200 rounded ${
                        paymentMethod === "ETH"
                          ? "bg-orange-400 text-black"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      ETH
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("WETH")}
                      className={`px-2 py-1 text-xs font-medium transition-all duration-200 rounded ${
                        paymentMethod === "WETH"
                          ? "bg-orange-400 text-black"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      WETH
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Balance:{" "}
                  <span className="text-white font-sans">
                    {paymentMethod === "ETH"
                      ? parseFloat(ethers.formatEther(ethBalance)).toFixed(4)
                      : abbreviateTokenAmount(evilWETHBalance, 18)}{" "}
                    {paymentMethod}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                {isBuy ? "Amount" : "Amount"}
              </span>
              {!isBuy && (
                <span className="text-xs text-gray-400">
                  Balance:{" "}
                  <span className="text-white font-sans">
                    {abbreviateTokenAmount(tokenBalance, tokenDecimals)}{" "}
                    {props.symbol}
                  </span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="amount"
                type="number"
                min="0"
                step="any"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-white text-sm font-sans focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-sans">
                {isBuy ? paymentMethod : props.symbol}
              </div>
              {/* Sell conversion display */}
              {!isBuy && amount && parseFloat(amount) > 0 && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  {isCalculatingSellConversion ? (
                    <div className="flex items-center space-x-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-500"></div>
                    </div>
                  ) : expectedWethAmount && expectedWethAmount !== "0" ? (
                    <div className="text-xs text-orange-400 font-sans">
                      ≈ {abbreviateTokenAmount(expectedWethAmount, 18)} WETH
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Quick Options */}
          <div>
            {isBuy ? (
              <div className="flex flex-nowrap gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="px-1.5 py-1 text-[10px] font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex-shrink-0 whitespace-nowrap"
                >
                  Reset
                </button>
                {presetAmounts.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAmount(value.toString());
                    }}
                    className="px-1.5 py-1 text-[10px] font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex-shrink-0 whitespace-nowrap"
                  >
                    {value} {paymentMethod}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (paymentMethod === "ETH") {
                      setAmount(ethers.formatEther(ethBalance));
                    } else {
                      setAmount(ethers.formatEther(evilWETHBalance));
                    }
                  }}
                  className="px-1.5 py-1 text-[10px] font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex-shrink-0 whitespace-nowrap"
                >
                  Max
                </button>
              </div>
            ) : (
              <div className="flex flex-nowrap gap-1 overflow-x-auto">
                {[10, 25, 50, 75, 100].map((percentage) => (
                  <button
                    key={percentage}
                    type="button"
                    onClick={() => {
                      const tokenBalanceNum = parseFloat(
                        ethers.formatUnits(tokenBalance, tokenDecimals)
                      );
                      const sellAmount = (tokenBalanceNum * percentage) / 100;
                      const sellAmountString = sellAmount
                        .toFixed(6)
                        .replace(/\.?0+$/, "");
                      setAmount(sellAmountString || "0");
                    }}
                    className="px-1.5 py-1 text-[10px] font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex-shrink-0 whitespace-nowrap"
                  >
                    {percentage}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Approve buttons when needed */}
          {isBuy &&
          paymentMethod === "WETH" &&
          amount &&
          parseFloat(amount) > 0 &&
          BigInt(wethAllowance) < ethers.parseEther(amount) ? (
            <button
              type="button"
              disabled={isApproving || !isWalletConnected || !amount || !isProviderReady}
              onClick={handleApprove}
              className="w-full py-2 text-xs font-bold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {isApproving ? "Approving..." : "Approve WETH"}
            </button>
          ) : !isBuy &&
            amount &&
            parseFloat(amount) > 0 &&
            (() => {
              try {
                const requiredAllowance = ethers.parseUnits(amount, tokenDecimals);
                const currentAllowance = BigInt(tokenAllowance);
                return currentAllowance < requiredAllowance;
              } catch {
                return false;
              }
            })() ? (
            <button
              type="button"
              disabled={isApproving || !isWalletConnected || !amount || !isProviderReady}
              onClick={handleTokenApprove}
              className="w-full py-2 text-xs font-bold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {isApproving ? "Approving..." : `Approve ${props.symbol}`}
            </button>
          ) : null}
        </div>

        {/* Main Submit Button at Bottom */}
        <div className="p-2 border-t border-gray-700">
          <button
            type="submit"
            disabled={isLoading || pendingTxHash !== null || !isProviderReady}
            className={`w-full py-2 text-sm font-bold transition-all duration-200 rounded-lg ${
              isBuy
                ? "bg-orange-400 hover:bg-orange-500 text-black"
                : "bg-orange-400 hover:bg-orange-500 text-black"
            }`}
          >
            {pendingTxHash
              ? "Waiting for Confirmation..."
              : isLoading
              ? isBuy
                ? "Submitting Buy..."
                : "Submitting Sell..."
              : isBuy
              ? `Buy ${props.symbol}`
              : `Sell ${props.symbol}`}
          </button>
        </div>
      </form>
    );
  }

  // Desktop/Non-lockMode layout (existing)
  return (
    <form
      ref={props.formRef}
      onSubmit={handleSubmit}
      className={`p-2 ${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-700 space-y-6 text-gray-400`}
    >
      {/* Buy and Sell Buttons - Hidden when lockMode is true */}
      {!props.lockMode && (
        <div className="flex space-x-4">
          {/* Buy Button */}
          <button
            type="button"
            onClick={() => {
              setIsBuy(true);
              setAmount("");
            }}
            className={`
        w-full p-3 text-sm font-bold transition-all duration-200 rounded
        ${
          isBuy
            ? "bg-orange-400 text-black"
            : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
        }
      `}
          >
            Buy
          </button>

          {/* Sell Button */}
          <button
            type="button"
            onClick={() => {
              setIsBuy(false);
              setAmount("");
            }}
            className={`
        w-full p-3  text-sm font-bold transition-all duration-200 rounded
        ${
          !isBuy
            ? "bg-orange-400 text-black"
            : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
        }
      `}
          >
            Sell
          </button>
        </div>
      )}

      {/* Payment Method Selector (only for buy mode) */}
      {isBuy && (
        <div>
          <label
            htmlFor="paymentMethod"
            className="block mb-2 text-sm text-gray-500"
          >
            Payment Method
          </label>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("ETH")}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded ${
                paymentMethod === "ETH"
                  ? "bg-orange-400 text-black"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              ETH
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("WETH")}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded ${
                paymentMethod === "WETH"
                  ? "bg-orange-400 text-black"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              WETH
            </button>
          </div>
          {/* Show current balance for selected payment method */}
          <div className="text-xs text-gray-400 mt-2">
            {paymentMethod === "ETH" ? (
              <>
                ETH Balance:{" "}
                <span className="font-mono text-white">
                  {parseFloat(ethers.formatEther(ethBalance)).toFixed(4)}
                </span>{" "}
                ETH
              </>
            ) : (
              <>
                WETH Balance:{" "}
                <span className="font-mono text-white">
                  {abbreviateTokenAmount(evilWETHBalance, 18)}
                </span>{" "}
                WETH
              </>
            )}
          </div>
        </div>
      )}

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
                className={`px-3 py-2 text-xs font-medium transition-all duration-200 rounded ${
                  slippagePercent === preset && !customSlippage
                    ? "bg-orange-400 text-black"
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
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-400 rounded"
                min="0"
                max="50"
                step="0.1"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </div>
          {/* Current Slippage Display */}
          <div className="text-xs text-gray-400">
            Current slippage:{" "}
            <span className="text-orange-400">{slippagePercent}%</span>
            {slippagePercent > 5 && (
              <span className="text-yellow-400 ml-2">
                ⚠️ High slippage warning
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-2">
        <label htmlFor="amount" className="block text-xs text-gray-400 mb-1">
          Amount ({isBuy ? paymentMethod : props.symbol})
        </label>
        <div className="relative">
          <input
            id="amount"
            type="number"
            min="0"
            step="any"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder={
              isBuy
                ? `Enter ${paymentMethod} to spend`
                : `Enter ${props.symbol} to sell`
            }
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {/* Sell conversion display on the right side */}
          {!isBuy && amount && parseFloat(amount) > 0 && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {isCalculatingSellConversion ? (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                  <span className="text-xs text-gray-400">Calculating...</span>
                </div>
              ) : expectedWethAmount && expectedWethAmount !== "0" ? (
                <div className="text-right">
                  <div className="text-xs text-orange-400 font-mono">
                    ≈ {abbreviateTokenAmount(expectedWethAmount, 18)} WETH
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
        {!isBuy && (
          <div className="text-xs text-gray-400 mt-1">
            Balance:{" "}
            <span className="font-mono text-white">
              {abbreviateTokenAmount(tokenBalance, tokenDecimals)}
            </span>{" "}
            {props.symbol}
          </div>
        )}
      </div>

      {/* Quick Buy Buttons (only for buy mode) */}
      {isBuy && (
        <div>
          <label className="block mb-2 text-sm text-gray-500">Quick Buy</label>
          <div className="flex space-x-2">
            {presetAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setAmount(value.toString());
                }}
                className="px-3 py-2 text-xs font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Percentage Sell Buttons (only for sell mode) */}
      {!isBuy && (
        <div>
          <label className="block mb-2 text-sm text-gray-500">Quick Sell</label>
          <div className="flex space-x-2">
            {[10, 25, 50, 75, 100].map((percentage) => (
              <button
                key={percentage}
                type="button"
                onClick={() => {
                  console.log("[PERCENTAGE SELL DEBUG]", {
                    percentage,
                    tokenBalance,
                    tokenDecimals,
                    tokenBalanceFormatted: ethers.formatUnits(
                      tokenBalance,
                      tokenDecimals
                    ),
                  });

                  const tokenBalanceNum = parseFloat(
                    ethers.formatUnits(tokenBalance, tokenDecimals)
                  );
                  const sellAmount = (tokenBalanceNum * percentage) / 100;

                  // Truncate to 6 decimal places for display (reasonable precision)
                  // Remove trailing zeros for cleaner display
                  const sellAmountString = sellAmount
                    .toFixed(6)
                    .replace(/\.?0+$/, "");

                  console.log("[PERCENTAGE SELL CALCULATION]", {
                    percentage,
                    tokenBalanceNum,
                    sellAmount,
                    tokenDecimals,
                    sellAmountFixed: sellAmount.toFixed(6),
                    sellAmountString,
                  });

                  // Set the amount (removing trailing zeros for cleaner display)
                  setAmount(sellAmountString || "0");
                }}
                className="px-3 py-2 text-xs font-medium transition-all duration-200 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded"
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button - Hidden when lockMode is true (mobile modal uses external submit button) */}
      {/* Approve buttons are always shown when needed, even in mobile modal */}
      {isBuy &&
      paymentMethod === "WETH" &&
      amount &&
      parseFloat(amount) > 0 &&
      BigInt(wethAllowance) < ethers.parseEther(amount) ? (
        <button
          type="button"
          disabled={isApproving || !isWalletConnected || !amount || !isProviderReady}
          onClick={handleApprove}
          className="w-full p-3 text-sm font-bold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          {isApproving ? "Approving..." : "Approve WETH"}
        </button>
      ) : /* Approve button for sell mode (Token) if allowance is insufficient */
      !isBuy &&
        amount &&
        parseFloat(amount) > 0 &&
        (() => {
          try {
            const requiredAllowance = ethers.parseUnits(amount, tokenDecimals);
            const currentAllowance = BigInt(tokenAllowance);
            return currentAllowance < requiredAllowance;
          } catch {
            // If parsing fails, don't show approve button (let submit handle the error)
            return false;
          }
        })() ? (
        <button
          type="button"
          disabled={isApproving || !isWalletConnected || !amount || !isProviderReady}
          onClick={handleTokenApprove}
          className="w-full p-3 text-sm font-bold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          {isApproving ? "Approving..." : `Approve ${props.symbol}`}
        </button>
      ) : (
        /* Submit button - only show when not in lockMode (mobile modal) */
        !props.lockMode && (
          <button
            type="submit"
            disabled={isLoading || pendingTxHash !== null || !isProviderReady}
            className={`w-full p-3 text-sm font-bold transition-all duration-200 rounded ${
              isBuy
                ? "bg-green-600 hover:bg-green-700 text-black"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {pendingTxHash
              ? "Waiting for Confirmation..."
              : isLoading
              ? isBuy
                ? "Submitting Buy..."
                : "Submitting Sell..."
              : isBuy
              ? "Submit Buy Order"
              : "Submit Sell Order"}
          </button>
        )
      )}
    </form>
  );
};

export default TradingForm;
