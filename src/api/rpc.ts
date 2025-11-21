import { ethers, Contract } from "ethers";
import Router from "@/abi/evm/Router.json";
import Token from "@/abi/evm/Token.json";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Sepolia RPC URL - use env var if available, otherwise use public Sepolia RPC
const SEPOLIA_RPC_URL = import.meta.env.VITE_EVM_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

// Get provider for direct contract calls
const getProvider = () => {
  return new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
};

export interface BalancesResponse {
  success: boolean;
  data: {
    ethBalance: string;
    wethBalance: string;
    wethAllowance: string;
    tokenBalance: string;
    tokenAllowance: string;
    tokenDecimals: number;
  };
}

export interface CalculateBuyPriceResponse {
  success: boolean;
  data: {
    tokenAmount: string;
    assetAmount: string;
    tokenAddress: string;
  };
}

export interface TradingStateResponse {
  success: boolean;
  data: {
    isActive: boolean;
    bondingCurveAddress: string;
    uniswapPair: string;
    tokenAddress: string;
  };
}

export interface DecimalsResponse {
  success: boolean;
  data: {
    decimals: number;
    tokenAddress: string;
  };
}

export interface TokenBalanceResponse {
  success: boolean;
  data: {
    balance: string;
    tokenAddress: string;
    userAddress: string;
  };
}

export interface WethBalanceResponse {
  success: boolean;
  data: {
    balance: string;
    userAddress: string;
  };
}

export interface CalculateSellProceedsResponse {
  success: boolean;
  data: {
    assetAmount: string;
    tokenAmount: string;
    tokenAddress: string;
  };
}

export interface TokenAllowanceResponse {
  success: boolean;
  data: {
    allowance: string;
    tokenAddress: string;
    userAddress: string;
    spender: string;
  };
}

export interface TokenFactoryFeeResponse {
  success: boolean;
  data: {
    fee: string;
    factoryAddress: string;
  };
}

/**
 * Fetch all balances for a user and token
 */
export const fetchBalances = async (
  userAddress: string,
  tokenAddress: string,
  chain: string = "SEP"
): Promise<BalancesResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/balances?userAddress=${userAddress}&tokenAddress=${tokenAddress}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.status}`);
  }

  return response.json();
};

/**
 * Calculate buy price for a given asset amount - calls contract directly
 */
export const calculateBuyPrice = async (
  tokenAddress: string,
  assetAmount: string,
  chain: string = "SEP"
): Promise<CalculateBuyPriceResponse> => {
  try {
    const provider = getProvider();
    const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
    const router = new Contract(routerAddress, Router.abi, provider);

    // Convert asset amount to wei
    const assetAmountWei = ethers.parseEther(assetAmount);

    // Call calculateBuyPrice on the router contract
    const tokenAmount = await router.calculateBuyPrice(tokenAddress, assetAmountWei);

    return {
      success: true,
      data: {
        tokenAmount: tokenAmount.toString(),
        assetAmount: assetAmountWei.toString(),
        tokenAddress: tokenAddress,
      },
    };
  } catch (error) {
    console.error("Error calculating buy price from contract:", error);
    return {
      success: false,
      data: {
        tokenAmount: "0",
        assetAmount: "0",
        tokenAddress: tokenAddress,
      },
    };
  }
};

/**
 * Get trading state for a token
 */
export const getTradingState = async (
  tokenAddress: string,
  chain: string = "SEP"
): Promise<TradingStateResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/trading-state?tokenAddress=${tokenAddress}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get trading state: ${response.status}`);
  }

  return response.json();
};

/**
 * Get token decimals - calls contract directly
 */
export const getTokenDecimals = async (
  tokenAddress: string,
  chain: string = "SEP"
): Promise<DecimalsResponse> => {
  try {
    const provider = getProvider();
    const token = new Contract(tokenAddress, Token.abi, provider);

    const decimals = await token.decimals();

    return {
      success: true,
      data: {
        decimals: Number(decimals),
        tokenAddress: tokenAddress,
      },
    };
  } catch (error) {
    console.error("Error getting token decimals from contract:", error);
    return {
      success: false,
      data: {
        decimals: 18, // Default to 18
        tokenAddress: tokenAddress,
      },
    };
  }
};

/**
 * Get token balance for a user
 */
export const getTokenBalance = async (
  userAddress: string,
  tokenAddress: string,
  chain: string = "SEP"
): Promise<TokenBalanceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/token-balance?userAddress=${userAddress}&tokenAddress=${tokenAddress}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get token balance: ${response.status}`);
  }

  return response.json();
};

/**
 * Get WETH balance for a user
 */
export const getWethBalance = async (
  userAddress: string,
  chain: string = "SEP"
): Promise<WethBalanceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/weth-balance?userAddress=${userAddress}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get WETH balance: ${response.status}`);
  }

  return response.json();
};

/**
 * Calculate sell proceeds for a given token amount - calls contract directly
 */
export const calculateSellProceeds = async (
  tokenAddress: string,
  tokenAmount: string,
  chain: string = "SEP"
): Promise<CalculateSellProceedsResponse> => {
  try {
    const provider = getProvider();
    const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
    const router = new Contract(routerAddress, Router.abi, provider);

    // Call calculateSellProceeds on the router contract
    // tokenAmount is already in wei (passed from trade-token.ts)
    const assetAmount = await router.calculateSellProceeds(tokenAddress, tokenAmount);

    return {
      success: true,
      data: {
        assetAmount: assetAmount.toString(),
        tokenAmount: tokenAmount,
        tokenAddress: tokenAddress,
      },
    };
  } catch (error) {
    console.error("Error calculating sell proceeds from contract:", error);
    return {
      success: false,
      data: {
        assetAmount: "0",
        tokenAmount: tokenAmount,
        tokenAddress: tokenAddress,
      },
    };
  }
};

/**
 * Get token allowance for a user and spender - calls contract directly
 */
export const getTokenAllowance = async (
  userAddress: string,
  tokenAddress: string,
  spender: string,
  chain: string = "SEP"
): Promise<TokenAllowanceResponse> => {
  try {
    const provider = getProvider();
    const token = new Contract(tokenAddress, Token.abi, provider);

    const allowance = await token.allowance(userAddress, spender);

    return {
      success: true,
      data: {
        allowance: allowance.toString(),
        tokenAddress: tokenAddress,
        userAddress: userAddress,
        spender: spender,
      },
    };
  } catch (error) {
    console.error("Error getting token allowance from contract:", error);
    return {
      success: false,
      data: {
        allowance: "0",
        tokenAddress: tokenAddress,
        userAddress: userAddress,
        spender: spender,
      },
    };
  }
};

/**
 * Get token factory deployment fee
 */
export const getTokenFactoryFee = async (
  chain: string = "SEP"
): Promise<TokenFactoryFeeResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/token-factory-fee?chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get token factory fee: ${response.status}`);
  }

  return response.json();
};
