/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { executeGraphQL, QUERIES } from './transport/graphqlClient';
import { fromWei } from './helpers/amountConverter';

export class NumeraiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Numerai Trigger',
		name: 'numeraiTrigger',
		icon: 'file:numerai.svg',
		group: ['trigger'],
		version: 1,
		description: 'Polls Numerai for events like new rounds, submissions, and stake changes',
		defaults: {
			name: 'Numerai Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'numeraiApi',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'New Round Started',
						value: 'newRound',
						description: 'Trigger when a new tournament round starts',
					},
					{
						name: 'Round Closing Soon',
						value: 'roundClosing',
						description: 'Trigger when a round is closing within specified time',
					},
					{
						name: 'Round Resolved',
						value: 'roundResolved',
						description: 'Trigger when a round is resolved and scores are available',
					},
					{
						name: 'Scores Released',
						value: 'scoresReleased',
						description: 'Trigger when new scores are released for your models',
					},
					{
						name: 'Submission Received',
						value: 'submissionReceived',
						description: 'Trigger when a new submission is received',
					},
					{
						name: 'Submission Scored',
						value: 'submissionScored',
						description: 'Trigger when a submission is scored',
					},
					{
						name: 'Submission Failed',
						value: 'submissionFailed',
						description: 'Trigger when a submission fails validation',
					},
					{
						name: 'Stake Changed',
						value: 'stakeChanged',
						description: 'Trigger when stake amount changes on any model',
					},
					{
						name: 'Payout Received',
						value: 'payoutReceived',
						description: 'Trigger when a payout is received',
					},
					{
						name: 'Stake At Risk',
						value: 'stakeAtRisk',
						description: 'Trigger when model performance puts stake at risk',
					},
				],
				default: 'newRound',
			},
			{
				displayName: 'Model Name',
				name: 'modelName',
				type: 'string',
				default: '',
				description: 'Specific model to monitor (leave empty to monitor all models)',
				displayOptions: {
					show: {
						triggerOn: [
							'submissionReceived',
							'submissionScored',
							'submissionFailed',
							'stakeChanged',
							'payoutReceived',
							'stakeAtRisk',
							'scoresReleased',
						],
					},
				},
			},
			{
				displayName: 'Hours Before Close',
				name: 'hoursBeforeClose',
				type: 'number',
				default: 24,
				description: 'Trigger when round will close within this many hours',
				displayOptions: {
					show: {
						triggerOn: ['roundClosing'],
					},
				},
			},
			{
				displayName: 'Risk Threshold',
				name: 'riskThreshold',
				type: 'number',
				default: -0.05,
				description:
					'Correlation threshold below which stake is considered at risk (e.g., -0.05)',
				displayOptions: {
					show: {
						triggerOn: ['stakeAtRisk'],
					},
				},
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		const webhookData = this.getWorkflowStaticData('node');

		let result: INodeExecutionData[] | null = null;

		try {
			switch (triggerOn) {
				case 'newRound':
					result = await pollNewRound.call(this, webhookData);
					break;
				case 'roundClosing':
					result = await pollRoundClosing.call(this, webhookData);
					break;
				case 'roundResolved':
					result = await pollRoundResolved.call(this, webhookData);
					break;
				case 'scoresReleased':
					result = await pollScoresReleased.call(this, webhookData);
					break;
				case 'submissionReceived':
					result = await pollSubmissionReceived.call(this, webhookData);
					break;
				case 'submissionScored':
					result = await pollSubmissionScored.call(this, webhookData);
					break;
				case 'submissionFailed':
					result = await pollSubmissionFailed.call(this, webhookData);
					break;
				case 'stakeChanged':
					result = await pollStakeChanged.call(this, webhookData);
					break;
				case 'payoutReceived':
					result = await pollPayoutReceived.call(this, webhookData);
					break;
				case 'stakeAtRisk':
					result = await pollStakeAtRisk.call(this, webhookData);
					break;
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error(`Numerai Trigger Error (${triggerOn}):`, errorMessage);
			return null;
		}

		if (result && result.length > 0) {
			return [result];
		}

		return null;
	}
}

