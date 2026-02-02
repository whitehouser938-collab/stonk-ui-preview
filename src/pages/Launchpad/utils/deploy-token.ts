import { ICOLaunchData } from "../components/ICOLaunchpad";
import { ethers, TransactionResponse } from "ethers";
import TokenFactory from "@/abi/evm/TokenFactory.json";
import { Contract, EventLog } from "ethers";

export interface DeployTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  bondingCurveAddress: string;
  deployerAddress: string;
  deploymentTimestamp: string;
  deploymentBlock: string;
  success: boolean;
}

// Minimal ERC20 ABI for approve function
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)"
];

export const deployTokenETH = async (
  tokenData: ICOLaunchData,
  signer: ethers.Signer
) => {
  if (tokenData.launchpad === "SEP") {
    try {
      const tokenFactoryAddress = import.meta.env
        .VITE_EVM_TOKEN_FACTORY_ADDRESS;
      const tokenFactory = new Contract(
        tokenFactoryAddress,
        TokenFactory.abi,
        signer
      );

      // Get the fee price and log it
      // const fee = await tokenFactory.feePrice();
      // console.log("Deployment fee:", ethers.formatEther(fee), "ETH");
      // console.log("Fee in wei:", fee.toString());

      let tx: TransactionResponse;

      // Check if initial buy amount is provided
      if (tokenData.initialBuyAmount && parseFloat(tokenData.initialBuyAmount) > 0) {
        // Convert initial buy amount to Wei
        const initialBuyAmountWei = ethers.parseEther(tokenData.initialBuyAmount);

        // Determine if using ETH (default to true if not specified)
        const useETH = tokenData.useETH !== undefined ? tokenData.useETH : true;

        // If using WETH, check and approve allowance first
        if (!useETH) {
          const wethAddress = import.meta.env.VITE_EVILWETH_ADDRESS;
          const wethContract = new Contract(wethAddress, ERC20_ABI, signer);
          const userAddress = await signer.getAddress();

          // Check current allowance
          const currentAllowance = await wethContract.allowance(userAddress, tokenFactoryAddress);
          console.log("Current WETH allowance:", ethers.formatEther(currentAllowance), "WETH");

          // If allowance is insufficient, approve
          if (currentAllowance < initialBuyAmountWei) {
            console.log("Approving WETH spending...");
            const approveTx = await wethContract.approve(tokenFactoryAddress, initialBuyAmountWei);
            await approveTx.wait();
            console.log("WETH approved successfully");
          } else {
            console.log("Sufficient WETH allowance already exists");
          }
        }

        // Deploy token with initial buy
        tx = await tokenFactory.deployToken(
          tokenData.name,
          tokenData.symbol,
          initialBuyAmountWei,
          useETH, // useETH from form data
          useETH ? { value: initialBuyAmountWei } : {} // Only send ETH value if using ETH
        );

        console.log("Deploying with initial buy of", tokenData.initialBuyAmount, useETH ? "ETH" : "WETH");
      } else {
        // Deploy token without initial buy (original function)
        tx = await tokenFactory.deployToken(
          tokenData.name,
          tokenData.symbol
          // { value: fee }
        );

        console.log("Deploying without initial buy");
      }

      const receipt = await tx.wait(); // Wait for the transaction to be mined
      console.log("Transaction mined:", tx);

      if (!receipt) throw new Error("Transaction receipt is null");
      const eventLog = receipt.logs.find(
        (log): log is EventLog =>
          log instanceof EventLog && log.fragment?.name === "TokenDeployed"
      );

      let tokenAddress: string;
      let bondingCurveAddress: string;
      if (eventLog) {
        // [tokenAddress, bondingCurveAddress] = eventLog.args;
        // For the new contract token address is bonding curve address
        [tokenAddress] = eventLog.args;
        bondingCurveAddress = tokenAddress;
      } else {
        throw new Error("TokenDeployed event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        bondingCurveAddress: bondingCurveAddress,
        deployerAddress: await signer.getAddress(),
        deploymentTimestamp: new Date().toISOString(),
        deploymentBlock: receipt.blockNumber.toString(),
        success: true,
      };
      return response;
    } catch (error) {
      console.error("Error deploying token:", error);
      return {
        transactionHash: "",
        tokenAddress: "",
        bondingCurveAddress: "",
        deployerAddress: "",
        deploymentTimestamp: "",
        deploymentBlock: "",
        success: false,
      };
    }
  }
};
