/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  toWei,
  fromWei,
  formatNmr,
  parseNmrAmount,
  validateNmrAmount,
  calculatePayout,
  usdToNmr,
  nmrToUsd,
} from '../../nodes/Numerai/helpers/amountConverter';

describe('Amount Converter', () => {
  describe('toWei', () => {
    it('should convert whole numbers', () => {
      expect(toWei('1')).toBe('1000000000000000000');
      expect(toWei('100')).toBe('100000000000000000000');
    });

    it('should convert decimal numbers', () => {
      expect(toWei('0.5')).toBe('500000000000000000');
      expect(toWei('1.5')).toBe('1500000000000000000');
    });

    it('should handle small decimals', () => {
      expect(toWei('0.000000000000000001')).toBe('1');
    });

    it('should accept number input', () => {
      expect(toWei(1)).toBe('1000000000000000000');
    });
  });

  describe('fromWei', () => {
    it('should convert wei to NMR', () => {
      expect(fromWei('1000000000000000000')).toBe('1');
      expect(fromWei('500000000000000000')).toBe('0.5');
    });

    it('should handle BigInt input', () => {
      expect(fromWei(BigInt('1000000000000000000'))).toBe('1');
    });

    it('should handle small values', () => {
      expect(fromWei('1')).toBe('0.000000000000000001');
    });

    it('should remove trailing zeros', () => {
      expect(fromWei('1100000000000000000')).toBe('1.1');
    });
  });

  describe('formatNmr', () => {
    it('should format with default decimals', () => {
      expect(formatNmr('1.23456789')).toBe('1.2346');
    });

    it('should format with custom decimals', () => {
      expect(formatNmr('1.23456789', 2)).toBe('1.23');
    });

    it('should accept number input', () => {
      expect(formatNmr(1.5, 2)).toBe('1.50');
    });
  });

  describe('parseNmrAmount', () => {
    it('should parse valid amounts', () => {
      expect(parseNmrAmount('100')).toBe(100);
      expect(parseNmrAmount('50.5')).toBe(50.5);
    });

    it('should handle formatting', () => {
      expect(parseNmrAmount('1,000')).toBe(1000);
      expect(parseNmrAmount('100 NMR')).toBe(100);
    });

    it('should return null for invalid amounts', () => {
      expect(parseNmrAmount('invalid')).toBeNull();
      expect(parseNmrAmount('-100')).toBeNull();
    });
  });

  describe('validateNmrAmount', () => {
    it('should validate amounts within range', () => {
      expect(validateNmrAmount(100)).toBe(true);
      expect(validateNmrAmount('50.5')).toBe(true);
    });

    it('should reject amounts outside range', () => {
      expect(validateNmrAmount(-1)).toBe(false);
      expect(validateNmrAmount(600000)).toBe(false);
    });

    it('should respect custom range', () => {
      expect(validateNmrAmount(50, 100, 1000)).toBe(false);
      expect(validateNmrAmount(500, 100, 1000)).toBe(true);
    });
  });

  describe('calculatePayout', () => {
    it('should calculate payout for positive scores', () => {
      expect(calculatePayout(100, 0.1)).toBeCloseTo(2.5);
    });

    it('should clip scores to bounds', () => {
      expect(calculatePayout(100, 0.5)).toBeCloseTo(6.25);
      expect(calculatePayout(100, -0.5)).toBeCloseTo(-6.25);
    });

    it('should use custom payout factor', () => {
      expect(calculatePayout(100, 0.1, 0.5)).toBeCloseTo(5);
    });
  });

  describe('usdToNmr and nmrToUsd', () => {
    it('should convert USD to NMR', () => {
      expect(usdToNmr(100, 10)).toBe(10);
    });

    it('should convert NMR to USD', () => {
      expect(nmrToUsd(10, 10)).toBe(100);
    });

    it('should throw for invalid price', () => {
      expect(() => usdToNmr(100, 0)).toThrow();
    });
  });
});
