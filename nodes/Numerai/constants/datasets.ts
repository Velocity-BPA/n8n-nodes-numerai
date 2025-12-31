/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Dataset types available for download
 */
export enum DatasetType {
  TRAINING = 'training',
  VALIDATION = 'validation',
  LIVE = 'live',
  EXAMPLE = 'example',
  META_MODEL = 'meta_model',
  FEATURES = 'features',
}

/**
 * Dataset type display names
 */
export const DATASET_TYPE_NAMES: Record<DatasetType, string> = {
  [DatasetType.TRAINING]: 'Training Data',
  [DatasetType.VALIDATION]: 'Validation Data',
  [DatasetType.LIVE]: 'Live Tournament Data',
  [DatasetType.EXAMPLE]: 'Example Predictions',
  [DatasetType.META_MODEL]: 'Meta Model Data',
  [DatasetType.FEATURES]: 'Feature Metadata',
};

/**
 * Dataset type options for n8n dropdown
 */
export const DATASET_TYPE_OPTIONS = Object.entries(DATASET_TYPE_NAMES).map(([value, name]) => ({
  name,
  value,
}));

/**
 * Dataset file formats
 */
export enum DatasetFormat {
  CSV = 'csv',
  PARQUET = 'parquet',
}

/**
 * Dataset format options
 */
export const DATASET_FORMAT_OPTIONS = [
  {
    name: 'CSV',
    value: DatasetFormat.CSV,
    description: 'Comma-separated values',
  },
  {
    name: 'Parquet',
    value: DatasetFormat.PARQUET,
    description: 'Apache Parquet format (recommended for large files)',
  },
];

/**
 * Feature groups in Numerai datasets
 */
export const FEATURE_GROUPS = {
  SMALL: 'small',
  MEDIUM: 'medium',
  ALL: 'all',
  LEGACY: 'legacy',
} as const;

/**
 * Feature group options
 */
export const FEATURE_GROUP_OPTIONS = [
  {
    name: 'Small',
    value: FEATURE_GROUPS.SMALL,
    description: 'Minimal feature set for quick experimentation',
  },
  {
    name: 'Medium',
    value: FEATURE_GROUPS.MEDIUM,
    description: 'Medium feature set with balanced coverage',
  },
  {
    name: 'All',
    value: FEATURE_GROUPS.ALL,
    description: 'Full feature set for comprehensive models',
  },
  {
    name: 'Legacy',
    value: FEATURE_GROUPS.LEGACY,
    description: 'Legacy feature set for backward compatibility',
  },
];

/**
 * Target types
 */
export enum TargetType {
  TARGET = 'target',
  TARGET_NOMI_V4_20 = 'target_nomi_v4_20',
  TARGET_NOMI_V4_60 = 'target_nomi_v4_60',
  TARGET_JEROME_V4_20 = 'target_jerome_v4_20',
  TARGET_JEROME_V4_60 = 'target_jerome_v4_60',
  TARGET_RALPH_V4_20 = 'target_ralph_v4_20',
  TARGET_RALPH_V4_60 = 'target_ralph_v4_60',
}

/**
 * Target type options
 */
export const TARGET_TYPE_OPTIONS = [
  { name: 'Default Target', value: TargetType.TARGET },
  { name: 'Nomi V4 20-day', value: TargetType.TARGET_NOMI_V4_20 },
  { name: 'Nomi V4 60-day', value: TargetType.TARGET_NOMI_V4_60 },
  { name: 'Jerome V4 20-day', value: TargetType.TARGET_JEROME_V4_20 },
  { name: 'Jerome V4 60-day', value: TargetType.TARGET_JEROME_V4_60 },
  { name: 'Ralph V4 20-day', value: TargetType.TARGET_RALPH_V4_20 },
  { name: 'Ralph V4 60-day', value: TargetType.TARGET_RALPH_V4_60 },
];

/**
 * Signals specific datasets
 */
export enum SignalsDataset {
  UNIVERSE = 'universe',
  HISTORICAL_TARGETS = 'historical_targets',
  LIVE_UNIVERSE = 'live_universe',
  TICKER_MAP = 'ticker_map',
}

/**
 * Signals dataset options
 */
export const SIGNALS_DATASET_OPTIONS = [
  {
    name: 'Stock Universe',
    value: SignalsDataset.UNIVERSE,
    description: 'Current stock universe for Signals',
  },
  {
    name: 'Historical Targets',
    value: SignalsDataset.HISTORICAL_TARGETS,
    description: 'Historical target values for backtesting',
  },
  {
    name: 'Live Universe',
    value: SignalsDataset.LIVE_UNIVERSE,
    description: 'Current live trading universe',
  },
  {
    name: 'Ticker Map',
    value: SignalsDataset.TICKER_MAP,
    description: 'Mapping of tickers to Numerai IDs',
  },
];
