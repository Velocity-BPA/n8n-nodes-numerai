/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { roundProperties, executeRoundOperation } from './actions/round';
import { modelProperties, executeModelOperation } from './actions/model';
import { stakeProperties, executeStakeOperation } from './actions/stake';
import { accountProperties, executeAccountOperation } from './actions/account';
import { datasetProperties, executeDatasetOperation } from './actions/dataset';
import { leaderboardProperties, executeLeaderboardOperation } from './actions/leaderboard';
import { signalsProperties, executeSignalsOperation } from './actions/signals';
import { diagnosticsOperations, diagnosticsFields, executeDiagnosticsOperation } from './actions/diagnostics';

// Emit licensing notice once on node load
const LICENSING_NOTICE_EMITTED = Symbol.for('n8n-nodes-numerai.licensing-notice');
if (!(globalThis as Record<symbol, boolean>)[LICENSING_NOTICE_EMITTED]) {
	console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
	(globalThis as Record<symbol, boolean>)[LICENSING_NOTICE_EMITTED] = true;
}

export class Numerai implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Numerai',
		name: 'numerai',
		icon: 'file:numerai.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Numerai AI hedge fund tournament platform',
		defaults: {
			name: 'Numerai',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'numeraiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
						description: 'Manage your Numerai account',
					},
					{
						name: 'Dataset',
						value: 'dataset',
						description: 'Access tournament datasets',
					},
					{
						name: 'Diagnostics',
						value: 'diagnostics',
						description: 'Get model diagnostics and validation stats',
					},
					{
						name: 'Leaderboard',
						value: 'leaderboard',
						description: 'View tournament leaderboards',
					},
					{
						name: 'Model',
						value: 'model',
						description: 'Manage your prediction models',
					},
					{
						name: 'Round',
						value: 'round',
						description: 'Get tournament round information',
					},
					{
						name: 'Signals',
						value: 'signals',
						description: 'Numerai Signals tournament operations',
					},
					{
						name: 'Stake',
						value: 'stake',
						description: 'Manage NMR stakes on models',
					},
				],
				default: 'round',
			},
			// Round operations and fields
			...roundProperties,
			// Model operations and fields
			...modelProperties,
			// Stake operations and fields
			...stakeProperties,
			// Account operations and fields
			...accountProperties,
			// Dataset operations and fields
			...datasetProperties,
			// Leaderboard operations and fields
			...leaderboardProperties,
			// Signals operations and fields
			...signalsProperties,
			// Diagnostics operations and fields
			...diagnosticsOperations,
			...diagnosticsFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: INodeExecutionData[] = [];

				switch (resource) {
					case 'round':
						result = await executeRoundOperation.call(this, operation, i);
						break;
					case 'model':
						result = await executeModelOperation.call(this, operation, i);
						break;
					case 'stake':
						result = await executeStakeOperation.call(this, operation, i);
						break;
					case 'account':
						result = await executeAccountOperation.call(this, operation, i);
						break;
					case 'dataset':
						result = await executeDatasetOperation.call(this, operation, i);
						break;
					case 'leaderboard':
						result = await executeLeaderboardOperation.call(this, operation, i);
						break;
					case 'signals':
						result = await executeSignalsOperation.call(this, operation, i);
						break;
					case 'diagnostics':
						result = await executeDiagnosticsOperation.call(this, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				returnData.push(...result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
