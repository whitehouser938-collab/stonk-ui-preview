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

      // User input is EVILUSDC (asset token) amount
      const assetAmount = ethers.parseUnits(tradeData.amount, 6); // 6 decimals for EVILUSDC
      // Binary search for max token amount that can be bought for assetAmount
      let low = BigInt(0);
      let high = ethers.parseEther("1000000"); // Arbitrary high value
      let result = BigInt(0);
      for (let i = 0; i < 32; i++) {
        let mid = (low + high) / BigInt(2);
        const price = await router.calculateBuyPrice(
          tradeData.tokenAddress,
          mid
        );
        if (price > assetAmount) {
          high = mid - BigInt(1);
        } else {
          result = mid;
          low = mid + BigInt(1);
        }
      }
      let tokenAmount = result;
      // Ensure tokenAmount is not too high (overshoot fix)
      while (tokenAmount > 0n) {
        const price = await router.calculateBuyPrice(
          tradeData.tokenAddress,
          tokenAmount
        );
        if (price <= assetAmount) break;
        tokenAmount--;
      }
      if (tokenAmount === 0n) {
        return {
          success: false,
          error: "Input EVILUSDC amount is too low to buy any tokens.",
        };
      }
      // Use fixed 5% slippage like the working script
      const maxAssetAmount = (assetAmount * 105n) / 100n; // 5% slippage tolerance

      console.log("[BUY UTIL PARAMS]", {
        tokenAddress: tradeData.tokenAddress,
        assetAmount: assetAmount.toString(),
        tokenAmount: tokenAmount.toString(),
        maxAssetAmount: maxAssetAmount.toString(),
        deadline: tradeData.deadline,
      });

      //handle buy
      let tx;
      if (tradeData.isBuy) {
        console.log("Buying tokens");
        console.log("Token address:", tradeData.tokenAddress);
        console.log("Token amount:", tokenAmount);
        console.log("Max asset amount:", maxAssetAmount);
        console.log("Deadline:", tradeData.deadline);
        tx = await router.buyTokens(
          tradeData.tokenAddress,
          tokenAmount,
          maxAssetAmount,
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

      let tokenAmount = ethers.parseEther(tradeData.amount);
      // Use calculateSellProceeds for sell
      let assetAmount = await router.calculateSellProceeds(
        tradeData.tokenAddress,
        tokenAmount
      );
      // Use fixed 5% slippage like the working script
      const minAssetAmount = (assetAmount * 95n) / 100n; // 5% slippage tolerance

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
        throw new Error("TokensSold event not found");
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
