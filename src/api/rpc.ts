const API_BASE_URL = import.meta.env.VITE_API_URL;

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
 * Calculate buy price for a given asset amount
 */
export const calculateBuyPrice = async (
  tokenAddress: string,
  assetAmount: string,
  chain: string = "SEP"
): Promise<CalculateBuyPriceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/calculate-buy-price?tokenAddress=${tokenAddress}&assetAmount=${assetAmount}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to calculate buy price: ${response.status}`);
  }

  return response.json();
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
 * Get token decimals
 */
export const getTokenDecimals = async (
  tokenAddress: string,
  chain: string = "SEP"
): Promise<DecimalsResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/decimals?tokenAddress=${tokenAddress}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get token decimals: ${response.status}`);
  }

  return response.json();
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
 * Calculate sell proceeds for a given token amount
 */
export const calculateSellProceeds = async (
  tokenAddress: string,
  tokenAmount: string,
  chain: string = "SEP"
): Promise<CalculateSellProceedsResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/calculate-sell-proceeds?tokenAddress=${tokenAddress}&tokenAmount=${tokenAmount}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to calculate sell proceeds: ${response.status}`);
  }

  return response.json();
};

/**
 * Get token allowance for a user and spender
 */
export const getTokenAllowance = async (
  userAddress: string,
  tokenAddress: string,
  spender: string,
  chain: string = "SEP"
): Promise<TokenAllowanceResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/token/rpc/token-allowance?userAddress=${userAddress}&tokenAddress=${tokenAddress}&spender=${spender}&chain=${chain}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get token allowance: ${response.status}`);
  }

  return response.json();
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
