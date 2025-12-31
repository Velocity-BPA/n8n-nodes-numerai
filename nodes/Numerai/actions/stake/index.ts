/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { executeGraphQL, executeMutation, QUERIES, MUTATIONS } from '../../transport';
import { validateNmrAmount, formatNmr } from '../../helpers';
import { STAKE_LIMITS } from '../../constants';

/**
 * Stake resource properties
 */
export const stakeProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['stake'],
      },
    },
    options: [
      {
        name: 'Get Stake',
        value: 'get',
        description: 'Get stake information for a model',
        action: 'Get stake for model',
      },
      {
        name: 'Get All Stakes',
        value: 'list',
        description: 'Get stake information for all models',
        action: 'Get all stakes',
      },
      {
        name: 'Increase Stake',
        value: 'increase',
        description: 'Increase stake on a model',
        action: 'Increase stake',
      },
      {
        name: 'Decrease Stake',
        value: 'decrease',
        description: 'Decrease stake on a model',
        action: 'Decrease stake',
      },
      {
        name: 'Set Target Stake',
        value: 'setTarget',
        description: 'Set target stake for automatic adjustment',
        action: 'Set target stake',
      },
      {
        name: 'Drain Stake',
        value: 'drain',
        description: 'Completely drain stake from a model',
        action: 'Drain stake',
      },
      {
        name: 'Get Stake History',
        value: 'history',
        description: 'Get stake change history for a model',
        action: 'Get stake history',
      },
      {
        name: 'Get Pending Changes',
        value: 'pending',
        description: 'Get pending stake changes for a model',
        action: 'Get pending stake changes',
      },
    ],
    default: 'get',
  },
  // Model name for single model operations
  {
    displayName: 'Model Name',
    name: 'modelName',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['stake'],
        operation: ['get', 'increase', 'decrease', 'setTarget', 'drain', 'history', 'pending'],
      },
    },
    description: 'The name of the model',
  },
  // Amount for stake changes
  {
    displayName: 'Amount (NMR)',
    name: 'amount',
    type: 'number',
    default: 0,
    required: true,
    displayOptions: {
      show: {
        resource: ['stake'],
        operation: ['increase', 'decrease', 'setTarget'],
      },
    },
    description: `Amount of NMR (minimum: ${STAKE_LIMITS.MIN_CHANGE}, maximum: ${STAKE_LIMITS.MAX_STAKE})`,
    typeOptions: {
      minValue: STAKE_LIMITS.MIN_CHANGE,
      maxValue: STAKE_LIMITS.MAX_STAKE,
      numberPrecision: 4,
    },
  },
  // Confirmation for drain
  {
    displayName: 'Confirm Drain',
    name: 'confirmDrain',
    type: 'boolean',
    default: false,
    required: true,
    displayOptions: {
      show: {
        resource: ['stake'],
        operation: ['drain'],
      },
    },
    description:
      'WARNING: This will completely remove all stake from the model. Check this box to confirm.',
  },
];

/**
 * Stake response interfaces
 */
interface IStake {
  value: string;
  confidence: number;
}

interface IModel {
  id: string;
  name: string;
  nmrStaked: string;
  corrRep: number;
  tcRep: number;
  mmcRep: number;
  stake?: IStake;
}

interface IStakeHistory {
  date: string;
  nmrStaked: string;
  action: string;
  amount: string;
}

interface IPendingStakeChange {
  requestedAmount: string;
  type: string;
  requestedAt: string;
  effectiveDate: string;
}

interface IStakeResponse {
  v3UserProfile: {
    models: IModel[];
  };
}

interface IStakeHistoryResponse {
  v3UserProfile: {
    models: Array<{
      stakeHistory: IStakeHistory[];
    }>;
  };
}

interface IPendingStakeResponse {
  v3UserProfile: {
    models: Array<{
      pendingStakeChange: IPendingStakeChange | null;
    }>;
  };
}

interface IMutationResponse {
  success: boolean;
  message: string;
}

interface IStakeChangeResponse {
  changeStake: IMutationResponse;
}

interface ISetTargetResponse {
  setTargetStake: IMutationResponse;
}

interface IDrainResponse {
  drainStake: IMutationResponse;
}

/**
 * Execute stake operations
 */
