import React from "react";

interface BondingCurveProgressProps {
  progress?: number; // Progress value between 0 and 100
  bondingCurveAddress?: string; // Optional bonding curve address
  graduated?: boolean; // Optional flag to indicate if the bonding curve has graduated
}

const BondingCurveProgress: React.FC<BondingCurveProgressProps> = ({
  progress,
}) => {
  // Ensure progress is clamped between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Calculate the number of filled blocks (each block represents 5%)
  const totalBlocks = 20; // 100% divided into 5% blocks
  const filledBlocks = Math.floor(clampedProgress / 5);

  return (
    <div className="w-full bg-gray-900 border border-gray-700 p-2">
      <div className="text-sm text-gray-400 mb-2">
        Bonding Curve Progress: {clampedProgress}%
      </div>
      <div className="flex space-x-1">
        {Array.from({ length: totalBlocks }).map((_, index) => (
          <div
            key={index}
            className={`h-4 flex-1 rounded ${
              index < filledBlocks ? "bg-orange-600" : "bg-gray-700"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default BondingCurveProgress;
