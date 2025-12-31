/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Score types available in Numerai
 */
export enum ScoreType {
  CORR = 'corr',
  CORR20 = 'corr20',
  CORR20V2 = 'corr20v2',
  TC = 'tc',
  FNC = 'fnc',
  FNC_V3 = 'fncV3',
  MMC = 'mmc',
  BMC = 'bmc',
  CORR_META = 'corrMeta',
  IC = 'ic',
  RIC = 'ric',
}

/**
 * Score type display names
 */
export const SCORE_TYPE_NAMES: Record<ScoreType, string> = {
  [ScoreType.CORR]: 'Correlation',
  [ScoreType.CORR20]: 'Correlation 20',
  [ScoreType.CORR20V2]: 'Correlation 20 V2',
  [ScoreType.TC]: 'True Contribution',
  [ScoreType.FNC]: 'Feature Neutral Correlation',
  [ScoreType.FNC_V3]: 'Feature Neutral Correlation V3',
  [ScoreType.MMC]: 'Meta Model Contribution',
  [ScoreType.BMC]: 'Bonus Meta Contribution',
  [ScoreType.CORR_META]: 'Correlation Meta',
  [ScoreType.IC]: 'Information Coefficient',
  [ScoreType.RIC]: 'Rank Information Coefficient',
};

/**
 * Score type options for n8n dropdown
 */
export const SCORE_TYPE_OPTIONS = Object.entries(SCORE_TYPE_NAMES).map(([value, name]) => ({
  name,
  value,
}));

/**
 * Performance metrics
 */
export enum PerformanceMetric {
  CORR = 'corr',
  MMC = 'mmc',
  TC = 'tc',
  FNC = 'fnc',
  CORR_PERCENTILE = 'corrPercentile',
  MMC_PERCENTILE = 'mmcPercentile',
  TC_PERCENTILE = 'tcPercentile',
  PAYOUT = 'payout',
  RETURN = 'return',
}

/**
 * Payout factors
 */
export const PAYOUT_FACTORS = {
  CORR_MULTIPLIER: 0.5,
  TC_MULTIPLIER: 1.0,
  MMC_MULTIPLIER: 2.0,
  BMC_MULTIPLIER: 3.0,
} as const;

/**
 * Stake limits
 */
export const STAKE_LIMITS = {
  MIN_STAKE: 0,
  MAX_STAKE: 500000,
  MIN_CHANGE: 0.0001,
} as const;
