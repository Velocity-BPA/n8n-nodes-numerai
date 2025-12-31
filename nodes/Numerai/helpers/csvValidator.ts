/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Prediction CSV validation result
 */
export interface IValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
  columns: string[];
}

/**
 * Required columns for Classic tournament predictions
 */
export const CLASSIC_REQUIRED_COLUMNS = ['id', 'prediction'];

/**
 * Required columns for Signals tournament predictions
 */
export const SIGNALS_REQUIRED_COLUMNS = ['numerai_ticker', 'signal'];

/**
 * Alternative column names for Signals
 */
export const SIGNALS_ALTERNATIVE_COLUMNS = {
  numerai_ticker: ['ticker', 'bloomberg_ticker', 'numerai_ticker'],
  signal: ['signal', 'prediction', 'target'],
};

/**
 * Validate prediction CSV content for Numerai Classic
 * @param content - CSV content as string
 * @returns Validation result
 */
export function validateClassicPredictions(content: string): IValidationResult {
  const result: IValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    rowCount: 0,
    columnCount: 0,
    columns: [],
  };

  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    result.valid = false;
    result.errors.push('CSV must contain at least a header row and one data row');
    return result;
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  result.columns = header;
  result.columnCount = header.length;
  result.rowCount = lines.length - 1;

  // Check required columns
  const lowerHeader = header.map((h) => h.toLowerCase().trim());

  if (!lowerHeader.includes('id')) {
    result.valid = false;
    result.errors.push('Missing required column: id');
  }

  if (!lowerHeader.includes('prediction')) {
    result.valid = false;
    result.errors.push('Missing required column: prediction');
  }

  if (!result.valid) {
    return result;
  }

  // Find column indices
  const idIndex = lowerHeader.indexOf('id');
  const predictionIndex = lowerHeader.indexOf('prediction');

  // Validate data rows
  let invalidPredictions = 0;
  let outOfRangePredictions = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);

    if (row.length !== header.length) {
      result.warnings.push(`Row ${i + 1} has ${row.length} columns, expected ${header.length}`);
      continue;
    }

    const prediction = parseFloat(row[predictionIndex]);

    if (isNaN(prediction)) {
      invalidPredictions++;
    } else if (prediction < 0 || prediction > 1) {
      outOfRangePredictions++;
    }

    // Check for empty ID
    if (!row[idIndex] || row[idIndex].trim() === '') {
      result.warnings.push(`Row ${i + 1} has empty id`);
    }
  }

  if (invalidPredictions > 0) {
    result.warnings.push(`${invalidPredictions} rows have invalid prediction values`);
  }

  if (outOfRangePredictions > 0) {
    result.warnings.push(
      `${outOfRangePredictions} predictions are outside the recommended range [0, 1]`,
    );
  }

  // Check for reasonable row count
  if (result.rowCount < 1000) {
    result.warnings.push(
      `Only ${result.rowCount} predictions - Numerai typically expects ~5000 predictions per round`,
    );
  }

  return result;
}

/**
 * Validate prediction CSV content for Numerai Signals
 * @param content - CSV content as string
 * @returns Validation result
 */
export function validateSignalsPredictions(content: string): IValidationResult {
  const result: IValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    rowCount: 0,
    columnCount: 0,
    columns: [],
  };

  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    result.valid = false;
    result.errors.push('CSV must contain at least a header row and one data row');
    return result;
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  result.columns = header;
  result.columnCount = header.length;
  result.rowCount = lines.length - 1;

  // Check required columns
  const lowerHeader = header.map((h) => h.toLowerCase().trim());

  // Find ticker column
  let tickerIndex = -1;
  for (const alt of SIGNALS_ALTERNATIVE_COLUMNS.numerai_ticker) {
    const idx = lowerHeader.indexOf(alt.toLowerCase());
    if (idx !== -1) {
      tickerIndex = idx;
      break;
    }
  }

  if (tickerIndex === -1) {
    result.valid = false;
    result.errors.push(
      'Missing required column: numerai_ticker (or ticker, bloomberg_ticker)',
    );
  }

  // Find signal column
  let signalIndex = -1;
  for (const alt of SIGNALS_ALTERNATIVE_COLUMNS.signal) {
    const idx = lowerHeader.indexOf(alt.toLowerCase());
    if (idx !== -1) {
      signalIndex = idx;
      break;
    }
  }

  if (signalIndex === -1) {
    result.valid = false;
    result.errors.push('Missing required column: signal (or prediction, target)');
  }

  if (!result.valid) {
    return result;
  }

  // Validate data rows
  let invalidSignals = 0;
  let outOfRangeSignals = 0;
  const uniqueTickers = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);

    if (row.length !== header.length) {
      result.warnings.push(`Row ${i + 1} has ${row.length} columns, expected ${header.length}`);
      continue;
    }

    const signal = parseFloat(row[signalIndex]);
    const ticker = row[tickerIndex];

    if (isNaN(signal)) {
      invalidSignals++;
    } else if (signal < 0 || signal > 1) {
      outOfRangeSignals++;
    }

    if (ticker) {
      uniqueTickers.add(ticker.trim());
    }
  }

  if (invalidSignals > 0) {
    result.warnings.push(`${invalidSignals} rows have invalid signal values`);
  }

  if (outOfRangeSignals > 0) {
    result.warnings.push(`${outOfRangeSignals} signals are outside the recommended range [0, 1]`);
  }

  // Check for reasonable submission
  if (uniqueTickers.size < 100) {
    result.warnings.push(
      `Only ${uniqueTickers.size} unique tickers - Signals typically expects hundreds of predictions`,
    );
  }

  return result;
}

/**
 * Parse a CSV line, handling quoted values
 * @param line - CSV line
 * @returns Array of values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Generate sample predictions CSV for Classic tournament
 * @param ids - Array of IDs
 * @returns CSV content
 */
export function generateSampleClassicCSV(ids: string[]): string {
  const header = 'id,prediction\n';
  const rows = ids.map((id) => `${id},${(Math.random() * 0.5 + 0.25).toFixed(4)}`).join('\n');
  return header + rows;
}

/**
 * Generate sample predictions CSV for Signals tournament
 * @param tickers - Array of ticker symbols
 * @returns CSV content
 */
export function generateSampleSignalsCSV(tickers: string[]): string {
  const header = 'numerai_ticker,signal\n';
  const rows = tickers.map((ticker) => `${ticker},${(Math.random() * 0.5 + 0.25).toFixed(4)}`).join('\n');
  return header + rows;
}