// Poll for new round
async function pollNewRound(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	interface IRoundsResponse {
		rounds: Array<{
			number: number;
			openTime: string;
			closeTime: string;
			resolveTime: string;
		}>;
	}

	const response = await executeGraphQL.call(this, QUERIES.GET_CURRENT_ROUND) as IRoundsResponse;
	const rounds = response.rounds || [];

	if (rounds.length === 0) return null;

	const currentRound = rounds[rounds.length - 1];
	const lastRoundNumber = (webhookData.lastRoundNumber as number) || 0;

	if (currentRound.number > lastRoundNumber) {
		webhookData.lastRoundNumber = currentRound.number;

		return [
			{
				json: {
					event: 'newRound',
					roundNumber: currentRound.number,
					openTime: currentRound.openTime,
					closeTime: currentRound.closeTime,
					resolveTime: currentRound.resolveTime,
					timestamp: new Date().toISOString(),
				},
			},
		];
	}

	return null;
}

// Poll for round closing
async function pollRoundClosing(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const hoursBeforeClose = this.getNodeParameter('hoursBeforeClose') as number;

	interface IRoundsResponse {
		rounds: Array<{
			number: number;
			closeTime: string;
		}>;
	}

	const response = await executeGraphQL.call(this, QUERIES.GET_CURRENT_ROUND) as IRoundsResponse;
	const rounds = response.rounds || [];

	if (rounds.length === 0) return null;

	const currentRound = rounds[rounds.length - 1];
	const closeTime = new Date(currentRound.closeTime);
	const now = new Date();
	const hoursUntilClose = (closeTime.getTime() - now.getTime()) / (1000 * 60 * 60);

	// Check if we're within the threshold and haven't already triggered for this round
	const lastClosingRound = (webhookData.lastClosingRound as number) || 0;

	if (hoursUntilClose <= hoursBeforeClose && hoursUntilClose > 0 && currentRound.number > lastClosingRound) {
		webhookData.lastClosingRound = currentRound.number;

		return [
			{
				json: {
					event: 'roundClosing',
					roundNumber: currentRound.number,
					closeTime: currentRound.closeTime,
					hoursRemaining: Math.round(hoursUntilClose * 100) / 100,
					timestamp: new Date().toISOString(),
				},
			},
		];
	}

	return null;
}

// Poll for round resolved
async function pollRoundResolved(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	interface IRoundsResponse {
		rounds: Array<{
			number: number;
			resolveTime: string;
		}>;
	}

	const response = await executeGraphQL.call(this, QUERIES.GET_CURRENT_ROUND) as IRoundsResponse;
	const rounds = response.rounds || [];

	if (rounds.length < 2) return null;

	// Check the second-to-last round for resolution
	const previousRound = rounds[rounds.length - 2];
	const resolveTime = new Date(previousRound.resolveTime);
	const now = new Date();

	const lastResolvedRound = (webhookData.lastResolvedRound as number) || 0;

	if (now > resolveTime && previousRound.number > lastResolvedRound) {
		webhookData.lastResolvedRound = previousRound.number;

		return [
			{
				json: {
					event: 'roundResolved',
					roundNumber: previousRound.number,
					resolveTime: previousRound.resolveTime,
					timestamp: new Date().toISOString(),
				},
			},
		];
	}

	return null;
}

