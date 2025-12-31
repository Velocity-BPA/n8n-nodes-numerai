/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * NMR token has 18 decimals
 */
const NMR_DECIMALS = 18;
const NMR_MULTIPLIER = BigInt(10) ** BigInt(NMR_DECIMALS);

/**
 * Convert NMR amount from human-readable to wei (18 decimals)
 * @param amount - Human readable NMR amount (e.g., "1.5")
 * @returns Wei representation as string
 */
export function toWei(amount: string | number): string {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  const parts = amountStr.split('.');

  let wholePart = parts[0] || '0';
  let decimalPart = parts[1] || '';

  // Pad or truncate decimal part to 18 digits
  if (decimalPart.length > NMR_DECIMALS) {
    decimalPart = decimalPart.slice(0, NMR_DECIMALS);
  } else {
    decimalPart = decimalPart.padEnd(NMR_DECIMALS, '0');
  }

  // Remove leading zeros from whole part
  wholePart = wholePart.replace(/^0+/, '') || '0';

  // Combine and convert to BigInt
  const weiValue = BigInt(wholePart + decimalPart);
  return weiValue.toString();
}

/**
 * Convert NMR amount from wei (18 decimals) to human-readable
 * @param weiAmount - Wei representation as string or BigInt
 * @returns Human readable NMR amount
 */
export function fromWei(weiAmount: string | bigint): string {
  const weiBigInt = typeof weiAmount === 'string' ? BigInt(weiAmount) : weiAmount;
  const weiStr = weiBigInt.toString().padStart(NMR_DECIMALS + 1, '0');

  const wholePart = weiStr.slice(0, -NMR_DECIMALS) || '0';
  let decimalPart = weiStr.slice(-NMR_DECIMALS);

  // Remove trailing zeros from decimal part
  decimalPart = decimalPart.replace(/0+$/, '');

  if (decimalPart) {
    return `${wholePart}.${decimalPart}`;
  }
  return wholePart;
}

/**
 * Format NMR amount for display
 * @param amount - NMR amount as string or number
 * @param decimals - Number of decimal places to show (default: 4)
 * @returns Formatted NMR string
 */
export function formatNmr(amount: string | number, decimals: number = 4): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(decimals);
}

/**
 * Parse NMR amount from string, handling various formats
 * @param input - Input string that may contain NMR amount
 * @returns Parsed NMR amount as number, or null if invalid
 */
export function parseNmrAmount(input: string): number | null {
  // Remove common formatting
  const cleaned = input
    .replace(/[,\s]/g, '')
    .replace(/NMR$/i, '')
    .trim();

  const num = parseFloat(cleaned);

  if (isNaN(num) || num < 0) {
    return null;
  }

  return num;
}

/**
 * Validate NMR amount
 * @param amount - Amount to validate
 * @param minAmount - Minimum allowed amount (default: 0)
 * @param maxAmount - Maximum allowed amount (default: 500000)
 * @returns true if valid, false otherwise
 */
export function validateNmrAmount(
  amount: string | number,
  minAmount: number = 0,
  maxAmount: number = 500000,
): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return false;
  }

  if (num < minAmount || num > maxAmount) {
    return false;
  }

  return true;
}

/**
 * Calculate payout based on stake and score
 * @param stake - Staked NMR amount
 * @param score - Performance score (-1 to 1)
 * @param payoutFactor - Payout multiplier (default: 0.25)
 * @returns Expected payout in NMR
 */
export function calculatePayout(stake: number, score: number, payoutFactor: number = 0.25): number {
  // Numerai payout formula: stake * clip(score, -0.25, 0.25) * payoutFactor
  const clippedScore = Math.max(-0.25, Math.min(0.25, score));
  return stake * clippedScore * payoutFactor;
}

/**
 * Convert USD to NMR (approximate, for display purposes)
 * @param usdAmount - USD amount
 * @param nmrPrice - Current NMR price in USD
 * @returns NMR amount
 */
export function usdToNmr(usdAmount: number, nmrPrice: number): number {
  if (nmrPrice <= 0) {
    throw new Error('NMR price must be positive');
  }
  return usdAmount / nmrPrice;
}

/**
 * Convert NMR to USD (approximate, for display purposes)
 * @param nmrAmount - NMR amount
 * @param nmrPrice - Current NMR price in USD
 * @returns USD amount
 */
export function nmrToUsd(nmrAmount: number, nmrPrice: number): number {
  return nmrAmount * nmrPrice;
}
