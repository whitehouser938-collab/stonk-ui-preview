import { TokenTradeData } from "../components/TradingForm";
import { ethers } from "ethers";
import Router from "@/abi/evm/Router.json";
import { Contract, EventLog } from "ethers";
import { env } from "@/utils/env";
import { logger } from "@/utils/logger";
import {
  calculateBuyPrice,
  getTokenDecimals,
  calculateSellProceeds,
} from "@/api/rpc";

export interface TradeTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  tokenAmount: string;
  assetAmount: string;
  success: boolean;
  pending?: boolean; // True if tx sent but not confirmed
  error?: string;
}

/**
 * Unified function to buy tokens with either ETH or WETH
 */
export const buyTokens = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
): Promise<TradeTokenResponse> => {
  if (tradeData.chain !== "sepolia") {
    return {
      success: false,
      error: "Unsupported chain",
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }

  try {
    const routerAddress = env.VITE_EVM_ROUTER_ADDRESS;
    const router = new Contract(routerAddress, Router.abi, signer);

    // Validate amount before parsing
    const numAmount = parseFloat(tradeData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        success: false,
        error: `Invalid amount: ${tradeData.amount}. Please enter a valid positive number.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Check for very small amounts that might cause issues
    if (numAmount < 0.000001) {
      return {
        success: false,
        error: `Amount too small: ${tradeData.amount}. Minimum amount is 0.000001 ${tradeData.currency}.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Parse the input amount (ETH or WETH amount)
    const assetAmount = ethers.parseEther(tradeData.amount);

    // Calculate expected token amount for the asset amount using user's provider
    const provider = signer.provider;
    const priceData = await calculateBuyPrice(
      tradeData.tokenAddress,
      tradeData.amount,
      "SEP",
      provider
    );

    if (!priceData.success) {
      return {
        success: false,
        error: "Failed to calculate buy price from API",
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    const expectedTokenAmount = BigInt(priceData.data.tokenAmount);

    if (expectedTokenAmount === 0n) {
      return {
        success: false,
        error: `Input ${tradeData.currency} amount is too low to buy any tokens.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Calculate slippage-adjusted amounts
    const slippageBps = Math.floor((tradeData.slippage || 0.05) * 10000);
    const minTokenAmount =
      (expectedTokenAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

    logger.trade("[BUY PARAMS]", {
      tokenAddress: tradeData.tokenAddress,
      paymentMethod: tradeData.currency,
      assetAmount: assetAmount.toString(),
      expectedTokenAmount: expectedTokenAmount.toString(),
      minTokenAmount: minTokenAmount.toString(),
      slippage: tradeData.slippage,
      slippageBps,
      deadline: tradeData.deadline,
    });

    let tx;

    if (tradeData.currency === "ETH") {
      // Use buyTokensWithETH for ETH payments (payable function)
      // Parameters: tokenAddress, minTokenAmount, deadline, {value: ethAmount}
      tx = await router.buyTokensWithETH(
        tradeData.tokenAddress,
        minTokenAmount,
        tradeData.deadline,
        { value: assetAmount } // Send ETH with the transaction
      );
    } else {
      // Use buyTokens for WETH payments (nonpayable function)
      // Parameters: tokenAddress, maxAssetAmount, minTokenAmount, deadline
      // For WETH, we use the exact asset amount as maxAssetAmount (user specifies exact WETH to spend)
      tx = await router.buyTokens(
        tradeData.tokenAddress,
        assetAmount, // Use exact amount user wants to spend
        minTokenAmount,
        tradeData.deadline
      );
    }

    logger.trade("[BUY] Transaction sent:", tx.hash);

    // Don't wait for confirmation - let backend/WebSocket handle that
    // This eliminates RPC dependency and matches backend timing
    return {
      transactionHash: tx.hash,
      tokenAddress: tradeData.tokenAddress,
      tokenAmount: expectedTokenAmount.toString(),
      assetAmount: assetAmount.toString(),
      success: true,
      pending: true, // Mark as pending since not confirmed yet
    };
  } catch (error) {
    logger.error(
      `Error purchasing ${tradeData.symbol} on ${tradeData.chain}`,
      error
    );
    return {
      success: false,
      error: error?.message || JSON.stringify(error),
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }
};

/**
 * Unified function to sell tokens for either ETH or WETH
 */
export const sellTokens = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
): Promise<TradeTokenResponse> => {
  if (tradeData.chain !== "sepolia") {
    return {
      success: false,
      error: "Unsupported chain",
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }

  try {
    const routerAddress = env.VITE_EVM_ROUTER_ADDRESS;
    const router = new Contract(routerAddress, Router.abi, signer);

    // Validate amount before parsing
    const numAmount = parseFloat(tradeData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        success: false,
        error: `Invalid amount: ${tradeData.amount}. Please enter a valid positive number.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Check for very small amounts that might cause issues
    if (numAmount < 0.000001) {
      return {
        success: false,
        error: `Amount too small: ${tradeData.amount}. Minimum amount is 0.000001 tokens.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Parse token amount to sell - use the correct token decimals
    // Get token decimals first using user's provider
    const provider = signer.provider;
    const decimalsData = await getTokenDecimals(tradeData.tokenAddress, "SEP", provider);

    if (!decimalsData.success) {
      return {
        success: false,
        error: "Failed to get token decimals from API",
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    const tokenDecimals = decimalsData.data.decimals;

    // Parse with the correct decimals (most tokens are 18, but some might be different)
    const tokenAmount = ethers.parseUnits(tradeData.amount, tokenDecimals);

    // Calculate expected asset amount (ETH or WETH) from selling tokens using user's provider
    const proceedsData = await calculateSellProceeds(
      tradeData.tokenAddress,
      tokenAmount.toString(),
      "SEP",
      provider
    );

    logger.trade("[SELL PROCEEDS DEBUG]", {
      tokenAddress: tradeData.tokenAddress,
      tokenAmount: tokenAmount.toString(),
      proceedsData,
      rawAssetAmount: proceedsData.data?.assetAmount,
    });

    if (!proceedsData.success) {
      return {
        success: false,
        error: "Failed to calculate sell proceeds from API",
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    const expectedAssetAmount = BigInt(proceedsData.data.assetAmount);

    logger.trade("[SELL PROCEEDS CALCULATION]", {
      expectedAssetAmount: expectedAssetAmount.toString(),
      isZero: expectedAssetAmount === 0n,
      tokenAmount: tokenAmount.toString(),
      userInputAmount: tradeData.amount,
    });

    if (expectedAssetAmount === 0n) {
      return {
        success: false,
        error: `Token amount ${tradeData.amount} resulted in 0 proceeds. This could mean insufficient liquidity or the token cannot be sold.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Calculate slippage-adjusted minimum amount - match working script exactly
    // Working script uses: const minAssetAmount = (assetAmount * 95n) / 100n; // 5% slippage tolerance
    // Use exactly the same calculation as the working script
    const minAssetAmount = (expectedAssetAmount * 95n) / 100n; // Fixed 5% slippage like working script

    // Use the same deadline calculation as the working script
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    logger.trade("[SELL PARAMS]", {
      tokenAddress: tradeData.tokenAddress,
      tokenAmount: tokenAmount.toString(),
      expectedAssetAmount: expectedAssetAmount.toString(),
      minAssetAmount: minAssetAmount.toString(),
      slippage: tradeData.slippage,
      deadline: deadline,
    });

    // Token approval is now handled in the UI (TradingForm) before calling this function
    // This eliminates double wallet popups - users see a clear "Approve Token" button first

    // Always use sellTokens (returns WETH) - consistent with working script
    // The router handles the internal conversion logic
    const tx = await router.sellTokens(
      tradeData.tokenAddress,
      tokenAmount,
      minAssetAmount,
      deadline
    );

    logger.trade("[SELL] Transaction sent:", tx.hash);

    // Don't wait for confirmation - let backend/WebSocket handle that
    // This eliminates RPC dependency and matches backend timing
    return {
      transactionHash: tx.hash,
      tokenAddress: tradeData.tokenAddress,
      tokenAmount: tokenAmount.toString(),
      assetAmount: expectedAssetAmount.toString(),
      success: true,
      pending: true, // Mark as pending since not confirmed yet
    };
  } catch (error) {
    logger.error(
      `Error selling ${tradeData.symbol} on ${tradeData.chain}`,
      error
    );
    return {
      success: false,
      error: error?.message || JSON.stringify(error),
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }
};

// Legacy function names for backward compatibility
export const buyTokenETH = buyTokens;
export const sellTokenETH = sellTokens;
