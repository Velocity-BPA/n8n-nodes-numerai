/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { executeGraphQL, QUERIES } from '../../transport';
import { formatNmr } from '../../helpers';

/**
 * Leaderboard resource properties
 */
export const leaderboardProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['leaderboard'],
      },
    },
    options: [
      {
        name: 'Get Tournament Leaderboard',
        value: 'tournament',
        description: 'Get the tournament leaderboard',
        action: 'Get tournament leaderboard',
      },
      {
        name: 'Get Model Position',
        value: 'modelPosition',
        description: 'Get leaderboard position for a specific model',
        action: 'Get model leaderboard position',
      },
      {
        name: 'Get Top Performers',
        value: 'topPerformers',
        description: 'Get top performing models',
        action: 'Get top performers',
      },
      {
        name: 'Get Reputation Rankings',
        value: 'reputation',
        description: 'Get rankings by reputation score',
        action: 'Get reputation rankings',
      },
      {
        name: 'Get V2 Leaderboard',
        value: 'v2',
        description: 'Get detailed V2 leaderboard with all metrics',
        action: 'Get V2 leaderboard',
      },
    ],
    default: 'tournament',
  },
  // Limit
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 100,
    displayOptions: {
      show: {
        resource: ['leaderboard'],
        operation: ['tournament', 'topPerformers', 'reputation', 'v2'],
      },
    },
    description: 'Maximum number of entries to return',
  },
  // Offset for pagination
  {
    displayName: 'Offset',
    name: 'offset',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['leaderboard'],
        operation: ['tournament', 'v2'],
      },
    },
    description: 'Number of entries to skip (for pagination)',
  },
  // Model name for position lookup
  {
    displayName: 'Model Name',
    name: 'modelName',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['leaderboard'],
        operation: ['modelPosition'],
      },
    },
    description: 'The name of the model to look up',
  },
  // Order by for V2 leaderboard
  {
    displayName: 'Order By',
    name: 'orderBy',
    type: 'options',
    options: [
      { name: 'Rank', value: 'rank' },
      { name: 'Reputation', value: 'reputation' },
      { name: 'Stake Value', value: 'stakeValue' },
      { name: 'Correlation Rep', value: 'corrRep' },
      { name: 'MMC Rep', value: 'mmcRep' },
      { name: 'TC Rep', value: 'tcRep' },
      { name: '3 Month Return', value: 'threeMonthReturn' },
      { name: '1 Year Return', value: 'oneYearReturn' },
    ],
    default: 'rank',
    displayOptions: {
      show: {
        resource: ['leaderboard'],
        operation: ['v2'],
      },
    },
    description: 'Field to sort by',
  },
];

/**
 * Leaderboard entry interface
 */
interface ILeaderboardEntry {
  username: string;
  rank: number;
  reputation: number;
  stakeValue: string;
  corrRep: number;
  mmcRep: number;
  tcRep: number;
  fncRep?: number;
  threeMonthReturn: number;
  oneYearReturn: number;
}

/**
 * Model position interface
 */
interface IModelPosition {
  rank: number;
  percentile: number;
}

interface ILeaderboardResponse {
  v2Leaderboard: ILeaderboardEntry[];
}

interface IModelPositionResponse {
  v3UserProfile: {
    models: Array<{
      leaderboardPosition: IModelPosition;
    }>;
  };
}

/**
 * Execute leaderboard operations
 */
