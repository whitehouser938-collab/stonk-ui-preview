import { Chain } from "@/types";

export function getTradeLimitForResolution(resolution: string): number {
  switch (resolution) {
    case "1": return 1500;     // fine granularity → more trades needed
    case "15": return 2000;
    case "30": return 2500;
    case "60": return 3000;
    case "180": return 4000;
    case "1D": return 5000;
    case "3D": return 7000;
    case "1W": return 10000;
    case "1M": return 12000;
    default: return 3000;
  }
}

export type TVMode = "price" | "mcap";
export type TVAsset = "USD" | "WETH";

export function buildTvSymbol(params: {
  tokenSymbol: string;
  tokenAddress: string;
  tokenSupply: number;
  chain: Chain;
  mode: TVMode;
  asset: TVAsset;
}) {
  const { tokenSymbol, tokenAddress, tokenSupply, chain, mode, asset } = params;

  return [
    tokenSymbol,
    tokenAddress,
    tokenSupply,
    chain,
    mode,
    asset,
  ].join(":");
}

export function parseTvSymbol(tvSymbol: string) {
  const [tokenSymbol, tokenAddress, tokenSupply, chain, mode, asset] = tvSymbol.split(":");

  return {
    tokenSymbol,
    tokenAddress,
    tokenSupply: Number(tokenSupply),
    chain: chain as Chain,
    mode: mode as TVMode,
    asset: asset as TVAsset,
  };
}