export async function executeStakeOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];

  switch (operation) {
    case 'get': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(this, QUERIES.GET_STAKE, {
        modelName,
      });

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        const model = response.v3UserProfile.models[0];
        returnData.push({
          json: {
            modelName: model.name,
            modelId: model.id,
            nmrStaked: model.nmrStaked,
            nmrStakedFormatted: formatNmr(model.nmrStaked),
            corrRep: model.corrRep,
            tcRep: model.tcRep,
            mmcRep: model.mmcRep,
          },
        });
      }
      break;
    }

    case 'list': {
      const response = await executeGraphQL.call(this, QUERIES.GET_ALL_STAKES);

      if (response.v3UserProfile?.models) {
        let totalStake = 0;

        for (const model of response.v3UserProfile.models) {
          const stake = parseFloat(model.nmrStaked) || 0;
          totalStake += stake;

          returnData.push({
            json: {
              modelName: model.name,
              modelId: model.id,
              nmrStaked: model.nmrStaked,
              nmrStakedFormatted: formatNmr(model.nmrStaked),
              stake: model.stake,
            },
          });
        }

        // Add summary
        returnData.push({
          json: {
            _summary: true,
            totalModels: response.v3UserProfile.models.length,
            totalStake: formatNmr(totalStake),
          },
        });
      }
      break;
    }

    case 'increase': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const amount = this.getNodeParameter('amount', i) as number;

      if (!validateNmrAmount(amount, STAKE_LIMITS.MIN_CHANGE, STAKE_LIMITS.MAX_STAKE)) {
        throw new Error(
          `Invalid amount. Must be between ${STAKE_LIMITS.MIN_CHANGE} and ${STAKE_LIMITS.MAX_STAKE} NMR`,
        );
      }

      // Get model ID first
      const modelResponse = await executeGraphQL.call(this, QUERIES.GET_STAKE, {
        modelName,
      });

      if (
        !modelResponse.v3UserProfile?.models ||
        modelResponse.v3UserProfile.models.length === 0
      ) {
        throw new Error(`Model not found: ${modelName}`);
      }

      const modelId = modelResponse.v3UserProfile.models[0].id;

      const response = await executeMutation.call(
        this,
        MUTATIONS.INCREASE_STAKE,
        {
          modelId,
          amount: amount.toString(),
        },
      );

      returnData.push({
        json: {
          modelName,
          modelId,
          operation: 'increase',
          amount: formatNmr(amount),
          ...response.changeStake,
        },
      });
      break;
    }

    case 'decrease': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const amount = this.getNodeParameter('amount', i) as number;

      if (!validateNmrAmount(amount, STAKE_LIMITS.MIN_CHANGE, STAKE_LIMITS.MAX_STAKE)) {
        throw new Error(
          `Invalid amount. Must be between ${STAKE_LIMITS.MIN_CHANGE} and ${STAKE_LIMITS.MAX_STAKE} NMR`,
        );
      }

      // Get model ID first
      const modelResponse = await executeGraphQL.call(this, QUERIES.GET_STAKE, {
        modelName,
      });

      if (
        !modelResponse.v3UserProfile?.models ||
        modelResponse.v3UserProfile.models.length === 0
      ) {
        throw new Error(`Model not found: ${modelName}`);
      }

      const modelId = modelResponse.v3UserProfile.models[0].id;
      const currentStake = parseFloat(modelResponse.v3UserProfile.models[0].nmrStaked) || 0;

      if (amount > currentStake) {
        throw new Error(
          `Cannot decrease by ${amount} NMR. Current stake is only ${formatNmr(currentStake)} NMR`,
        );
      }

      const response = await executeMutation.call(
        this,
        MUTATIONS.DECREASE_STAKE,
        {
          modelId,
          amount: (-amount).toString(), // Negative for decrease
        },
      );

      returnData.push({
        json: {
          modelName,
          modelId,
          operation: 'decrease',
          amount: formatNmr(amount),
          ...response.changeStake,
        },
      });
      break;
    }

    case 'setTarget': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const amount = this.getNodeParameter('amount', i) as number;

      if (!validateNmrAmount(amount, 0, STAKE_LIMITS.MAX_STAKE)) {
        throw new Error(
          `Invalid target amount. Must be between 0 and ${STAKE_LIMITS.MAX_STAKE} NMR`,
        );
      }

      // Get model ID first
      const modelResponse = await executeGraphQL.call(this, QUERIES.GET_STAKE, {
        modelName,
      });

      if (
        !modelResponse.v3UserProfile?.models ||
        modelResponse.v3UserProfile.models.length === 0
      ) {
        throw new Error(`Model not found: ${modelName}`);
      }

      const modelId = modelResponse.v3UserProfile.models[0].id;

      const response = await executeMutation.call(
        this,
        MUTATIONS.SET_TARGET_STAKE,
        {
          modelId,
          targetStake: amount.toString(),
        },
      );

      returnData.push({
        json: {
          modelName,
          modelId,
          operation: 'setTarget',
          targetStake: formatNmr(amount),
          ...response.setTargetStake,
        },
      });
      break;
    }

    case 'drain': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const confirmDrain = this.getNodeParameter('confirmDrain', i) as boolean;

      if (!confirmDrain) {
        throw new Error('You must confirm the drain operation by checking the confirmation box');
      }

      // Get model ID first
      const modelResponse = await executeGraphQL.call(this, QUERIES.GET_STAKE, {
        modelName,
      });

      if (
        !modelResponse.v3UserProfile?.models ||
        modelResponse.v3UserProfile.models.length === 0
      ) {
        throw new Error(`Model not found: ${modelName}`);
      }

      const model = modelResponse.v3UserProfile.models[0];

      const response = await executeMutation.call(this, MUTATIONS.DRAIN_STAKE, {
        modelId: model.id,
      });

      returnData.push({
        json: {
          modelName,
          modelId: model.id,
          operation: 'drain',
          previousStake: formatNmr(model.nmrStaked),
          ...response.drainStake,
        },
      });
      break;
    }

    case 'history': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_STAKE_HISTORY,
        { modelName },
      );

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        const history = response.v3UserProfile.models[0].stakeHistory || [];

        for (const entry of history) {
          returnData.push({
            json: {
              modelName,
              date: entry.date,
              nmrStaked: entry.nmrStaked,
              nmrStakedFormatted: formatNmr(entry.nmrStaked),
              action: entry.action,
              amount: entry.amount,
              amountFormatted: formatNmr(entry.amount),
            },
          });
        }
      }
      break;
    }

    case 'pending': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_PENDING_STAKE_CHANGES,
        { modelName },
      );

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        const pending = response.v3UserProfile.models[0].pendingStakeChange;

        returnData.push({
          json: {
            modelName,
            hasPendingChange: pending !== null,
            ...(pending || {}),
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
