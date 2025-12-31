/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class NumeraiApi implements ICredentialType {
  name = 'numeraiApi';
  displayName = 'Numerai API';
  documentationUrl = 'https://docs.numer.ai/tournament/api';
  properties: INodeProperties[] = [
    {
      displayName: 'Public ID',
      name: 'publicId',
      type: 'string',
      default: '',
      required: true,
      description:
        'Your Numerai API Public ID. Find this at <a href="https://numer.ai/account" target="_blank">numer.ai/account</a> under API Keys.',
    },
    {
      displayName: 'Secret Key',
      name: 'secretKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description:
        'Your Numerai API Secret Key. Find this at <a href="https://numer.ai/account" target="_blank">numer.ai/account</a> under API Keys.',
    },
    {
      displayName: 'Tournament',
      name: 'tournament',
      type: 'options',
      options: [
        {
          name: 'Classic',
          value: 'classic',
          description: 'Numerai Classic tournament - Stock market predictions',
        },
        {
          name: 'Signals',
          value: 'signals',
          description: 'Numerai Signals tournament - Custom signal predictions',
        },
      ],
      default: 'classic',
      description: 'The Numerai tournament to interact with',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Token {{$credentials.publicId}}${{$credentials.secretKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://api-tournament.numer.ai/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            v3UserProfile {
              id
              username
            }
          }
        `,
      }),
    },
  };
}
