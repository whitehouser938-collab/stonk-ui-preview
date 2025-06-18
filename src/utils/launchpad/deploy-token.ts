import { ICOLaunchData } from "@/components/ICOLaunchpad";
import { ethers } from "ethers";
import TokenFactory from "@/abi/evm/TokenFactory.json";
import { Contract, EventLog } from "ethers";

export interface DeployTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  bondingCurveAddress: string;
  deployerAddress: string;
  success: boolean;
}

export const deployTokenETH = async (
  tokenData: ICOLaunchData,
  signer: ethers.Signer
) => {
  if (tokenData.launchpad === "base") {
    try {
      const tokenFactoryAddress = import.meta.env
        .VITE_EVM_TOKEN_FACTORY_ADDRESS;
      const tokenFactory = new Contract(
        tokenFactoryAddress,
        TokenFactory.abi,
        signer // Use Reown's signer
      );

      // Convert totalSupply to uint256
      const totalSupplyAsUint256 = ethers.parseUnits(tokenData.totalSupply, 18);
      const fee = ethers.parseEther(import.meta.env.VITE_DEPLOYMENT_FEE_ETH);
      console.log("Token Name:", tokenData.name);
      console.log("Token Symbol:", tokenData.symbol);
      console.log("Total Supply (uint256):", totalSupplyAsUint256.toString());
      console.log("Vault Address:", import.meta.env.VITE_BASE_VAULT_ADDRESS);
      console.log("Deployment Fee (ETH):", fee.toString());
      console.log("Signer Address:", await signer.getAddress());

      // Deploy token transaction
      const tx = await tokenFactory.deployToken(
        tokenData.name,
        tokenData.symbol,
        totalSupplyAsUint256,
        import.meta.env.VITE_BASE_VAULT_ADDRESS, // Vault address
        // TODO: Add Tax params here
        0,
        0,
        0,
        { value: fee }
      );

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
        [tokenAddress, bondingCurveAddress] = eventLog.args;
      } else {
        throw new Error("TokenDeployed event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        bondingCurveAddress: bondingCurveAddress,
        deployerAddress: await signer.getAddress(),
        success: true,
      };
      return response;
    } catch (error) {
      console.error("Error deploying BASE token:", error);
      return {
        transactionHash: "",
        tokenAddress: "",
        bondingCurveAddress: "",
        deployerAddress: "",
        success: false,
      };
    }
  }
};
