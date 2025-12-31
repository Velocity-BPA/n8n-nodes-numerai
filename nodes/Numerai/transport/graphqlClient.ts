/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, ILoadOptionsFunctions, IHookFunctions, IPollFunctions } from 'n8n-workflow';
import { GraphQLClient, gql } from 'graphql-request';
import { API_ENDPOINTS } from '../constants';

/**
 * Numerai API credentials interface
 */
export interface INumeraiCredentials {
  publicId: string;
  secretKey: string;
  tournament: string;
}

/**
 * GraphQL query variables type
 */
export type GraphQLVariables = Record<string, unknown>;

/**
 * Create authorization header for Numerai API
 */
export function createAuthHeader(credentials: INumeraiCredentials): string {
  return `Token ${credentials.publicId}$${credentials.secretKey}`;
}

/**
 * Create GraphQL client for Numerai API
 */
export function createGraphQLClient(credentials: INumeraiCredentials): GraphQLClient {
  const client = new GraphQLClient(API_ENDPOINTS.GRAPHQL, {
    headers: {
      Authorization: createAuthHeader(credentials),
      'Content-Type': 'application/json',
    },
  });
  return client;
}

/**
 * Execute a GraphQL query against the Numerai API
 * Returns any to allow flexible property access with type assertions at call sites
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeGraphQL(
  this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IPollFunctions,
  query: string,
  variables?: GraphQLVariables,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const credentials = (await this.getCredentials('numeraiApi')) as INumeraiCredentials;
  const client = createGraphQLClient(credentials);

  try {
    const result = await client.request(gql`${query}`, variables);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Numerai API Error: ${errorMessage}`);
  }
}

/**
 * Execute a GraphQL mutation against the Numerai API
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeMutation(
  this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IPollFunctions,
  mutation: string,
  variables?: GraphQLVariables,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  return executeGraphQL.call(this, mutation, variables);
}

/**
 * Common GraphQL Queries
 */
