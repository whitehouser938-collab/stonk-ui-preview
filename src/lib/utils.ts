import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format balance with abbreviations (k=1000, m=1000000) and max 2 decimals
export function formatBalance(balance: string): string {
  const num = parseFloat(balance);

  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + "K";
  } else {
    return num.toFixed(2);
  }
}

// Calculate percentage of total supply (assuming 1 billion total supply)
export function calculatePercentage(
  balance: string,
  totalSupply: number = 1000000000
): string {
  const num = parseFloat(balance);
  const percentage = (num / totalSupply) * 100;
  return percentage.toFixed(2) + "%";
}

// Abbreviate wallet address (first 6 chars + ... + last 4 chars)
export function abbreviateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
