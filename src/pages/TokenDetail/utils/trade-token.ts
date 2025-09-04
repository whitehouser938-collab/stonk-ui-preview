import { TokenTradeData } from "../components/TradingForm";
import { ethers } from "ethers";
import Router from "@/abi/evm/Router.json";
import { Contract, EventLog } from "ethers";

export interface TradeTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  tokenAmount: string;
  assetAmount: string;
  success: boolean;
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
    const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
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

    // Calculate expected token amount for the asset amount
    const expectedTokenAmount = await router.calculateBuyPrice(
      tradeData.tokenAddress,
      assetAmount
    );

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

    console.log("[BUY PARAMS]", {
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

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt);

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    // Find the TokensPurchased event
    const eventLog = receipt.logs.find(
      (log): log is EventLog =>
        log instanceof EventLog && log.fragment?.name === "TokensPurchased"
    );

    if (!eventLog) {
      throw new Error("TokensPurchased event not found");
    }

    const [tokenAddress] = eventLog.args;

    return {
      transactionHash: tx.hash,
      tokenAddress: tokenAddress,
      tokenAmount: expectedTokenAmount.toString(),
      assetAmount: assetAmount.toString(),
      success: true,
    };
  } catch (error) {
    console.error(
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
    const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
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

    // Parse token amount to sell
    const tokenAmount = ethers.parseEther(tradeData.amount);

    // Calculate expected asset amount (ETH or WETH) from selling tokens
    const expectedAssetAmount = await router.calculateSellProceeds(
      tradeData.tokenAddress,
      tokenAmount
    );

    if (expectedAssetAmount === 0n) {
      return {
        success: false,
        error: `Token amount ${tradeData.amount} is too low to sell.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Calculate slippage-adjusted minimum amount
    const slippageBps = Math.floor((tradeData.slippage || 0.05) * 10000);
    const minAssetAmount =
      (expectedAssetAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

    console.log("[SELL PARAMS]", {
      tokenAddress: tradeData.tokenAddress,
      tokenAmount: tokenAmount.toString(),
      expectedAssetAmount: expectedAssetAmount.toString(),
      minAssetAmount: minAssetAmount.toString(),
      slippage: tradeData.slippage,
      deadline: tradeData.deadline,
    });

    let tx;

    if (tradeData.currency === "ETH") {
      // Use sellTokensForETH for ETH output
      tx = await router.sellTokensForETH(
        tradeData.tokenAddress,
        tokenAmount,
        minAssetAmount,
        tradeData.deadline
      );
    } else {
      // Use sellTokens for WETH output
      tx = await router.sellTokens(
        tradeData.tokenAddress,
        tokenAmount,
        minAssetAmount,
        tradeData.deadline
      );
    }

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt);

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    // Find the TokensSold event
    const eventLog = receipt.logs.find(
      (log): log is EventLog =>
        log instanceof EventLog && log.fragment?.name === "TokensSold"
    );

    let finalTokenAddress = tradeData.tokenAddress;
    let finalTokenAmount = tokenAmount;
    let finalAssetAmount = expectedAssetAmount;

    if (eventLog) {
      [finalTokenAddress, finalTokenAmount, finalAssetAmount] = eventLog.args;
    }

    return {
      transactionHash: tx.hash,
      tokenAddress: finalTokenAddress,
      tokenAmount: finalTokenAmount.toString(),
      assetAmount: finalAssetAmount.toString(),
      success: true,
    };
  } catch (error) {
    console.error(
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
