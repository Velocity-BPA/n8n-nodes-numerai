/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { executeGraphQL, QUERIES } from '../../transport';
import { uploadSignalsFile } from '../../transport/fileClient';
import { validateSignalsPredictions } from '../../helpers';

/**
 * Signals resource properties
 */
export const signalsProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['signals'],
      },
    },
    options: [
      {
        name: 'Upload Signals',
        value: 'upload',
        description: 'Upload signals predictions',
        action: 'Upload signals',
      },
      {
        name: 'Get Signal Universe',
        value: 'universe',
        description: 'Get the current stock universe for Signals',
        action: 'Get signal universe',
      },
      {
        name: 'Get Signals Diagnostics',
        value: 'diagnostics',
        description: 'Get diagnostics for a Signals model',
        action: 'Get signals diagnostics',
      },
      {
        name: 'Get Signals Submission',
        value: 'submission',
        description: 'Get latest Signals submission info',
        action: 'Get signals submission',
      },
      {
        name: 'Get Historical Targets',
        value: 'historicalTargets',
        description: 'Get historical targets for backtesting',
        action: 'Get historical targets',
      },
    ],
    default: 'universe',
  },
  // Model name for signals operations
  {
    displayName: 'Model Name',
    name: 'modelName',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        resource: ['signals'],
        operation: ['upload', 'diagnostics', 'submission'],
      },
    },
    description: 'The name of the Signals model',
  },
  // Input data field for upload
  {
    displayName: 'Input Data Field',
    name: 'binaryPropertyName',
    type: 'string',
    default: 'data',
    required: true,
    displayOptions: {
      show: {
        resource: ['signals'],
        operation: ['upload'],
      },
    },
    description: 'The name of the input field containing the CSV file',
  },
  // Validation option
  {
    displayName: 'Validate Before Upload',
    name: 'validateBeforeUpload',
    type: 'boolean',
    default: true,
    displayOptions: {
      show: {
        resource: ['signals'],
        operation: ['upload'],
      },
    },
    description: 'Whether to validate the CSV structure before uploading',
  },
  // Universe output format
  {
    displayName: 'Output Format',
    name: 'outputFormat',
    type: 'options',
    options: [
      {
        name: 'Full List',
        value: 'full',
        description: 'Return all tickers as individual items',
      },
      {
        name: 'Summary',
        value: 'summary',
        description: 'Return only a summary with count',
      },
      {
        name: 'Download CSV',
        value: 'csv',
        description: 'Return as downloadable CSV',
      },
    ],
    default: 'summary',
    displayOptions: {
      show: {
        resource: ['signals'],
        operation: ['universe'],
      },
    },
    description: 'How to format the universe output',
  },
];

/**
 * Signals response interfaces
 */
interface ISignalTicker {
  bloomberg_ticker: string;
  numerai_ticker: string;
  signal_id: string;
}

interface ISignalsDiagnostics {
  validationStats: {
    mean: number;
    std: number;
    sharpe: number;
    maxDrawdown: number;
  };
}

interface ISignalsSubmission {
  id: string;
  filename: string;
  state: string;
  selectedCols: string[];
  createdAt: string;
}

interface ISignalUniverseResponse {
  signalsUniverse: ISignalTicker[];
}

interface ISignalsDiagnosticsResponse {
  signalsUserProfile: {
    models: Array<{
      diagnostics: ISignalsDiagnostics;
    }>;
  };
}

interface ISignalsSubmissionResponse {
  signalsUserProfile: {
    models: Array<{
      latestSubmission: ISignalsSubmission;
    }>;
  };
}

interface IHistoricalTargetsResponse {
  signalsDataset: {
    historicalTargetsUrl: string;
  };
}

interface IModelResponse {
  v3UserProfile: {
    models: Array<{
      id: string;
      name: string;
    }>;
  };
}

/**
 * Execute signals operations
 */