export async function executeLeaderboardOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];

  switch (operation) {
    case 'tournament': {
      const limit = this.getNodeParameter('limit', i) as number;
      const offset = this.getNodeParameter('offset', i) as number;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_TOURNAMENT_LEADERBOARD,
        { limit, offset },
      );

      if (response.v2Leaderboard) {
        for (const entry of response.v2Leaderboard) {
          returnData.push({
            json: {
              ...entry,
              stakeValueFormatted: formatNmr(entry.stakeValue),
              threeMonthReturnFormatted: `${(entry.threeMonthReturn * 100).toFixed(2)}%`,
              oneYearReturnFormatted: `${(entry.oneYearReturn * 100).toFixed(2)}%`,
            },
          });
        }

        // Add pagination info
        returnData.push({
          json: {
            _pagination: true,
            offset,
            limit,
            count: response.v2Leaderboard.length,
            hasMore: response.v2Leaderboard.length === limit,
          },
        });
      }
      break;
    }

    case 'modelPosition': {
      const modelName = this.getNodeParameter('modelName', i) as string;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_MODEL_LEADERBOARD_POSITION,
        { modelName },
      );

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        const position = response.v3UserProfile.models[0].leaderboardPosition;
        returnData.push({
          json: {
            modelName,
            rank: position?.rank,
            percentile: position?.percentile,
            percentileFormatted: position?.percentile
              ? `Top ${(position.percentile * 100).toFixed(1)}%`
              : null,
          },
        });
      }
      break;
    }

    case 'topPerformers': {
      const limit = this.getNodeParameter('limit', i) as number;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_TOP_PERFORMERS,
        { limit },
      );

      if (response.v2Leaderboard) {
        for (const entry of response.v2Leaderboard) {
          returnData.push({
            json: {
              position: entry.rank,
              username: entry.username,
              reputation: entry.reputation,
              stakeValue: entry.stakeValue,
              stakeValueFormatted: formatNmr(entry.stakeValue),
              threeMonthReturn: entry.threeMonthReturn,
              threeMonthReturnFormatted: `${(entry.threeMonthReturn * 100).toFixed(2)}%`,
            },
          });
        }
      }
      break;
    }

    case 'reputation': {
      const limit = this.getNodeParameter('limit', i) as number;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_REPUTATION_RANKINGS,
        { limit },
      );

      if (response.v2Leaderboard) {
        let rank = 1;
        for (const entry of response.v2Leaderboard) {
          returnData.push({
            json: {
              reputationRank: rank++,
              username: entry.username,
              reputation: entry.reputation,
              corrRep: entry.corrRep,
              mmcRep: entry.mmcRep,
              tcRep: entry.tcRep,
            },
          });
        }
      }
      break;
    }

    case 'v2': {
      const limit = this.getNodeParameter('limit', i) as number;
      const offset = this.getNodeParameter('offset', i) as number;
      const orderBy = this.getNodeParameter('orderBy', i) as string;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_V2_LEADERBOARD,
        { limit, offset, orderBy },
      );

      if (response.v2Leaderboard) {
        for (const entry of response.v2Leaderboard) {
          returnData.push({
            json: {
              rank: entry.rank,
              username: entry.username,
              reputation: entry.reputation,
              stakeValue: entry.stakeValue,
              stakeValueFormatted: formatNmr(entry.stakeValue),
              scores: {
                corr: entry.corrRep,
                mmc: entry.mmcRep,
                tc: entry.tcRep,
                fnc: entry.fncRep,
              },
              returns: {
                threeMonth: entry.threeMonthReturn,
                threeMonthFormatted: `${(entry.threeMonthReturn * 100).toFixed(2)}%`,
                oneYear: entry.oneYearReturn,
                oneYearFormatted: `${(entry.oneYearReturn * 100).toFixed(2)}%`,
              },
            },
          });
        }

        // Add summary statistics
        if (response.v2Leaderboard.length > 0) {
          const avgReputation =
            response.v2Leaderboard.reduce((sum: number, e: { reputation?: number }) => sum + (e.reputation || 0), 0) /
            response.v2Leaderboard.length;
          const totalStake = response.v2Leaderboard.reduce(
            (sum: number, e: { stakeValue?: string }) => sum + parseFloat(e.stakeValue || '0'),
            0,
          );

          returnData.push({
            json: {
              _summary: true,
              entriesReturned: response.v2Leaderboard.length,
              avgReputation: avgReputation.toFixed(4),
              totalStake: formatNmr(totalStake),
              orderBy,
              offset,
            },
          });
        }
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return returnData;
}