// Poll for scores released
async function pollScoresReleased(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const modelName = this.getNodeParameter('modelName') as string;

	const query = modelName
		? `
			query($modelName: String!) {
				v3UserProfile {
					models(modelName: $modelName) {
						name
						roundModelPerformances {
							roundNumber
							corr
							mmc
							tc
							payout
							roundResolved
						}
					}
				}
			}
		`
		: `
			query {
				v3UserProfile {
					models {
						name
						roundModelPerformances {
							roundNumber
							corr
							mmc
							tc
							payout
							roundResolved
						}
					}
				}
			}
		`;

	interface IPerformanceResponse {
		v3UserProfile: {
			models: Array<{
				name: string;
				roundModelPerformances: Array<{
					roundNumber: number;
					corr: number;
					mmc: number;
					tc: number;
					payout: number;
					roundResolved: boolean;
				}>;
			}>;
		};
	}

	const variables = modelName ? { modelName } : undefined;
	const response = await executeGraphQL.call(this, query, variables) as IPerformanceResponse;
	const models = response.v3UserProfile?.models || [];

	const results: INodeExecutionData[] = [];
	const lastScoresMap = (webhookData.lastScoresMap as Record<string, number>) || {};

	for (const model of models) {
		const performances = model.roundModelPerformances || [];
		const resolvedPerformances = performances.filter((p) => p.roundResolved);

		if (resolvedPerformances.length === 0) continue;

		const latestResolved = resolvedPerformances[resolvedPerformances.length - 1];
		const lastKnownRound = lastScoresMap[model.name] || 0;

		if (latestResolved.roundNumber > lastKnownRound) {
			lastScoresMap[model.name] = latestResolved.roundNumber;

			results.push({
				json: {
					event: 'scoresReleased',
					modelName: model.name,
					roundNumber: latestResolved.roundNumber,
					corr: latestResolved.corr,
					mmc: latestResolved.mmc,
					tc: latestResolved.tc,
					payout: latestResolved.payout,
					timestamp: new Date().toISOString(),
				},
			});
		}
	}

	webhookData.lastScoresMap = lastScoresMap;

	return results.length > 0 ? results : null;
}

// Poll for submission received
async function pollSubmissionReceived(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const modelName = this.getNodeParameter('modelName') as string;

	const query = `
		query {
			v3UserProfile {
				models {
					name
					latestSubmission {
						id
						filename
						state
						createdAt
					}
				}
			}
		}
	`;

	interface ISubmissionResponse {
		v3UserProfile: {
			models: Array<{
				name: string;
				latestSubmission: {
					id: string;
					filename: string;
					state: string;
					createdAt: string;
				};
			}>;
		};
	}

	const response = await executeGraphQL.call(this, query) as ISubmissionResponse;
	let models = response.v3UserProfile?.models || [];

	if (modelName) {
		models = models.filter((m) => m.name === modelName);
	}

	const results: INodeExecutionData[] = [];
	const lastSubmissionIds = (webhookData.lastSubmissionIds as Record<string, string>) || {};

	for (const model of models) {
		const submission = model.latestSubmission;
		if (!submission) continue;

		const lastId = lastSubmissionIds[model.name] || '';

		if (submission.id !== lastId) {
			lastSubmissionIds[model.name] = submission.id;

			results.push({
				json: {
					event: 'submissionReceived',
					modelName: model.name,
					submissionId: submission.id,
					filename: submission.filename,
					state: submission.state,
					createdAt: submission.createdAt,
					timestamp: new Date().toISOString(),
				},
			});
		}
	}

	webhookData.lastSubmissionIds = lastSubmissionIds;

	return results.length > 0 ? results : null;
}