export async function executeSignalsOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];

  switch (operation) {
    case 'upload': {
      const modelName = this.getNodeParameter('modelName', i) as string;
      const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
      const validateBeforeUpload = this.getNodeParameter('validateBeforeUpload', i) as boolean;

      // Get model ID first
      const modelResponse = await executeGraphQL.call(
        this,
        `
        query getModel($modelName: String!) {
          v3UserProfile {
            models(modelName: $modelName) {
              id
              name
            }
          }
        }
      `,
        { modelName },
      );

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
      const filename = binaryData.fileName || 'signals.csv';

      // Validate if requested
      if (validateBeforeUpload) {
        const validation = validateSignalsPredictions(fileContent.toString('utf-8'));
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          console.warn('CSV Validation Warnings:', validation.warnings.join(', '));
        }
      }

      // Upload signals
      const uploadResponse = await uploadSignalsFile.call(this, modelId, fileContent, filename);

      returnData.push({
        json: {
          ...uploadResponse,
          modelName,
          modelId,
          tournament: 'signals',
        },
      });
      break;
    }

    case 'universe': {
      const outputFormat = this.getNodeParameter('outputFormat', i) as string;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_SIGNAL_UNIVERSE,
      );

      if (response.signalsUniverse) {
        switch (outputFormat) {
          case 'full':
            for (const ticker of response.signalsUniverse) {
              returnData.push({ json: ticker });
            }
            break;

          case 'summary':
            returnData.push({
              json: {
                totalTickers: response.signalsUniverse.length,
                sample: response.signalsUniverse.slice(0, 10).map((t: { numerai_ticker: string }) => t.numerai_ticker),
                note: 'Use "Full List" output format to get all tickers',
              },
            });
            break;

          case 'csv': {
            const csvHeader = 'bloomberg_ticker,numerai_ticker,signal_id\n';
            const csvRows = response.signalsUniverse
              .map((t: { bloomberg_ticker: string; numerai_ticker: string; signal_id: string }) => `${t.bloomberg_ticker},${t.numerai_ticker},${t.signal_id}`)
              .join('\n');
            const csvContent = csvHeader + csvRows;

            const binaryData = await this.helpers.prepareBinaryData(
              Buffer.from(csvContent),
              'signals_universe.csv',
              'text/csv',
            );

            returnData.push({
              json: {
                totalTickers: response.signalsUniverse.length,
                downloadedAt: new Date().toISOString(),
              },
              binary: {
                data: binaryData,
              },
            });
            break;
          }
        }
      }
      break;
    }

    case 'diagnostics': {
      const modelName = this.getNodeParameter('modelName', i) as string;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_SIGNALS_DIAGNOSTICS,
        { modelName },
      );

      if (response.signalsUserProfile?.models && response.signalsUserProfile.models.length > 0) {
        const diagnostics = response.signalsUserProfile.models[0].diagnostics;

        if (diagnostics?.validationStats) {
          returnData.push({
            json: {
              modelName,
              tournament: 'signals',
              validationStats: diagnostics.validationStats,
              sharpeFormatted: diagnostics.validationStats.sharpe.toFixed(4),
              maxDrawdownFormatted: `${(diagnostics.validationStats.maxDrawdown * 100).toFixed(2)}%`,
            },
          });
        }
      }
      break;
    }

    case 'submission': {
      const modelName = this.getNodeParameter('modelName', i) as string;

      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_SIGNALS_SUBMISSION,
        { modelName },
      );

      if (response.signalsUserProfile?.models && response.signalsUserProfile.models.length > 0) {
        const submission = response.signalsUserProfile.models[0].latestSubmission;

        returnData.push({
          json: {
            modelName,
            tournament: 'signals',
            ...submission,
            submittedAt: submission ? new Date(submission.createdAt).toISOString() : null,
          },
        });
      }
      break;
    }

    case 'historicalTargets': {
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_HISTORICAL_TARGETS,
      );

      if (response.signalsDataset) {
        returnData.push({
          json: {
            historicalTargetsUrl: response.signalsDataset.historicalTargetsUrl,
            tournament: 'signals',
            description: 'Download URL for historical target values for backtesting',
            note: 'Use the Dataset Download operation or fetch the URL directly',
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
