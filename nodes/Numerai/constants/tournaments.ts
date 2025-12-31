/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Numerai Tournament Types
 */
export enum Tournament {
  CLASSIC = 'classic',
  SIGNALS = 'signals',
}

/**
 * Tournament IDs
 */
export const TOURNAMENT_IDS: Record<Tournament, number> = {
  [Tournament.CLASSIC]: 1,
  [Tournament.SIGNALS]: 11,
};

/**
 * Tournament Names
 */
export const TOURNAMENT_NAMES: Record<Tournament, string> = {
  [Tournament.CLASSIC]: 'Numerai Classic',
  [Tournament.SIGNALS]: 'Numerai Signals',
};

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  GRAPHQL: 'https://api-tournament.numer.ai/',
  CLASSIC_GRAPHQL: 'https://api-tournament.numer.ai/',
  SIGNALS_GRAPHQL: 'https://api-tournament.numer.ai/',
} as const;

/**
 * Tournament options for n8n dropdown
 */
export const TOURNAMENT_OPTIONS = [
  {
    name: 'Classic',
    value: Tournament.CLASSIC,
    description: 'Numerai Classic - Stock market predictions',
  },
  {
    name: 'Signals',
    value: Tournament.SIGNALS,
    description: 'Numerai Signals - Custom signal predictions',
  },
];

/**
 * Round states
 */
export enum RoundState {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RESOLVED = 'RESOLVED',
  PENDING = 'PENDING',
}

/**
 * Submission states
 */
export enum SubmissionState {
  PENDING = 'pending',
  VALIDATING = 'validating',
  VALIDATED = 'validated',
  INVALID = 'invalid',
  QUEUED = 'queued',
  SCORING = 'scoring',
  SCORED = 'scored',
  FAILED = 'failed',
}
