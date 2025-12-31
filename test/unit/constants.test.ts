/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  Tournament,
  TOURNAMENT_IDS,
  TOURNAMENT_NAMES,
  API_ENDPOINTS,
  TOURNAMENT_OPTIONS,
  RoundState,
  SubmissionState,
} from '../../nodes/Numerai/constants/tournaments';

import {
  ScoreType,
  PAYOUT_FACTORS,
  STAKE_LIMITS,
} from '../../nodes/Numerai/constants/scores';

import {
  DatasetType,
  DatasetFormat,
  FEATURE_GROUPS,
  TargetType,
  DATASET_TYPE_OPTIONS,
  DATASET_FORMAT_OPTIONS,
} from '../../nodes/Numerai/constants/datasets';

describe('Tournament Constants', () => {
  describe('Tournament enum', () => {
    it('should have Classic and Signals', () => {
      expect(Tournament.CLASSIC).toBe('classic');
      expect(Tournament.SIGNALS).toBe('signals');
    });
  });

  describe('TOURNAMENT_IDS', () => {
    it('should map tournaments to correct IDs', () => {
      expect(TOURNAMENT_IDS[Tournament.CLASSIC]).toBe(1);
      expect(TOURNAMENT_IDS[Tournament.SIGNALS]).toBe(11);
    });
  });

  describe('TOURNAMENT_NAMES', () => {
    it('should map tournaments to names', () => {
      expect(TOURNAMENT_NAMES[Tournament.CLASSIC]).toBe('Numerai Classic');
      expect(TOURNAMENT_NAMES[Tournament.SIGNALS]).toBe('Numerai Signals');
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have GraphQL endpoint', () => {
      expect(API_ENDPOINTS.GRAPHQL).toBe('https://api-tournament.numer.ai/');
    });
  });

  describe('TOURNAMENT_OPTIONS', () => {
    it('should have dropdown options', () => {
      expect(TOURNAMENT_OPTIONS.length).toBe(2);
      expect(TOURNAMENT_OPTIONS[0].value).toBe(Tournament.CLASSIC);
    });
  });

  describe('RoundState enum', () => {
    it('should have all states', () => {
      expect(RoundState.OPEN).toBe('OPEN');
      expect(RoundState.CLOSED).toBe('CLOSED');
      expect(RoundState.RESOLVED).toBe('RESOLVED');
      expect(RoundState.PENDING).toBe('PENDING');
    });
  });

  describe('SubmissionState enum', () => {
    it('should have all states', () => {
      expect(SubmissionState.PENDING).toBe('pending');
      expect(SubmissionState.VALIDATED).toBe('validated');
      expect(SubmissionState.SCORED).toBe('scored');
    });
  });
});

describe('Score Constants', () => {
  describe('ScoreType enum', () => {
    it('should have all score types', () => {
      expect(ScoreType.CORR).toBe('corr');
      expect(ScoreType.TC).toBe('tc');
      expect(ScoreType.MMC).toBe('mmc');
    });
  });

  describe('PAYOUT_FACTORS', () => {
    it('should have multipliers', () => {
      expect(PAYOUT_FACTORS.CORR_MULTIPLIER).toBeDefined();
      expect(PAYOUT_FACTORS.TC_MULTIPLIER).toBeDefined();
    });
  });

  describe('STAKE_LIMITS', () => {
    it('should have min and max', () => {
      expect(STAKE_LIMITS.MIN_STAKE).toBe(0);
      expect(STAKE_LIMITS.MAX_STAKE).toBe(500000);
    });
  });
});

describe('Dataset Constants', () => {
  describe('DatasetType enum', () => {
    it('should have all types', () => {
      expect(DatasetType.TRAINING).toBe('training');
      expect(DatasetType.VALIDATION).toBe('validation');
      expect(DatasetType.LIVE).toBe('live');
    });
  });

  describe('DatasetFormat enum', () => {
    it('should have CSV and Parquet', () => {
      expect(DatasetFormat.CSV).toBe('csv');
      expect(DatasetFormat.PARQUET).toBe('parquet');
    });
  });

  describe('FEATURE_GROUPS', () => {
    it('should have feature groups', () => {
      expect(FEATURE_GROUPS.SMALL).toBe('small');
      expect(FEATURE_GROUPS.MEDIUM).toBe('medium');
      expect(FEATURE_GROUPS.ALL).toBe('all');
    });
  });

  describe('Dataset options', () => {
    it('should have dropdown options', () => {
      expect(DATASET_TYPE_OPTIONS.length).toBeGreaterThan(0);
      expect(DATASET_FORMAT_OPTIONS.length).toBeGreaterThan(0);
    });
  });
});