// Poll for submission scored
async function pollSubmissionScored(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const modelName = this.getNodeParameter('modelName') as string;

	const query = `
		query {
			v3UserProfile {
				models {
					name
					latestSubmission {
						id
						state
					}
				}
			}
		}
	`;

	interface ISubmissionResponse {
		v3UserProfile: {
			models: Array<{
				name: string;
				latestSubmission: {
					id: string;
					state: string;
				};
			}>;
		};
	}

	const response = await executeGraphQL.call(this, query) as ISubmissionResponse;
	let models = response.v3UserProfile?.models || [];

	if (modelName) {
		models = models.filter((m) => m.name === modelName);
	}

	const results: INodeExecutionData[] = [];
	const scoredSubmissions = (webhookData.scoredSubmissions as Record<string, string>) || {};

	for (const model of models) {
		const submission = model.latestSubmission;
		if (!submission) continue;

		const wasScored = scoredSubmissions[submission.id];

		if (submission.state === 'SCORED' && !wasScored) {
			scoredSubmissions[submission.id] = 'true';

			results.push({
				json: {
					event: 'submissionScored',
					modelName: model.name,
					submissionId: submission.id,
					state: submission.state,
					timestamp: new Date().toISOString(),
				},
			});
		}
	}

	webhookData.scoredSubmissions = scoredSubmissions;

	return results.length > 0 ? results : null;
}

// Poll for submission failed
async function pollSubmissionFailed(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const modelName = this.getNodeParameter('modelName') as string;

	const query = `
		query {
			v3UserProfile {
				models {
					name
					latestSubmission {
						id
						state
						filename
					}
				}
			}
		}
	`;

	interface ISubmissionResponse {
		v3UserProfile: {
			models: Array<{
				name: string;
				latestSubmission: {
					id: string;
					state: string;
					filename: string;
				};
			}>;
		};
	}

	const response = await executeGraphQL.call(this, query) as ISubmissionResponse;
	let models = response.v3UserProfile?.models || [];

	if (modelName) {
		models = models.filter((m) => m.name === modelName);
	}

	const results: INodeExecutionData[] = [];
	const failedSubmissions = (webhookData.failedSubmissions as Record<string, string>) || {};

	for (const model of models) {
		const submission = model.latestSubmission;
		if (!submission) continue;

		const wasFailed = failedSubmissions[submission.id];

		if ((submission.state === 'FAILED' || submission.state === 'ERROR') && !wasFailed) {
			failedSubmissions[submission.id] = 'true';

			results.push({
				json: {
					event: 'submissionFailed',
					modelName: model.name,
					submissionId: submission.id,
					filename: submission.filename,
					state: submission.state,
					timestamp: new Date().toISOString(),
				},
			});
		}
	}

	webhookData.failedSubmissions = failedSubmissions;

	return results.length > 0 ? results : null;
}

// Poll for stake changed
async function pollStakeChanged(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const modelName = this.getNodeParameter('modelName') as string;

	const query = `
		query {
			v3UserProfile {
				models {
					name
					nmrStaked
				}
			}
		}
	`;

	interface IStakeResponse {
		v3UserProfile: {
			models: Array<{
				name: string;
				nmrStaked: string;
			}>;
		};
	}

	const response = await executeGraphQL.call(this, query) as IStakeResponse;
	let models = response.v3UserProfile?.models || [];

	if (modelName) {
		models = models.filter((m) => m.name === modelName);
	}

	const results: INodeExecutionData[] = [];
	const stakeAmounts = (webhookData.stakeAmounts as Record<string, string>) || {};

	for (const model of models) {
		const currentStake = model.nmrStaked;
		const previousStake = stakeAmounts[model.name];

		if (previousStake !== undefined && previousStake !== currentStake) {
			results.push({
				json: {
					event: 'stakeChanged',
					modelName: model.name,
					previousStake: fromWei(previousStake),
					currentStake: fromWei(currentStake),
					change: parseFloat(fromWei(currentStake)) - parseFloat(fromWei(previousStake)),
					timestamp: new Date().toISOString(),
				},
			});
		}

		stakeAmounts[model.name] = currentStake;
	}

	webhookData.stakeAmounts = stakeAmounts;

	return results.length > 0 ? results : null;
}

