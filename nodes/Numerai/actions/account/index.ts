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
 * Account resource properties
 */
export const accountProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['account'],
      },
    },
    options: [
      {
        name: 'Get Account',
        value: 'get',
        description: 'Get account information',
        action: 'Get account info',
      },
      {
        name: 'Get Balance',
        value: 'balance',
        description: 'Get account NMR balance',
        action: 'Get account balance',
      },
      {
        name: 'Get Transactions',
        value: 'transactions',
        description: 'Get NMR transaction history',
        action: 'Get transactions',
      },
      {
        name: 'Get Earnings',
        value: 'earnings',
        description: 'Get earnings breakdown by model',
        action: 'Get earnings',
      },
      {
        name: 'Get Payout History',
        value: 'payouts',
        description: 'Get payout history',
        action: 'Get payout history',
      },
    ],
    default: 'get',
  },
  // Transaction filters
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    displayOptions: {
      show: {
        resource: ['account'],
        operation: ['transactions', 'payouts'],
      },
    },
    description: 'Maximum number of records to return',
  },
];

/**
 * Account response interfaces
 */
interface IAccount {
  id: string;
  username: string;
  walletAddress: string;
  availableNmr: string;
  availableUsd: string;
  email: string;
  status: string;
  mfaEnabled: boolean;
}

interface IBalance {
  availableNmr: string;
  availableUsd: string;
  pendingNmr: string;
  stakedNmr: string;
}

interface ITransaction {
  id: string;
  time: string;
  type: string;
  amount: string;
  from: string;
  to: string;
  status: string;
}

interface IModelEarnings {
  name: string;
  roundModelPerformances: Array<{
    roundNumber: number;
    payout: number;
    corrPayout: number;
    tcPayout: number;
    mmcPayout: number;
  }>;
}

interface IPayout {
  id: string;
  roundNumber: number;
  amount: string;
  timestamp: string;
  status: string;
  modelName: string;
}

interface IAccountResponse {
  v3UserProfile: IAccount;
}

interface IBalanceResponse {
  v3UserProfile: IBalance;
}

interface ITransactionsResponse {
  v3UserProfile: {
    nmrTransactions: ITransaction[];
  };
}

interface IEarningsResponse {
  v3UserProfile: {
    models: IModelEarnings[];
  };
}

interface IPayoutsResponse {
  v3UserProfile: {
    payouts: IPayout[];
  };
}

/**
 * Execute account operations
 */
export async function executeAccountOperation(
  this: IExecuteFunctions,
  operation: string,
  i: number,
): Promise<INodeExecutionData[]> {
  const returnData: INodeExecutionData[] = [];

  switch (operation) {
    case 'get': {
      const response = (await executeGraphQL.call(this, QUERIES.GET_ACCOUNT)) as IAccountResponse;

      if (response.v3UserProfile) {
        const account = response.v3UserProfile;
        returnData.push({
          json: {
            ...account,
            availableNmrFormatted: formatNmr(account.availableNmr),
            availableUsdFormatted: `$${parseFloat(account.availableUsd).toFixed(2)}`,
          },
        });
      }
      break;
    }

    case 'balance': {
      const response = (await executeGraphQL.call(
        this,
        QUERIES.GET_ACCOUNT_BALANCE,
      )) as IBalanceResponse;

      if (response.v3UserProfile) {
        const balance = response.v3UserProfile;
        const available = parseFloat(balance.availableNmr) || 0;
        const pending = parseFloat(balance.pendingNmr) || 0;
        const staked = parseFloat(balance.stakedNmr) || 0;

        returnData.push({
          json: {
            availableNmr: formatNmr(available),
            pendingNmr: formatNmr(pending),
            stakedNmr: formatNmr(staked),
            totalNmr: formatNmr(available + pending + staked),
            availableUsd: balance.availableUsd,
            breakdown: {
              available,
              pending,
              staked,
              total: available + pending + staked,
            },
          },
        });
      }
      break;
    }

    case 'transactions': {
      const limit = this.getNodeParameter('limit', i) as number;
      const response = (await executeGraphQL.call(
        this,
        QUERIES.GET_TRANSACTIONS,
      )) as ITransactionsResponse;

      if (response.v3UserProfile?.nmrTransactions) {
        const transactions: ITransaction[] = response.v3UserProfile.nmrTransactions.slice(0, limit);

        for (const tx of transactions) {
          returnData.push({
            json: {
              ...tx,
              amountFormatted: formatNmr(tx.amount),
              date: new Date(tx.time).toISOString(),
            },
          });
        }

        // Add summary
        if (transactions.length > 0) {
          const totalIn = transactions
            .filter((tx: ITransaction) => parseFloat(tx.amount) > 0)
            .reduce((sum: number, tx: ITransaction) => sum + parseFloat(tx.amount), 0);
          const totalOut = transactions
            .filter((tx: ITransaction) => parseFloat(tx.amount) < 0)
            .reduce((sum: number, tx: ITransaction) => sum + Math.abs(parseFloat(tx.amount)), 0);

          returnData.push({
            json: {
              _summary: true,
              totalTransactions: transactions.length,
              totalIn: formatNmr(totalIn),
              totalOut: formatNmr(totalOut),
              net: formatNmr(totalIn - totalOut),
            },
          });
        }
      }
      break;
    }

    case 'earnings': {
      const response = (await executeGraphQL.call(this, QUERIES.GET_EARNINGS)) as IEarningsResponse;

      if (response.v3UserProfile?.models) {
        let totalEarnings = 0;

        for (const model of response.v3UserProfile.models) {
          const performances = model.roundModelPerformances || [];
          const modelTotal = performances.reduce((sum: number, p: { payout: number }) => sum + (p.payout || 0), 0);
          totalEarnings += modelTotal;

          returnData.push({
            json: {
              modelName: model.name,
              totalPayout: formatNmr(modelTotal),
              roundsScored: performances.length,
              avgPayout: formatNmr(
                performances.length > 0 ? modelTotal / performances.length : 0,
              ),
              latestRound:
                performances.length > 0 ? performances[performances.length - 1].roundNumber : null,
              breakdown: performances.map((p: { roundNumber: number; payout: number; corrPayout: number; tcPayout: number; mmcPayout: number }) => ({
                round: p.roundNumber,
                payout: p.payout,
                corrPayout: p.corrPayout,
                tcPayout: p.tcPayout,
                mmcPayout: p.mmcPayout,
              })),
            },
          });
        }

        // Add total summary
        returnData.push({
          json: {
            _summary: true,
            totalModels: response.v3UserProfile.models.length,
            totalEarnings: formatNmr(totalEarnings),
          },
        });
      }
      break;
    }

    case 'payouts': {
      const limit = this.getNodeParameter('limit', i) as number;
      const response = (await executeGraphQL.call(
        this,
        QUERIES.GET_PAYOUT_HISTORY,
      )) as IPayoutsResponse;

      if (response.v3UserProfile?.payouts) {
        const payouts: IPayout[] = response.v3UserProfile.payouts.slice(0, limit);

        for (const payout of payouts) {
          returnData.push({
            json: {
              ...payout,
              amountFormatted: formatNmr(payout.amount),
              date: new Date(payout.timestamp).toISOString(),
            },
          });
        }

        // Add summary
        if (payouts.length > 0) {
          const totalPayout = payouts.reduce((sum: number, p: IPayout) => sum + parseFloat(p.amount), 0);

          returnData.push({
            json: {
              _summary: true,
              totalPayouts: payouts.length,
              totalAmount: formatNmr(totalPayout),
              avgPayout: formatNmr(totalPayout / payouts.length),
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
