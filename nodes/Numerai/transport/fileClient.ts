/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IExecuteFunctions, IBinaryData } from 'n8n-workflow';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { API_ENDPOINTS } from '../constants';
import { createAuthHeader, INumeraiCredentials } from './graphqlClient';

/**
 * File upload response interface
 */
export interface IFileUploadResponse {
  id: string;
  filename: string;
  state?: string;
  url?: string;
}

/**
 * File download options
 */
export interface IFileDownloadOptions {
  url: string;
  filename?: string;
  mimeType?: string;
}

/**
 * Upload a prediction file to Numerai
 */
export async function uploadPredictionFile(
  this: IExecuteFunctions,
  modelId: string,
  fileContent: Buffer | string,
  filename: string,
): Promise<IFileUploadResponse> {
  const credentials = (await this.getCredentials('numeraiApi')) as INumeraiCredentials;
  const authHeader = createAuthHeader(credentials);

  const form = new FormData();
  form.append('file', Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent), {
    filename,
    contentType: 'text/csv',
  });

  const mutation = `
    mutation($filename: String!, $modelId: String!) {
      uploadPredictions(filename: $filename, modelId: $modelId) {
        id
        filename
        state
      }
    }
  `;

  const variables = {
    filename,
    modelId,
  };

  form.append(
    'operations',
    JSON.stringify({
      query: mutation,
      variables,
    }),
  );

  form.append(
    'map',
    JSON.stringify({
      file: ['variables.file'],
    }),
  );

  try {
    const response = await axios.post(API_ENDPOINTS.GRAPHQL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: authHeader,
      },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.uploadPredictions;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Upload failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Upload a model pickle file to Numerai Compute
 */
export async function uploadModelFile(
  this: IExecuteFunctions,
  modelId: string,
  fileContent: Buffer,
  filename: string,
): Promise<IFileUploadResponse> {
  const credentials = (await this.getCredentials('numeraiApi')) as INumeraiCredentials;
  const authHeader = createAuthHeader(credentials);

  const form = new FormData();
  form.append('file', fileContent, {
    filename,
    contentType: 'application/octet-stream',
  });

  const mutation = `
    mutation($filename: String!, $modelId: String!) {
      uploadModel(filename: $filename, modelId: $modelId) {
        id
        filename
      }
    }
  `;

  const variables = {
    filename,
    modelId,
  };

  form.append(
    'operations',
    JSON.stringify({
      query: mutation,
      variables,
    }),
  );

  form.append(
    'map',
    JSON.stringify({
      file: ['variables.file'],
    }),
  );

  try {
    const response = await axios.post(API_ENDPOINTS.GRAPHQL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: authHeader,
      },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.uploadModel;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Model upload failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Upload signals to Numerai Signals
 */
export async function uploadSignalsFile(
  this: IExecuteFunctions,
  modelId: string,
  fileContent: Buffer | string,
  filename: string,
): Promise<IFileUploadResponse> {
  const credentials = (await this.getCredentials('numeraiApi')) as INumeraiCredentials;
  const authHeader = createAuthHeader(credentials);

  const form = new FormData();
  form.append('file', Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent), {
    filename,
    contentType: 'text/csv',
  });

  const mutation = `
    mutation($filename: String!, $modelId: String!) {
      uploadSignals(filename: $filename, modelId: $modelId) {
        id
        filename
        state
      }
    }
  `;

  const variables = {
    filename,
    modelId,
  };

  form.append(
    'operations',
    JSON.stringify({
      query: mutation,
      variables,
    }),
  );

  form.append(
    'map',
    JSON.stringify({
      file: ['variables.file'],
    }),
  );

  try {
    const response = await axios.post(API_ENDPOINTS.GRAPHQL, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: authHeader,
      },
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.uploadSignals;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Signals upload failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Download a dataset from Numerai
 */
export async function downloadDataset(
  this: IExecuteFunctions,
  options: IFileDownloadOptions,
): Promise<IBinaryData> {
  const { url, filename = 'dataset.csv', mimeType = 'text/csv' } = options;

  try {
    const response: AxiosResponse<Buffer> = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5 minute timeout for large files
    });

    const binaryData = await this.helpers.prepareBinaryData(
      Buffer.from(response.data),
      filename,
      mimeType,
    );

    return binaryData;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Download failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Stream download for very large files
 */
export async function downloadLargeDataset(
  this: IExecuteFunctions,
  options: IFileDownloadOptions,
): Promise<IBinaryData> {
  const { url, filename = 'dataset.parquet', mimeType = 'application/octet-stream' } = options;

  try {
    const response: AxiosResponse<Buffer> = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 600000, // 10 minute timeout for very large files
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const binaryData = await this.helpers.prepareBinaryData(
      Buffer.from(response.data),
      filename,
      mimeType,
    );

    return binaryData;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Large file download failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get presigned URL for dataset download
 */
export async function getDatasetUrl(
  this: IExecuteFunctions,
  datasetType: string,
  round?: number,
): Promise<string> {
  const credentials = (await this.getCredentials('numeraiApi')) as INumeraiCredentials;
  const authHeader = createAuthHeader(credentials);

  const query = `
    query($round: Int) {
      dataset(round: $round) {
        ${datasetType}Url
      }
    }
  `;

  try {
    const response = await axios.post(
      API_ENDPOINTS.GRAPHQL,
      {
        query,
        variables: { round },
      },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    const urlKey = `${datasetType}Url`;
    return response.data.data.dataset[urlKey];
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to get dataset URL: ${error.message}`);
    }
    throw error;
  }
}
