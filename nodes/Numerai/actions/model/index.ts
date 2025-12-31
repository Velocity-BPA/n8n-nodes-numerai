/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { executeGraphQL, executeMutation, QUERIES, MUTATIONS } from '../../transport';
import { uploadPredictionFile, uploadModelFile } from '../../transport/fileClient';
import { validateClassicPredictions } from '../../helpers';
import { TOURNAMENT_OPTIONS, TOURNAMENT_IDS, Tournament } from '../../constants';

/**
 * Model resource properties
 */
export const modelProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['model'],
      },
    },
    options: [
      {
        name: 'Get Models',
        value: 'list',
        description: 'List all your models',
        action: 'Get models list',
      },
      {
        name: 'Get Model',
        value: 'get',
        description: 'Get a specific model by name',
        action: 'Get model by name',
      },
      {
        name: 'Get Model Performance',
        value: 'performance',
        description: 'Get performance metrics for a model',
        action: 'Get model performance',
      },
      {
        name: 'Get Model Rank',
        value: 'rank',
        description: 'Get the current rank of a model',
        action: 'Get model rank',
      },
      {
        name: 'Create Model',
        value: 'create',
        description: 'Create a new model',
        action: 'Create model',
      },
      {
        name: 'Upload Predictions',
        value: 'uploadPredictions',
        description: 'Upload predictions CSV for the current round',
        action: 'Upload predictions',
      },
      {
        name: 'Upload Model',
        value: 'uploadModel',
        description: 'Upload a pickle model file for Numerai Compute',
        action: 'Upload model file',
      },
      {
        name: 'Get Submission Status',
        value: 'submissionStatus',
        description: 'Get the status of the latest submission',
        action: 'Get submission status',
      },
      {
        name: 'Get Submission Info',
        value: 'submissionInfo',
        description: 'Get detailed submission information',
        action: 'Get submission info',
      },
      {
        name: 'Get Daily Submissions',
        value: 'dailySubmissions',
        description: 'Get daily submission history',
        action: 'Get daily submissions',
      },
    ],
    default: 'list',
  },
  // Model name input
  {
    displayName: 'Model Name',
    name: 'modelName',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['model'],
        operation: [
          'get',
          'performance',
          'rank',
          'uploadPredictions',
          'uploadModel',
          'submissionStatus',
          'submissionInfo',
          'dailySubmissions',
        ],
      },
    },
    description: 'The name of the model',
  },
  // Create model options
  {
    displayName: 'New Model Name',
    name: 'newModelName',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['model'],
        operation: ['create'],
      },
    },
    description: 'The name for the new model',
  },
  {
    displayName: 'Tournament',
    name: 'tournament',
    type: 'options',
    options: TOURNAMENT_OPTIONS,
    default: 'classic',
    displayOptions: {
      show: {
        resource: ['model'],
        operation: ['create'],
      },
    },
    description: 'The tournament for the new model',
  },
  // Upload predictions options
  {
    displayName: 'Input Data Field',
    name: 'binaryPropertyName',
    type: 'string',
    default: 'data',
    required: true,
    displayOptions: {
      show: {
        resource: ['model'],
        operation: ['uploadPredictions', 'uploadModel'],
      },
    },
    description:
      'The name of the input field containing the binary file data (CSV for predictions, pickle for model)',
  },
  {
    displayName: 'Validate Before Upload',
    name: 'validateBeforeUpload',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['model'],
        operation: ['uploadPredictions'],
      },
    },
    description: 'Whether to validate the CSV structure before uploading',
  },
  // Performance options
  {
    displayName: 'Round Limit',
    name: 'roundLimit',
    type: 'number',
    default: 20,
    displayOptions: {
      show: {
        resource: ['model'],
        operation: ['performance'],
      },
    },
    description: 'Maximum number of rounds to return performance data for',
  },
];

/**
 * Model response interfaces
 */
interface IModel {
  id: string;
  name: string;
  tournament: number;
  nmrStaked: string;
  corrRep: number;
  mmcRep: number;
  tcRep: number;
  fncRep?: number;
  rank?: number;
  corrRank?: number;
  mmcRank?: number;
  tcRank?: number;
}

interface IRoundPerformance {
  roundNumber: number;
  corr: number;
  corr20: number;
  corr20V2: number;
  tc: number;
  mmc: number;
  fnc: number;
  fncV3: number;
  corrPercentile: number;
  mmcPercentile: number;
  tcPercentile: number;
  payout: number;
  roundResolved: boolean;
}

interface IModelWithPerformance extends IModel {
  roundModelPerformances: IRoundPerformance[];
}

interface ISubmission {
  id: string;
  filename: string;
  state: string;
  selectedCols?: string[];
  createdAt: string;
  roundNumber?: number;
}

interface IModelsResponse {
  v3UserProfile: {
    models: IModel[];
  };
}

interface IModelResponse {
  v3UserProfile: {
    models: IModel[];
  };
}

interface IModelPerformanceResponse {
  v3UserProfile: {
    models: IModelWithPerformance[];
  };
}

interface ISubmissionResponse {
  v3UserProfile: {
    models: Array<{
      latestSubmission: ISubmission;
    }>;
  };
}

