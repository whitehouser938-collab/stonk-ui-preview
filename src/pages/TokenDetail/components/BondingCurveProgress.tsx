import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface BondingCurveProgressProps {
  progress?: number; // Progress value between 0 and 100
  bondingCurveAddress?: string; // Optional bonding curve address
  graduated?: boolean; // Optional flag to indicate if the bonding curve has graduated
  uniswapPair?: string; // Uniswap pair address when graduated
}

const BondingCurveProgress: React.FC<BondingCurveProgressProps> = ({
  progress = 0,
  graduated = false,
  uniswapPair,
}) => {
  const isMobile = useIsMobile();
  // If graduated or has uniswap pair, show 100% progress
  const isGraduated = graduated || !!uniswapPair;
  const clampedProgress = isGraduated
    ? 100
    : Math.min(100, Math.max(0, progress));

  // Calculate the number of filled blocks (each block represents 5%)
  const totalBlocks = 20; // 100% divided into 5% blocks
  const filledBlocks = Math.floor(clampedProgress / 5);

  function abbreviateAddress(addr: string): string {
    if (!addr) return "";
    return addr.slice(0, 4) + "..." + addr.slice(-4);
  }

  return (
    <div className={`w-full ${isMobile ? "bg-black" : "bg-gray-900"} border border-gray-700 p-2`}>
      <div className="text-sm text-gray-400 mb-2">
        {isGraduated ? (
          <span className="text-green-400 font-bold">✓ GRADUATED</span>
        ) : (
          `Bonding Curve Progress: ${clampedProgress}%`
        )}
      </div>
      <div className="flex space-x-1">
        {Array.from({ length: totalBlocks }).map((_, index) => (
          <div
            key={index}
            className={`h-4 flex-1 rounded ${
              index < filledBlocks
                ? isGraduated
                  ? "bg-green-600"
                  : "bg-orange-600"
                : "bg-gray-700"
            }`}
          ></div>
        ))}
      </div>

      {/* Show Uniswap pair address if graduated */}
      {uniswapPair && (
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Uniswap Pair</div>
          <div className="flex items-center space-x-2">
            <span className="text-white font-mono text-sm">
              {abbreviateAddress(uniswapPair)}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(uniswapPair)}
              className="text-orange-400 hover:text-orange-300 text-xs font-medium"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BondingCurveProgress;