export const QUERIES = {
  // Round queries
  GET_ROUNDS: `
    query getRounds($tournament: Int!) {
      rounds(tournament: $tournament) {
        number
        openTime
        closeTime
        closeStakingTime
        resolveTime
      }
    }
  `,

  GET_CURRENT_ROUND: `
    query getCurrentRound {
      rounds {
        number
        openTime
        closeTime
        closeStakingTime
        resolveTime
      }
    }
  `,

  GET_ROUND_BY_NUMBER: `
    query getRound($roundNumber: Int!) {
      rounds(number: $roundNumber) {
        number
        openTime
        closeTime
        closeStakingTime
        resolveTime
      }
    }
  `,

  // Model queries
  GET_MODELS: `
    query getModels {
      v3UserProfile {
        models {
          id
          name
          tournament
          nmrStaked
          corrRep
          mmcRep
          tcRep
          fncRep
        }
      }
    }
  `,

  GET_MODEL: `
    query getModel($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          id
          name
          tournament
          nmrStaked
          corrRep
          mmcRep
          tcRep
          fncRep
        }
      }
    }
  `,

  GET_MODEL_PERFORMANCE: `
    query getModelPerformance($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          id
          name
          roundModelPerformances {
            roundNumber
            corr
            corr20
            corr20V2
            tc
            mmc
            fnc
            fncV3
            corrPercentile
            mmcPercentile
            tcPercentile
            payout
            roundResolved
          }
        }
      }
    }
  `,

  GET_MODEL_RANK: `
    query getModelRank($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          id
          name
          rank
          corrRank
          mmcRank
          tcRank
        }
      }
    }
  `,

  // Account queries
  GET_ACCOUNT: `
    query getAccount {
      v3UserProfile {
        id
        username
        walletAddress
        availableNmr
        availableUsd
        email
        status
        mfaEnabled
      }
    }
  `,

  GET_ACCOUNT_BALANCE: `
    query getAccountBalance {
      v3UserProfile {
        availableNmr
        availableUsd
        pendingNmr
        stakedNmr
      }
    }
  `,

  GET_TRANSACTIONS: `
    query getTransactions {
      v3UserProfile {
        nmrTransactions {
          id
          time
          type
          amount
          from
          to
          status
        }
      }
    }
  `,

  GET_EARNINGS: `
    query getEarnings {
      v3UserProfile {
        models {
          name
          roundModelPerformances {
            roundNumber
            payout
            corrPayout
            tcPayout
            mmcPayout
          }
        }
      }
    }
  `,

  GET_PAYOUT_HISTORY: `
    query getPayoutHistory {
      v3UserProfile {
        payouts {
          id
          roundNumber
          amount
          timestamp
          status
          modelName
        }
      }
    }
  `,

  // Stake queries
  GET_STAKE: `
    query getStake($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          id
          name
          nmrStaked
          corrRep
          tcRep
          mmcRep
        }
      }
    }
  `,

  GET_ALL_STAKES: `
    query getAllStakes {
      v3UserProfile {
        models {
          id
          name
          nmrStaked
          corrRep
          tcRep
          mmcRep
          stake {
            value
            confidence
          }
        }
      }
    }
  `,

  GET_STAKE_HISTORY: `
    query getStakeHistory($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          stakeHistory {
            date
            nmrStaked
            action
            amount
          }
        }
      }
    }
  `,

  GET_PENDING_STAKE_CHANGES: `
    query getPendingStakeChanges($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          pendingStakeChange {
            requestedAmount
            type
            requestedAt
            effectiveDate
          }
        }
      }
    }
  `,

  // Dataset queries
  GET_DATASET_URLS: `
    query getDatasetUrls($round: Int) {
      dataset(round: $round) {
        round
        trainingDataUrl
        validationDataUrl
        liveDataUrl
        examplePredictionsUrl
        metaModelUrl
        featuresUrl
      }
    }
  `,

  GET_CURRENT_DATASET: `
    query getCurrentDataset {
      dataset {
        round
        trainingDataUrl
        validationDataUrl
        liveDataUrl
        examplePredictionsUrl
      }
    }
  `,

  GET_FEATURE_METADATA: `
    query getFeatureMetadata {
      dataset {
        featureMetadata {
          name
          type
          description
          importance
        }
      }
    }
  `,

  GET_TARGET_INFO: `
    query getTargetInfo {
      dataset {
        targetInfo {
          name
          description
          horizon
        }
      }
    }
  `,

  // Leaderboard queries
  GET_TOURNAMENT_LEADERBOARD: `
    query getTournamentLeaderboard($limit: Int, $offset: Int) {
      v2Leaderboard(limit: $limit, offset: $offset) {
        username
        rank
        reputation
        stakeValue
        corrRep
        mmcRep
        tcRep
        threeMonthReturn
        oneYearReturn
      }
    }
  `,

  GET_MODEL_LEADERBOARD_POSITION: `
    query getModelLeaderboardPosition($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          leaderboardPosition {
            rank
            percentile
          }
        }
      }
    }
  `,

  GET_TOP_PERFORMERS: `
    query getTopPerformers($limit: Int!) {
      v2Leaderboard(limit: $limit) {
        username
        rank
        reputation
        stakeValue
        threeMonthReturn
      }
    }
  `,

  GET_REPUTATION_RANKINGS: `
    query getReputationRankings($limit: Int!) {
      v2Leaderboard(limit: $limit, orderBy: "reputation") {
        username
        reputation
        corrRep
        mmcRep
        tcRep
      }
    }
  `,

  GET_V2_LEADERBOARD: `
    query getV2Leaderboard($limit: Int, $offset: Int, $orderBy: String) {
      v2Leaderboard(limit: $limit, offset: $offset, orderBy: $orderBy) {
        username
        rank
        reputation
        stakeValue
        corrRep
        mmcRep
        tcRep
        fncRep
        threeMonthReturn
        oneYearReturn
      }
    }
  `,

  // Signals queries
  GET_SIGNAL_UNIVERSE: `
    query getSignalUniverse {
      signalsUniverse {
        bloomberg_ticker
        numerai_ticker
        signal_id
      }
    }
  `,

  GET_SIGNALS_DIAGNOSTICS: `
    query getSignalsDiagnostics($modelName: String!) {
      signalsUserProfile {
        models(modelName: $modelName) {
          diagnostics {
            validationStats {
              mean
              std
              sharpe
              maxDrawdown
            }
          }
        }
      }
    }
  `,

  GET_SIGNALS_SUBMISSION: `
    query getSignalsSubmission($modelName: String!) {
      signalsUserProfile {
        models(modelName: $modelName) {
          latestSubmission {
            id
            filename
            state
            selectedCols
            createdAt
          }
        }
      }
    }
  `,

  GET_HISTORICAL_TARGETS: `
    query getHistoricalTargets {
      signalsDataset {
        historicalTargetsUrl
      }
    }
  `,

  // Diagnostics queries
  GET_MODEL_DIAGNOSTICS: `
    query getModelDiagnostics($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          diagnostics {
            validationCorrMean
            validationCorrStd
            validationCorrSharpe
            validationMmcMean
            validationMmcStd
            validationMmcSharpe
            validationFeatureNeutralMean
            validationMaxDrawdown
            validationMaxFeatureExposure
          }
        }
      }
    }
  `,

  GET_VALIDATION_STATS: `
    query getValidationStats($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          diagnostics {
            validationCorrMean
            validationCorrStd
            validationCorrSharpe
          }
        }
      }
    }
  `,

  GET_FEATURE_EXPOSURE: `
    query getFeatureExposure($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          diagnostics {
            validationMaxFeatureExposure
            featureExposure {
              feature
              exposure
            }
          }
        }
      }
    }
  `,

  GET_CORRELATION: `
    query getCorrelation($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          diagnostics {
            validationCorrMean
            validationCorrStd
            validationCorrSharpe
          }
        }
      }
    }
  `,

  GET_SHARPE_RATIO: `
    query getSharpeRatio($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          diagnostics {
            validationCorrSharpe
            validationMmcSharpe
            validationTcSharpe
          }
        }
      }
    }
  `,

  GET_MAX_DRAWDOWN: `
    query getMaxDrawdown($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          diagnostics {
            validationMaxDrawdown
          }
        }
      }
    }
  `,

  // Submission queries
  GET_SUBMISSION_STATUS: `
    query getSubmissionStatus($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          latestSubmission {
            id
            filename
            state
            createdAt
          }
        }
      }
    }
  `,

  GET_SUBMISSION_INFO: `
    query getSubmissionInfo($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          submissions {
            id
            filename
            state
            selectedCols
            createdAt
            roundNumber
          }
        }
      }
    }
  `,

  GET_DAILY_SUBMISSIONS: `
    query getDailySubmissions($modelName: String!) {
      v3UserProfile {
        models(modelName: $modelName) {
          dailySubmissions {
            date
            count
            submissions {
              id
              filename
              state
            }
          }
        }
      }
    }
  `,
};