interface ISubmissionsResponse {
  v3UserProfile: {
    models: Array<{
      submissions: ISubmission[];
    }>;
  };
}

interface ICreateModelResponse {
  createModel: IModel;
}

/**
 * Execute model operations
 */
export async function executeModelOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];

  switch (operation) {
    case 'list': {
      const response = await executeGraphQL.call(this, QUERIES.GET_MODELS);

      if (response.v3UserProfile?.models) {
        for (const model of response.v3UserProfile.models) {
          returnData.push({ json: model });
        }
      }
      break;
    }

    case 'get': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(this, QUERIES.GET_MODEL, {
        modelName,
      });

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        returnData.push({ json: response.v3UserProfile.models[0] });
      }
      break;
    }

    case 'performance': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const roundLimit = this.getNodeParameter('roundLimit', i) as number;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_MODEL_PERFORMANCE,
        { modelName },
      );

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        const model = response.v3UserProfile.models[0];
        const performances = model.roundModelPerformances.slice(-roundLimit);

        returnData.push({
          json: {
            modelId: model.id,
            modelName: model.name,
            performances,
            summary: {
              totalRounds: performances.length,
              avgCorr: calculateAverage(performances.map((p: { corr: number }) => p.corr)),
              avgMmc: calculateAverage(performances.map((p: { mmc: number }) => p.mmc)),
              avgTc: calculateAverage(performances.map((p: { tc: number }) => p.tc)),
              totalPayout: performances.reduce((sum: number, p: { payout: number }) => sum + p.payout, 0),
            },
          },
        });
      }
      break;
    }

    case 'rank': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(this, QUERIES.GET_MODEL_RANK, {
        modelName,
      });

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        returnData.push({ json: response.v3UserProfile.models[0] });
      }
      break;
    }

    case 'create': {
      const newModelName = this.getNodeParameter('newModelName', i) as string;
      const tournament = this.getNodeParameter('tournament', i) as Tournament;
      const tournamentId = TOURNAMENT_IDS[tournament];

      const response = await executeMutation.call(
        this,
        MUTATIONS.CREATE_MODEL,
        {
          name: newModelName,
          tournament: tournamentId,
        },
      );

      if (response.createModel) {
        returnData.push({ json: response.createModel });
      }
      break;
    }

    case 'uploadPredictions': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
      const validateBeforeUpload = this.getNodeParameter('validateBeforeUpload', i) as boolean;

      // Get model ID first
      const modelResponse = await executeGraphQL.call(this, QUERIES.GET_MODEL, {
        modelName,
      });

      if (
        !modelResponse.v3UserProfile?.models ||
        modelResponse.v3UserProfile.models.length === 0
      ) {
        throw new Error(`Model not found: ${modelName}`);
      }

      const modelId = modelResponse.v3UserProfile.models[0].id;

      // Get binary data
      const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
      const fileContent = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
      const filename = binaryData.fileName || 'predictions.csv';

      // Validate if requested
      if (validateBeforeUpload) {
        const validation = validateClassicPredictions(fileContent.toString('utf-8'));
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          console.warn('CSV Validation Warnings:', validation.warnings.join(', '));
        }
      }

      // Upload predictions
      const uploadResponse = await uploadPredictionFile.call(this, modelId, fileContent, filename);

      returnData.push({
        json: {
          ...uploadResponse,
          modelName,
          modelId,
        },
      });
      break;
    }

    case 'uploadModel': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

      // Get model ID first
      const modelResponse = await executeGraphQL.call(this, QUERIES.GET_MODEL, {
        modelName,
      });

      if (
        !modelResponse.v3UserProfile?.models ||
        modelResponse.v3UserProfile.models.length === 0
      ) {
        throw new Error(`Model not found: ${modelName}`);
      }

      const modelId = modelResponse.v3UserProfile.models[0].id;

      // Get binary data
      const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
      const fileContent = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
      const filename = binaryData.fileName || 'model.pkl';

      // Upload model
      const uploadResponse = await uploadModelFile.call(this, modelId, fileContent, filename);

      returnData.push({
        json: {
          ...uploadResponse,
          modelName,
          modelId,
        },
      });
      break;
    }

    case 'submissionStatus': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_SUBMISSION_STATUS,
        { modelName },
      );

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        returnData.push({
          json: {
            modelName,
            ...response.v3UserProfile.models[0].latestSubmission,
          },
        });
      }
      break;
    }

    case 'submissionInfo': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_SUBMISSION_INFO,
        { modelName },
      );

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        const submissions = response.v3UserProfile.models[0].submissions || [];
        for (const submission of submissions) {
          returnData.push({
            json: {
              modelName,
              ...submission,
            },
          });
        }
      }
      break;
    }

    case 'dailySubmissions': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const response = await executeGraphQL.call(this, QUERIES.GET_DAILY_SUBMISSIONS, { modelName });

      if (response.v3UserProfile?.models && response.v3UserProfile.models.length > 0) {
        const dailySubmissions = response.v3UserProfile.models[0].dailySubmissions || [];
        for (const day of dailySubmissions) {
          returnData.push({
            json: {
              modelName,
              ...day,
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

/**
 * Calculate average of an array of numbers
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const validValues = values.filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (validValues.length === 0) return 0;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}
