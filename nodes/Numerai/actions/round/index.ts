/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { executeGraphQL, QUERIES } from '../../transport';
import { TOURNAMENT_OPTIONS, TOURNAMENT_IDS, Tournament } from '../../constants';

/**
 * Round resource properties
 */
export const roundProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['round'],
      },
    },
    options: [
      {
        name: 'Get Current Round',
        value: 'current',
        description: 'Get the current active tournament round',
        action: 'Get current round',
      },
      {
        name: 'Get Round',
        value: 'get',
        description: 'Get a specific round by number',
        action: 'Get round by number',
      },
      {
        name: 'Get Rounds',
        value: 'list',
        description: 'List tournament rounds',
        action: 'Get rounds list',
      },
      {
        name: 'Check Round Open',
        value: 'checkOpen',
        description: 'Check if the current round is open for submissions',
        action: 'Check if round is open',
      },
      {
        name: 'Get Round Dates',
        value: 'getDates',
        description: 'Get important dates for a round',
        action: 'Get round dates',
      },
      {
        name: 'Get Resolve Date',
        value: 'getResolveDate',
        description: 'Get the resolve date for a round',
        action: 'Get resolve date',
      },
    ],
    default: 'current',
  },
  // Get round by number
  {
    displayName: 'Round Number',
    name: 'roundNumber',
    type: 'number',
    default: 0,
    required: true,
    displayOptions: {
      show: {
        resource: ['round'],
        operation: ['get', 'getDates', 'getResolveDate'],
      },
    },
    description: 'The round number to retrieve',
  },
  // Tournament selection for list
  {
    displayName: 'Tournament',
    name: 'tournament',
    type: 'options',
    options: TOURNAMENT_OPTIONS,
    default: 'classic',
    displayOptions: {
      show: {
        resource: ['round'],
        operation: ['list'],
      },
    },
    description: 'The tournament to get rounds for',
  },
  // Limit for list
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 10,
    displayOptions: {
      show: {
        resource: ['round'],
        operation: ['list'],
      },
    },
    description: 'Maximum number of rounds to return',
  },
];

/**
 * Round response interfaces
 */
interface IRound {
  number: number;
  openTime: string;
  closeTime: string;
  closeStakingTime?: string;
  resolveTime: string;
}

interface IRoundsResponse {
  rounds: IRound[];
}

/**
 * Execute round operations
 */
export async function executeRoundOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];

  switch (operation) {
    case 'current': {
      const response = await executeGraphQL.call(this, QUERIES.GET_CURRENT_ROUND);

      if (response.rounds && response.rounds.length > 0) {
        const currentRound = response.rounds[response.rounds.length - 1];
        const now = new Date();
        const closeTime = new Date(currentRound.closeTime);

        returnData.push({
          json: {
            ...currentRound,
            isOpen: now < closeTime,
            timeRemaining: closeTime.getTime() - now.getTime(),
            timeRemainingFormatted: formatTimeRemaining(closeTime.getTime() - now.getTime()),
          },
        });
      }
      break;
    }

    case 'get': {
      const roundNumber = this.getNodeParameter('roundNumber', i) as number;
      const response = await executeGraphQL.call(this, QUERIES.GET_ROUND_BY_NUMBER, {
        roundNumber,
      });

      if (response.rounds && response.rounds.length > 0) {
        returnData.push({
          json: response.rounds[0],
        });
      }
      break;
    }

    case 'list': {
      const tournament = this.getNodeParameter('tournament', i) as Tournament;
      const limit = this.getNodeParameter('limit', i) as number;
      const tournamentId = TOURNAMENT_IDS[tournament];

      const response = await executeGraphQL.call(this, QUERIES.GET_ROUNDS, {
        tournament: tournamentId,
      });

      if (response.rounds) {
        const rounds = response.rounds.slice(-limit);
        for (const round of rounds) {
          returnData.push({ json: round });
        }
      }
      break;
    }

    case 'checkOpen': {
      const response = await executeGraphQL.call(this, QUERIES.GET_CURRENT_ROUND);

      if (response.rounds && response.rounds.length > 0) {
        const currentRound = response.rounds[response.rounds.length - 1];
        const now = new Date();
        const closeTime = new Date(currentRound.closeTime);
        const openTime = new Date(currentRound.openTime);

        returnData.push({
          json: {
            roundNumber: currentRound.number,
            isOpen: now >= openTime && now < closeTime,
            openTime: currentRound.openTime,
            closeTime: currentRound.closeTime,
            timeRemaining: Math.max(0, closeTime.getTime() - now.getTime()),
            timeRemainingFormatted: formatTimeRemaining(
              Math.max(0, closeTime.getTime() - now.getTime()),
            ),
          },
        });
      }
      break;
    }

    case 'getDates': {
      const roundNumber = this.getNodeParameter('roundNumber', i) as number;
      const response = await executeGraphQL.call(this, QUERIES.GET_ROUND_BY_NUMBER, {
        roundNumber,
      });

      if (response.rounds && response.rounds.length > 0) {
        const round = response.rounds[0];
        returnData.push({
          json: {
            roundNumber: round.number,
            openTime: round.openTime,
            closeTime: round.closeTime,
            closeStakingTime: round.closeStakingTime,
            resolveTime: round.resolveTime,
            openDate: new Date(round.openTime).toISOString(),
            closeDate: new Date(round.closeTime).toISOString(),
            resolveDate: new Date(round.resolveTime).toISOString(),
          },
        });
      }
      break;
    }

    case 'getResolveDate': {
      const roundNumber = this.getNodeParameter('roundNumber', i) as number;
      const response = await executeGraphQL.call(this, QUERIES.GET_ROUND_BY_NUMBER, {
        roundNumber,
      });

      if (response.rounds && response.rounds.length > 0) {
        const round = response.rounds[0];
        const resolveDate = new Date(round.resolveTime);

        returnData.push({
          json: {
            roundNumber: round.number,
            resolveTime: round.resolveTime,
            resolveDate: resolveDate.toISOString(),
            daysUntilResolve: Math.ceil(
              (resolveDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            ),
          },
        });
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return returnData;
}

/**
 * Format milliseconds to human-readable time
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Closed';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}
