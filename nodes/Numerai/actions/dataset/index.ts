/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { executeGraphQL, QUERIES } from '../../transport';
import { downloadDataset, downloadLargeDataset } from '../../transport/fileClient';
import { DATASET_TYPE_OPTIONS, DATASET_FORMAT_OPTIONS, DatasetType, DatasetFormat } from '../../constants';

/**
 * Dataset resource properties
 */
export const datasetProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['dataset'],
      },
    },
    options: [
      {
        name: 'Get Dataset URLs',
        value: 'urls',
        description: 'Get download URLs for tournament datasets',
        action: 'Get dataset URLs',
      },
      {
        name: 'Get Current Dataset',
        value: 'current',
        description: 'Get current round dataset information',
        action: 'Get current dataset',
      },
      {
        name: 'Download Dataset',
        value: 'download',
        description: 'Download a specific dataset',
        action: 'Download dataset',
      },
      {
        name: 'Get Dataset Versions',
        value: 'versions',
        description: 'Get available dataset versions',
        action: 'Get dataset versions',
      },
      {
        name: 'Get Feature Metadata',
        value: 'features',
        description: 'Get feature metadata and descriptions',
        action: 'Get feature metadata',
      },
      {
        name: 'Get Target Info',
        value: 'targets',
        description: 'Get information about available targets',
        action: 'Get target info',
      },
    ],
    default: 'urls',
  },
  // Dataset type selection
  {
    displayName: 'Dataset Type',
    name: 'datasetType',
    type: 'options',
    options: DATASET_TYPE_OPTIONS,
    default: DatasetType.LIVE,
    displayOptions: {
      show: {
        resource: ['dataset'],
        operation: ['download'],
      },
    },
    description: 'The type of dataset to download',
  },
  // Format selection
  {
    displayName: 'Format',
    name: 'format',
    type: 'options',
    options: DATASET_FORMAT_OPTIONS,
    default: DatasetFormat.CSV,
    displayOptions: {
      show: {
        resource: ['dataset'],
        operation: ['download'],
      },
    },
    description: 'The format to download',
  },
  // Round number (optional)
  {
    displayName: 'Round Number',
    name: 'roundNumber',
    type: 'number',
    default: 0,
    displayOptions: {
      show: {
        resource: ['dataset'],
        operation: ['urls', 'download'],
      },
    },
    description: 'Specific round number (leave 0 for current round)',
  },
  // Output field name
  {
    displayName: 'Output Field',
    name: 'outputField',
    type: 'string',
    default: 'data',
    displayOptions: {
      show: {
        resource: ['dataset'],
        operation: ['download'],
      },
    },
    description: 'The field name to store the downloaded binary data',
  },
];

/**
 * Dataset response interfaces
 */
interface IDatasetUrls {
  round: number;
  trainingDataUrl: string;
  validationDataUrl: string;
  liveDataUrl: string;
  examplePredictionsUrl: string;
  metaModelUrl?: string;
  featuresUrl?: string;
}

interface IFeatureMetadata {
  name: string;
  type: string;
  description: string;
  importance: number;
}

interface ITargetInfo {
  name: string;
  description: string;
  horizon: number;
}

interface IDatasetResponse {
  dataset: IDatasetUrls;
}

interface IFeatureMetadataResponse {
  dataset: {
    featureMetadata: IFeatureMetadata[];
  };
}

interface ITargetInfoResponse {
  dataset: {
    targetInfo: ITargetInfo[];
  };
}

/**
 * Map dataset type to URL field
 */
const DATASET_URL_MAP: Record<DatasetType, string> = {
  [DatasetType.TRAINING]: 'trainingDataUrl',
  [DatasetType.VALIDATION]: 'validationDataUrl',
  [DatasetType.LIVE]: 'liveDataUrl',
  [DatasetType.EXAMPLE]: 'examplePredictionsUrl',
  [DatasetType.META_MODEL]: 'metaModelUrl',
  [DatasetType.FEATURES]: 'featuresUrl',
};

/**
 * Execute dataset operations
 */
