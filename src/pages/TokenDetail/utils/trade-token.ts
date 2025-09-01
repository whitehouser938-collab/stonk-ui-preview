import { TokenTradeData } from "../components/TradingForm";
import { ethers } from "ethers";
import Router from "@/abi/evm/Router.json";
import { Contract, EventLog } from "ethers";

export interface TradeTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  bondingCurveAddress: string;
  deployerAddress: string;
  success: boolean;
}

export const buyTokenETH = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
) => {
  if (tradeData.chain === "sepolia") {
    try {
      const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
      const router = new Contract(
        routerAddress,
        Router.abi,
        signer // Use Reown's signer
      );

      // User input is payment method amount (ETH or WETH)
      const assetAmount = ethers.parseUnits(tradeData.amount, 18); // 18 decimals for ETH/WETH
      // Calculate expected token amount for the asset amount (like the working script)
      const expectedTokenAmount = await router.calculateBuyPrice(
        tradeData.tokenAddress,
        assetAmount
      );

      if (expectedTokenAmount === 0n) {
        return {
          success: false,
          error: `Input ${tradeData.currency} amount is too low to buy any tokens.`,
        };
      }

      // Use the expected token amount directly
      const tokenAmount = expectedTokenAmount;
      // Calculate maximum asset amount to spend and minimum tokens to receive (like the working script)
      const slippageBps = Math.floor((tradeData.slippage || 0.05) * 100);
      const maxAssetAmount =
        (assetAmount * BigInt(100 + slippageBps)) / BigInt(100);
      const minTokenAmount =
        (tokenAmount * BigInt(100 - slippageBps)) / BigInt(100);

      console.log("[BUY UTIL PARAMS]", {
        tokenAddress: tradeData.tokenAddress,
        paymentMethod: tradeData.currency,
        assetAmount: assetAmount.toString(),
        expectedTokenAmount: expectedTokenAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        maxAssetAmount: maxAssetAmount.toString(),
        minTokenAmount: minTokenAmount.toString(),
        slippage: tradeData.slippage,
        deadline: tradeData.deadline,
      });

      //handle buy
      let tx;
      if (tradeData.isBuy) {
        console.log("Buying tokens");
        console.log("Token address:", tradeData.tokenAddress);
        console.log("Asset amount to spend:", assetAmount.toString());
        console.log(
          "Max asset amount (with slippage):",
          maxAssetAmount.toString()
        );
        console.log("Expected tokens:", tokenAmount.toString());
        console.log(
          "Minimum tokens (with slippage):",
          minTokenAmount.toString()
        );
        console.log("Deadline:", tradeData.deadline);
        tx = await router.buyTokens(
          tradeData.tokenAddress,
          maxAssetAmount, // Maximum asset amount to spend (with slippage)
          minTokenAmount, // Minimum tokens to receive (with slippage)
          tradeData.deadline
        );
        console.log("Transaction sent:", tx);
      }

      const receipt = await tx.wait(); // Wait for the transaction to be mined
      console.log("Transaction mined:", tx);

      if (!receipt) throw new Error("Transaction receipt is null");
      const eventLog = receipt.logs.find(
        (log): log is EventLog =>
          log instanceof EventLog && log.fragment?.name === "TokensPurchased"
      );

      let tokenAddress: string;

      if (eventLog) {
        [tokenAddress] = eventLog.args;
      } else {
        throw new Error("TokensPurchased event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        tokenAmount: tokenAmount,
        assetAmount: assetAmount,
        success: true,
      };
      return response;
    } catch (error) {
      console.error(
        `Error purchasing ${tradeData.symbol} on ${tradeData.chain}`,
        error
      );
      return {
        success: false,
        error: error?.message || JSON.stringify(error),
      };
    }
  }
};

export const sellTokenETH = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
) => {
  if (tradeData.chain === "sepolia") {
    try {
      const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
      const router = new Contract(
        routerAddress,
        Router.abi,
        signer // Use Reown's signer
      );

      // Parse token amount (like the working script)
      let tokenAmount;
      try {
        tokenAmount = ethers.parseEther(tradeData.amount);
      } catch (error) {
        return {
          success: false,
          error: `Invalid token amount: ${tradeData.amount}. Please enter a valid number.`,
        };
      }

      // Use calculateSellProceeds for sell (like the working script)
      let assetAmount = await router.calculateSellProceeds(
        tradeData.tokenAddress,
        tokenAmount
      );

      // Validate that we got a reasonable asset amount
      if (assetAmount === 0n) {
        return {
          success: false,
          error: `Token amount ${ethers.formatEther(
            tokenAmount
          )} is too low to sell.`,
        };
      }

      // Use fixed 5% slippage like the working script
      const minAssetAmount = (assetAmount * 95n) / 100n;

      console.log("[SELL UTIL PARAMS]", {
        tokenAddress: tradeData.tokenAddress,
        tokenAmount: tokenAmount.toString(),
        assetAmount: assetAmount.toString(),
        minAssetAmount: minAssetAmount.toString(),
        deadline: tradeData.deadline,
      });

      //handle sell
      let tx;
      if (!tradeData.isBuy) {
        tx = await router.sellTokens(
          tradeData.tokenAddress,
          tokenAmount,
          minAssetAmount,
          tradeData.deadline
        );
      }

      const receipt = await tx.wait(); // Wait for the transaction to be mined
      console.log("Transaction mined:", tx);

      if (!receipt) throw new Error("Transaction receipt is null");
      const eventLog = receipt.logs.find(
        (log): log is EventLog =>
          log instanceof EventLog && log.fragment?.name === "TokensSold"
      );

      let tokenAddress: string;
      if (eventLog) {
        [tokenAddress, tokenAmount, assetAmount] = eventLog.args;
      } else {
        // If no event found, use the values we already have
        tokenAddress = tradeData.tokenAddress;
        // assetAmount and tokenAmount are already set above
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        tokenAmount: tokenAmount,
        assetAmount: assetAmount,
        success: true,
      };
      return response;
    } catch (error) {
      console.error(
        `Error selling ${tradeData.symbol} on ${tradeData.chain}`,
        error
      );
      return {
        success: false,
        error: error?.message || JSON.stringify(error),
      };
    }
  }
};