// Poll for payout received
async function pollPayoutReceived(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const modelName = this.getNodeParameter('modelName') as string;

	const query = `
		query {
			v3UserProfile {
				models {
					name
					roundModelPerformances {
						roundNumber
						payout
						roundResolved
					}
				}
			}
		}
	`;

	interface IPayoutResponse {
		v3UserProfile: {
			models: Array<{
				name: string;
				roundModelPerformances: Array<{
					roundNumber: number;
					payout: number;
					roundResolved: boolean;
				}>;
			}>;
		};
	}

	const response = await executeGraphQL.call(this, query) as IPayoutResponse;
	let models = response.v3UserProfile?.models || [];

	if (modelName) {
		models = models.filter((m) => m.name === modelName);
	}

	const results: INodeExecutionData[] = [];
	const lastPayoutRounds = (webhookData.lastPayoutRounds as Record<string, number>) || {};

	for (const model of models) {
		const performances = model.roundModelPerformances || [];
		const resolvedWithPayout = performances.filter((p) => p.roundResolved && p.payout !== 0);

		if (resolvedWithPayout.length === 0) continue;

		const latestPayout = resolvedWithPayout[resolvedWithPayout.length - 1];
		const lastKnownRound = lastPayoutRounds[model.name] || 0;

		if (latestPayout.roundNumber > lastKnownRound && latestPayout.payout !== 0) {
			lastPayoutRounds[model.name] = latestPayout.roundNumber;

			results.push({
				json: {
					event: 'payoutReceived',
					modelName: model.name,
					roundNumber: latestPayout.roundNumber,
					payout: latestPayout.payout,
					isPositive: latestPayout.payout > 0,
					timestamp: new Date().toISOString(),
				},
			});
		}
	}

	webhookData.lastPayoutRounds = lastPayoutRounds;

	return results.length > 0 ? results : null;
}

// Poll for stake at risk
async function pollStakeAtRisk(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[] | null> {
	const modelName = this.getNodeParameter('modelName') as string;
	const riskThreshold = this.getNodeParameter('riskThreshold') as number;

	const query = `
		query {
			v3UserProfile {
				models {
					name
					nmrStaked
					roundModelPerformances {
						roundNumber
						corr
						roundResolved
					}
				}
			}
		}
	`;

	interface IRiskResponse {
		v3UserProfile: {
			models: Array<{
				name: string;
				nmrStaked: string;
				roundModelPerformances: Array<{
					roundNumber: number;
					corr: number;
					roundResolved: boolean;
				}>;
			}>;
		};
	}

	const response = await executeGraphQL.call(this, query) as IRiskResponse;
	let models = response.v3UserProfile?.models || [];

	if (modelName) {
		models = models.filter((m) => m.name === modelName);
	}

	const results: INodeExecutionData[] = [];
	const atRiskModels = (webhookData.atRiskModels as Record<string, boolean>) || {};

	for (const model of models) {
		const stake = fromWei(model.nmrStaked);
		if (parseFloat(stake) === 0) continue;

		const performances = model.roundModelPerformances || [];
		const unresolvedPerf = performances.filter((p) => !p.roundResolved);

		if (unresolvedPerf.length === 0) continue;

		// Check latest unresolved performance
		const latest = unresolvedPerf[unresolvedPerf.length - 1];
		const isAtRisk = latest.corr < riskThreshold;
		const wasAtRisk = atRiskModels[model.name] || false;

		if (isAtRisk && !wasAtRisk) {
			atRiskModels[model.name] = true;

			results.push({
				json: {
					event: 'stakeAtRisk',
					modelName: model.name,
					roundNumber: latest.roundNumber,
					correlation: latest.corr,
					threshold: riskThreshold,
					stakeAmount: stake,
					timestamp: new Date().toISOString(),
				},
			});
		} else if (!isAtRisk && wasAtRisk) {
			// Model is no longer at risk
			atRiskModels[model.name] = false;
		}
	}

	webhookData.atRiskModels = atRiskModels;

	return results.length > 0 ? results : null;
}