/**
 * Common GraphQL Mutations
 */
export const MUTATIONS = {
  CREATE_MODEL: `
    mutation createModel($name: String!, $tournament: Int!) {
      createModel(name: $name, tournament: $tournament) {
        id
        name
        tournament
      }
    }
  `,

  UPLOAD_PREDICTIONS: `
    mutation uploadPredictions($filename: String!, $modelId: String!) {
      uploadPredictions(filename: $filename, modelId: $modelId) {
        id
        filename
        state
      }
    }
  `,

  UPLOAD_MODEL: `
    mutation uploadModel($filename: String!, $modelId: String!) {
      uploadModel(filename: $filename, modelId: $modelId) {
        id
        filename
      }
    }
  `,

  INCREASE_STAKE: `
    mutation increaseStake($modelId: String!, $amount: String!) {
      changeStake(modelId: $modelId, nmr: $amount) {
        success
        message
      }
    }
  `,

  DECREASE_STAKE: `
    mutation decreaseStake($modelId: String!, $amount: String!) {
      changeStake(modelId: $modelId, nmr: $amount) {
        success
        message
      }
    }
  `,

  SET_TARGET_STAKE: `
    mutation setTargetStake($modelId: String!, $targetStake: String!) {
      setTargetStake(modelId: $modelId, targetStake: $targetStake) {
        success
        message
      }
    }
  `,

  DRAIN_STAKE: `
    mutation drainStake($modelId: String!) {
      drainStake(modelId: $modelId) {
        success
        message
      }
    }
  `,

  UPLOAD_SIGNALS: `
    mutation uploadSignals($filename: String!, $modelId: String!) {
      uploadSignals(filename: $filename, modelId: $modelId) {
        id
        filename
        state
      }
    }
  `,
};

export { gql };
