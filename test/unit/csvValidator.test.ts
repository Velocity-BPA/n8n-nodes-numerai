/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  validateClassicPredictions,
  validateSignalsPredictions,
  generateSampleClassicCSV,
  generateSampleSignalsCSV,
  CLASSIC_REQUIRED_COLUMNS,
  SIGNALS_REQUIRED_COLUMNS,
} from '../../nodes/Numerai/helpers/csvValidator';

describe('CSV Validator', () => {
  describe('validateClassicPredictions', () => {
    it('should validate correct CSV', () => {
      const csv = 'id,prediction\nn0001,0.5\nn0002,0.3';
      const result = validateClassicPredictions(csv);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject empty CSV', () => {
      const result = validateClassicPredictions('');
      expect(result.valid).toBe(false);
    });

    it('should reject CSV without header', () => {
      const result = validateClassicPredictions('n0001,0.5');
      expect(result.valid).toBe(false);
    });

    it('should reject missing required columns', () => {
      const csv = 'name,value\ntest,0.5';
      const result = validateClassicPredictions(csv);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should warn about invalid predictions', () => {
      const csv = 'id,prediction\nn0001,2.0\nn0002,0.5';
      const result = validateClassicPredictions(csv);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should count rows correctly', () => {
      const csv = 'id,prediction\nn0001,0.5\nn0002,0.3\nn0003,0.7';
      const result = validateClassicPredictions(csv);
      expect(result.rowCount).toBe(3);
    });
  });

  describe('validateSignalsPredictions', () => {
    it('should validate correct Signals CSV', () => {
      const csv = 'numerai_ticker,signal\nAAPL,0.5\nGOOG,0.3';
      const result = validateSignalsPredictions(csv);
      expect(result.valid).toBe(true);
    });

    it('should accept alternative column names', () => {
      const csv = 'ticker,prediction\nAAPL,0.5\nGOOG,0.3';
      const result = validateSignalsPredictions(csv);
      expect(result.valid).toBe(true);
    });

    it('should reject missing columns', () => {
      const csv = 'name,value\ntest,0.5';
      const result = validateSignalsPredictions(csv);
      expect(result.valid).toBe(false);
    });
  });

  describe('generateSampleClassicCSV', () => {
    it('should generate valid sample CSV', () => {
      const ids = ['n0001', 'n0002', 'n0003', 'n0004', 'n0005'];
      const csv = generateSampleClassicCSV(ids);
      const result = validateClassicPredictions(csv);
      expect(result.valid).toBe(true);
      expect(result.rowCount).toBe(5);
    });

    it('should generate specified number of rows', () => {
      const ids = Array.from({ length: 10 }, (_, i) => `n${String(i).padStart(4, '0')}`);
      const csv = generateSampleClassicCSV(ids);
      const lines = csv.trim().split('\n');
      expect(lines.length).toBe(11); // header + 10 rows
    });
  });

  describe('generateSampleSignalsCSV', () => {
    it('should generate valid sample CSV', () => {
      const tickers = ['AAPL', 'GOOG', 'MSFT'];
      const csv = generateSampleSignalsCSV(tickers);
      const result = validateSignalsPredictions(csv);
      expect(result.valid).toBe(true);
    });

    it('should include all provided tickers', () => {
      const tickers = ['AAPL', 'GOOG'];
      const csv = generateSampleSignalsCSV(tickers);
      expect(csv.includes('AAPL')).toBe(true);
      expect(csv.includes('GOOG')).toBe(true);
    });
  });

  describe('Required columns', () => {
    it('should define Classic required columns', () => {
      expect(CLASSIC_REQUIRED_COLUMNS).toContain('id');
      expect(CLASSIC_REQUIRED_COLUMNS).toContain('prediction');
    });

    it('should define Signals required columns', () => {
      expect(SIGNALS_REQUIRED_COLUMNS).toContain('numerai_ticker');
      expect(SIGNALS_REQUIRED_COLUMNS).toContain('signal');
    });
  });
});