export async function executeDatasetOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];

  switch (operation) {
    case 'urls': {
      const roundNumber = this.getNodeParameter('roundNumber', i) as number;
      const round = roundNumber > 0 ? roundNumber : undefined;

      const response = await executeGraphQL.call(this, QUERIES.GET_DATASET_URLS, {
        round,
      });

      if (response.dataset) {
        returnData.push({
          json: {
            ...response.dataset,
            requestedRound: round || 'current',
          },
        });
      }
      break;
    }

    case 'current': {
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_CURRENT_DATASET,
      );

      if (response.dataset) {
        returnData.push({
          json: {
            round: response.dataset.round,
            datasets: {
              training: response.dataset.trainingDataUrl ? 'available' : 'unavailable',
              validation: response.dataset.validationDataUrl ? 'available' : 'unavailable',
              live: response.dataset.liveDataUrl ? 'available' : 'unavailable',
              example: response.dataset.examplePredictionsUrl ? 'available' : 'unavailable',
            },
            urls: response.dataset,
          },
        });
      }
      break;
    }

    case 'download': {
      const datasetType = this.getNodeParameter('datasetType', i) as DatasetType;
      const format = this.getNodeParameter('format', i) as DatasetFormat;
      const roundNumber = this.getNodeParameter('roundNumber', i) as number;
      const outputField = this.getNodeParameter('outputField', i) as string;

      const round = roundNumber > 0 ? roundNumber : undefined;

      // Get dataset URLs
      const response = await executeGraphQL.call(this, QUERIES.GET_DATASET_URLS, {
        round,
      });

      if (!response.dataset) {
        throw new Error('Failed to retrieve dataset information');
      }

      const urlField = DATASET_URL_MAP[datasetType];
      const url = response.dataset[urlField as keyof IDatasetUrls];

      if (!url || typeof url !== 'string') {
        throw new Error(`Dataset type '${datasetType}' is not available for this round`);
      }

      // Determine filename and mimetype
      const extension = format === DatasetFormat.PARQUET ? 'parquet' : 'csv';
      const mimeType =
        format === DatasetFormat.PARQUET ? 'application/octet-stream' : 'text/csv';
      const filename = `numerai_${datasetType}_round${response.dataset.round}.${extension}`;

      // Download the dataset
      const downloadFn =
        datasetType === DatasetType.TRAINING ? downloadLargeDataset : downloadDataset;
      const binaryData = await downloadFn.call(this, {
        url,
        filename,
        mimeType,
      });

      returnData.push({
        json: {
          round: response.dataset.round,
          datasetType,
          format,
          filename,
          downloadedAt: new Date().toISOString(),
        },
        binary: {
          [outputField]: binaryData,
        },
      });
      break;
    }

    case 'versions': {
      // Numerai uses a single versioning system - return current info
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_CURRENT_DATASET,
      );

      if (response.dataset) {
        returnData.push({
          json: {
            currentRound: response.dataset.round,
            version: 'v4.3', // Current Numerai data version
            features: 'medium', // Default feature set
            note: 'Numerai updates datasets weekly with each new round',
          },
        });
      }
      break;
    }

    case 'features': {
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_FEATURE_METADATA,
      );

      if (response.dataset?.featureMetadata) {
        for (const feature of response.dataset.featureMetadata) {
          returnData.push({ json: feature });
        }

        // Add summary
        returnData.push({
          json: {
            _summary: true,
            totalFeatures: response.dataset.featureMetadata.length,
            featureTypes: [...new Set(response.dataset.featureMetadata.map((f: { type: string }) => f.type))],
          },
        });
      } else {
        // Return standard feature groups if metadata not available
        returnData.push({
          json: {
            featureGroups: ['small', 'medium', 'all'],
            note: 'Numerai features are organized in groups. Use "medium" for balanced performance.',
            documentation: 'https://docs.numer.ai/tournament/feature-engineering',
          },
        });
      }
      break;
    }

    case 'targets': {
      const response = await executeGraphQL.call(
        this,
        QUERIES.GET_TARGET_INFO,
      );

      if (response.dataset?.targetInfo) {
        for (const target of response.dataset.targetInfo) {
          returnData.push({ json: target });
        }
      } else {
        // Return standard target information
        returnData.push({
          json: {
            defaultTarget: 'target',
            alternativeTargets: [
              { name: 'target_nomi_v4_20', horizon: '20 days', description: 'Nomi target' },
              { name: 'target_nomi_v4_60', horizon: '60 days', description: 'Nomi target extended' },
              { name: 'target_jerome_v4_20', horizon: '20 days', description: 'Jerome target' },
              { name: 'target_ralph_v4_20', horizon: '20 days', description: 'Ralph target' },
            ],
            note: 'Multiple targets available for different prediction horizons',
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
