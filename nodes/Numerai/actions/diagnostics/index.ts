/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { executeGraphQL } from '../../transport/graphqlClient';

// Diagnostics resource operations
export const diagnosticsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['diagnostics'],
			},
		},
		options: [
			{
				name: 'Get Model Diagnostics',
				value: 'model',
				description: 'Get comprehensive diagnostics for a model',
				action: 'Get model diagnostics',
			},
			{
				name: 'Get Validation Stats',
				value: 'validation',
				description: 'Get validation statistics for predictions',
				action: 'Get validation stats',
			},
			{
				name: 'Get Feature Exposure',
				value: 'featureExposure',
				description: 'Get feature exposure analysis',
				action: 'Get feature exposure',
			},
			{
				name: 'Get Correlation',
				value: 'correlation',
				description: 'Get correlation metrics',
				action: 'Get correlation',
			},
			{
				name: 'Get Sharpe Ratio',
				value: 'sharpe',
				description: 'Get Sharpe ratio for model performance',
				action: 'Get sharpe ratio',
			},
			{
				name: 'Get Max Drawdown',
				value: 'maxDrawdown',
				description: 'Get maximum drawdown statistics',
				action: 'Get max drawdown',
			},
		],
		default: 'model',
	},
];

// Diagnostics resource fields
export const diagnosticsFields: INodeProperties[] = [
	// Model Diagnostics
	{
		displayName: 'Model Name',
		name: 'modelName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the model to get diagnostics for',
		displayOptions: {
			show: {
				resource: ['diagnostics'],
				operation: ['model', 'validation', 'featureExposure', 'correlation', 'sharpe', 'maxDrawdown'],
			},
		},
	},
	{
		displayName: 'Include Details',
		name: 'includeDetails',
		type: 'boolean',
		default: true,
		description: 'Whether to include detailed breakdown',
		displayOptions: {
			show: {
				resource: ['diagnostics'],
				operation: ['model'],
			},
		},
	},
	// Validation Stats options
	{
		displayName: 'Round Number',
		name: 'roundNumber',
		type: 'number',
		default: 0,
		description: 'Specific round number (0 for latest)',
		displayOptions: {
			show: {
				resource: ['diagnostics'],
				operation: ['validation', 'featureExposure', 'correlation'],
			},
		},
	},
	// Feature Exposure options
	{
		displayName: 'Feature Group',
		name: 'featureGroup',
		type: 'options',
		options: [
			{ name: 'All Features', value: 'all' },
			{ name: 'Small', value: 'small' },
			{ name: 'Medium', value: 'medium' },
			{ name: 'V4 Rain', value: 'v4_rain' },
			{ name: 'V4 Sunshine', value: 'v4_sunshine' },
		],
		default: 'all',
		description: 'Feature group to analyze exposure for',
		displayOptions: {
			show: {
				resource: ['diagnostics'],
				operation: ['featureExposure'],
			},
		},
	},
	// Sharpe options
	{
		displayName: 'Period',
		name: 'period',
		type: 'options',
		options: [
			{ name: 'All Time', value: 'all' },
			{ name: 'Last 20 Rounds', value: '20' },
			{ name: 'Last 52 Rounds', value: '52' },
			{ name: 'Last 104 Rounds', value: '104' },
		],
		default: 'all',
		description: 'Time period for Sharpe ratio calculation',
		displayOptions: {
			show: {
				resource: ['diagnostics'],
				operation: ['sharpe', 'maxDrawdown'],
			},
		},
	},
];

// Execute diagnostics operations
export async function executeDiagnosticsOperation(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as string;
	const modelName = this.getNodeParameter('modelName', index) as string;

	let result: Record<string, unknown>;

	switch (operation) {
		case 'model': {
			const includeDetails = this.getNodeParameter('includeDetails', index, true) as boolean;
			result = await getModelDiagnostics.call(this, modelName, includeDetails);
			break;
		}
		case 'validation': {
			const roundNumber = this.getNodeParameter('roundNumber', index, 0) as number;
			result = await getValidationStats.call(this, modelName, roundNumber);
			break;
		}
		case 'featureExposure': {
			const roundNumber = this.getNodeParameter('roundNumber', index, 0) as number;
			const featureGroup = this.getNodeParameter('featureGroup', index, 'all') as string;
			result = await getFeatureExposure.call(this, modelName, roundNumber, featureGroup);
			break;
		}
		case 'correlation': {
			const roundNumber = this.getNodeParameter('roundNumber', index, 0) as number;
			result = await getCorrelation.call(this, modelName, roundNumber);
			break;
		}
		case 'sharpe': {
			const period = this.getNodeParameter('period', index, 'all') as string;
			result = await getSharpeRatio.call(this, modelName, period);
			break;
		}
		case 'maxDrawdown': {
			const period = this.getNodeParameter('period', index, 'all') as string;
			result = await getMaxDrawdown.call(this, modelName, period);
			break;
		}
		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
	}

	return [{ json: result as IDataObject }];
}

// Get model diagnostics
async function getModelDiagnostics(
	this: IExecuteFunctions,
	modelName: string,
	includeDetails: boolean,
): Promise<Record<string, unknown>> {
	// First get the model ID
	const modelQuery = `
		query {
			v3UserProfile {
				models {
					id
					name
					tournament
				}
			}
		}
	`;

	const modelData = await executeGraphQL.call(this, modelQuery);
	const models = modelData.v3UserProfile?.models || [];
	const model = models.find((m: Record<string, unknown>) => m.name === modelName);

	if (!model) {
		throw new NodeOperationError(this.getNode(), `Model not found: ${modelName}`);
	}

	// Get diagnostics for the model
	const query = `
		query($modelId: String!) {
			v2SignalSubmissions(modelId: $modelId) {
				id
				round {
					number
				}
				diagnostics {
					validationCorrelation
					validationMmc
					validationFnc
					validationCorrPlusMmc
					validationFeatureNeutralCorr
					validationMaxDrawdown
					validationSharpe
					validationFeatureExposure
					validationMaxFeatureExposure
				}
			}
		}
	`;

	const variables = { modelId: model.id };
	const data = await executeGraphQL.call(this, query, variables);

	const submissions = data.v2SignalSubmissions || [];
	const latestSubmission = submissions[0];
	const diagnostics = latestSubmission?.diagnostics;

	const result: Record<string, unknown> = {
		modelName,
		modelId: model.id,
		tournament: model.tournament,
		hasDiagnostics: !!diagnostics,
	};

	if (diagnostics) {
		result.diagnostics = {
			validationCorrelation: diagnostics.validationCorrelation,
			validationMmc: diagnostics.validationMmc,
			validationFnc: diagnostics.validationFnc,
			validationCorrPlusMmc: diagnostics.validationCorrPlusMmc,
			validationFeatureNeutralCorr: diagnostics.validationFeatureNeutralCorr,
			validationMaxDrawdown: diagnostics.validationMaxDrawdown,
			validationSharpe: diagnostics.validationSharpe,
			validationFeatureExposure: diagnostics.validationFeatureExposure,
			validationMaxFeatureExposure: diagnostics.validationMaxFeatureExposure,
		};

		if (includeDetails) {
			result.summary = {
				correlation: diagnostics.validationCorrelation,
				sharpe: diagnostics.validationSharpe,
				maxDrawdown: diagnostics.validationMaxDrawdown,
				maxFeatureExposure: diagnostics.validationMaxFeatureExposure,
			};

			// Calculate quality indicators
			const corr = diagnostics.validationCorrelation || 0;
			const sharpe = diagnostics.validationSharpe || 0;
			const maxExposure = diagnostics.validationMaxFeatureExposure || 0;

			result.quality = {
				correlationRating: corr >= 0.03 ? 'Good' : corr >= 0.02 ? 'Fair' : 'Needs Improvement',
				sharpeRating: sharpe >= 0.5 ? 'Good' : sharpe >= 0.25 ? 'Fair' : 'Needs Improvement',
				exposureRating: maxExposure <= 0.1 ? 'Good' : maxExposure <= 0.2 ? 'Fair' : 'High Risk',
			};
		}
	}

	return result;
}

// Get validation stats
async function getValidationStats(
	this: IExecuteFunctions,
	modelName: string,
	roundNumber: number,
): Promise<Record<string, unknown>> {
	// Get model ID
	const modelQuery = `
		query {
			v3UserProfile {
				models {
					id
					name
				}
			}
		}
	`;

	const modelData = await executeGraphQL.call(this, modelQuery);
	const models = modelData.v3UserProfile?.models || [];
	const model = models.find((m: Record<string, unknown>) => m.name === modelName);

	if (!model) {
		throw new NodeOperationError(this.getNode(), `Model not found: ${modelName}`);
	}

	// Get round info
	const roundQuery = `
		query {
			rounds {
				number
				openTime
				closeTime
				resolveTime
			}
		}
	`;

	const roundData = await executeGraphQL.call(this, roundQuery);
	const rounds = roundData.rounds || [];
	const targetRound = roundNumber > 0 
		? rounds.find((r: Record<string, unknown>) => r.number === roundNumber)
		: rounds[0];

	// Get model performance for validation
	const perfQuery = `
		query($modelId: String!) {
			v2SignalSubmissions(modelId: $modelId) {
				round {
					number
				}
				diagnostics {
					validationCorrelation
					validationMmc
					validationFnc
					validationSharpe
					validationMaxDrawdown
				}
			}
		}
	`;

	const perfData = await executeGraphQL.call(this, perfQuery, { modelId: model.id });
	const submissions = perfData.v2SignalSubmissions || [];
	
	const targetSubmission = roundNumber > 0
		? submissions.find((s: Record<string, unknown>) => 
				(s.round as Record<string, unknown>)?.number === roundNumber)
		: submissions[0];

	if (!targetSubmission?.diagnostics) {
		return {
			modelName,
			modelId: model.id,
			round: targetRound?.number,
			message: 'No validation stats available for this round',
		};
	}

	const diag = targetSubmission.diagnostics;

	return {
		modelName,
		modelId: model.id,
		round: (targetSubmission.round as Record<string, unknown>)?.number,
		stats: {
			correlation: diag.validationCorrelation,
			mmc: diag.validationMmc,
			fnc: diag.validationFnc,
			sharpe: diag.validationSharpe,
			maxDrawdown: diag.validationMaxDrawdown,
		},
		summary: {
			mean: diag.validationCorrelation,
			std: Math.abs((diag.validationCorrelation || 0) / (diag.validationSharpe || 1)),
			sharpe: diag.validationSharpe,
			maxDrawdown: diag.validationMaxDrawdown,
		},
	};
}

// Get feature exposure
async function getFeatureExposure(
	this: IExecuteFunctions,
	modelName: string,
	roundNumber: number,
	featureGroup: string,
): Promise<Record<string, unknown>> {
	// Get model ID
	const modelQuery = `
		query {
			v3UserProfile {
				models {
					id
					name
				}
			}
		}
	`;

	const modelData = await executeGraphQL.call(this, modelQuery);
	const models = modelData.v3UserProfile?.models || [];
	const model = models.find((m: Record<string, unknown>) => m.name === modelName);

	if (!model) {
		throw new NodeOperationError(this.getNode(), `Model not found: ${modelName}`);
	}

	const query = `
		query($modelId: String!) {
			v2SignalSubmissions(modelId: $modelId) {
				round {
					number
				}
				diagnostics {
					validationFeatureExposure
					validationMaxFeatureExposure
				}
			}
		}
	`;

	const data = await executeGraphQL.call(this, query, { modelId: model.id });
	const submissions = data.v2SignalSubmissions || [];

	const targetSubmission = roundNumber > 0
		? submissions.find((s: Record<string, unknown>) => 
				(s.round as Record<string, unknown>)?.number === roundNumber)
		: submissions[0];

	const diag = targetSubmission?.diagnostics;

	return {
		modelName,
		modelId: model.id,
		round: (targetSubmission?.round as Record<string, unknown>)?.number,
		featureGroup,
		exposure: {
			meanExposure: diag?.validationFeatureExposure || null,
			maxExposure: diag?.validationMaxFeatureExposure || null,
		},
		riskAssessment: {
			isHighExposure: (diag?.validationMaxFeatureExposure || 0) > 0.2,
			recommendation: (diag?.validationMaxFeatureExposure || 0) > 0.2
				? 'Consider reducing feature exposure through neutralization'
				: 'Feature exposure is within acceptable range',
		},
	};
}

// Get correlation metrics
async function getCorrelation(
	this: IExecuteFunctions,
	modelName: string,
	roundNumber: number,
): Promise<Record<string, unknown>> {
	// Get model ID
	const modelQuery = `
		query {
			v3UserProfile {
				models {
					id
					name
				}
			}
		}
	`;

	const modelData = await executeGraphQL.call(this, modelQuery);
	const models = modelData.v3UserProfile?.models || [];
	const model = models.find((m: Record<string, unknown>) => m.name === modelName);

	if (!model) {
		throw new NodeOperationError(this.getNode(), `Model not found: ${modelName}`);
	}

	const query = `
		query($modelId: String!) {
			v2SignalSubmissions(modelId: $modelId) {
				round {
					number
				}
				diagnostics {
					validationCorrelation
					validationCorrPlusMmc
					validationFeatureNeutralCorr
				}
			}
		}
	`;

	const data = await executeGraphQL.call(this, query, { modelId: model.id });
	const submissions = data.v2SignalSubmissions || [];

	const targetSubmission = roundNumber > 0
		? submissions.find((s: Record<string, unknown>) => 
				(s.round as Record<string, unknown>)?.number === roundNumber)
		: submissions[0];

	const diag = targetSubmission?.diagnostics;

	return {
		modelName,
		modelId: model.id,
		round: (targetSubmission?.round as Record<string, unknown>)?.number,
		correlation: {
			standard: diag?.validationCorrelation || null,
			corrPlusMmc: diag?.validationCorrPlusMmc || null,
			featureNeutral: diag?.validationFeatureNeutralCorr || null,
		},
		interpretation: {
			standardRating: (diag?.validationCorrelation || 0) >= 0.03 ? 'Strong' : 
				(diag?.validationCorrelation || 0) >= 0.02 ? 'Moderate' : 'Weak',
			hasPositiveCorrelation: (diag?.validationCorrelation || 0) > 0,
		},
	};
}

// Get Sharpe ratio
async function getSharpeRatio(
	this: IExecuteFunctions,
	modelName: string,
	period: string,
): Promise<Record<string, unknown>> {
	// Get model ID and performance
	const modelQuery = `
		query {
			v3UserProfile {
				models {
					id
					name
				}
			}
		}
	`;

	const modelData = await executeGraphQL.call(this, modelQuery);
	const models = modelData.v3UserProfile?.models || [];
	const model = models.find((m: Record<string, unknown>) => m.name === modelName);

	if (!model) {
		throw new NodeOperationError(this.getNode(), `Model not found: ${modelName}`);
	}

	const query = `
		query($modelId: String!) {
			v2SignalSubmissions(modelId: $modelId) {
				round {
					number
				}
				diagnostics {
					validationCorrelation
					validationSharpe
				}
			}
		}
	`;

	const data = await executeGraphQL.call(this, query, { modelId: model.id });
	const submissions = data.v2SignalSubmissions || [];

	// Filter by period
	const periodCount = period === 'all' ? submissions.length : parseInt(period, 10);
	const periodSubmissions = submissions.slice(0, Math.min(periodCount, submissions.length));

	// Calculate Sharpe ratio from available data
	const correlations = periodSubmissions
		.map((s: Record<string, unknown>) => (s.diagnostics as Record<string, unknown>)?.validationCorrelation)
		.filter((c: unknown) => c !== null && c !== undefined) as number[];

	let calculatedSharpe = 0;
	let mean = 0;
	let std = 0;

	if (correlations.length > 0) {
		mean = correlations.reduce((a, b) => a + b, 0) / correlations.length;
		std = Math.sqrt(
			correlations.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / correlations.length
		);
		calculatedSharpe = std > 0 ? mean / std : 0;
	}

	// Get the latest diagnostic Sharpe if available
	const latestSharpe = (submissions[0]?.diagnostics as Record<string, unknown>)?.validationSharpe;

	return {
		modelName,
		modelId: model.id,
		period: period === 'all' ? 'All Time' : `Last ${period} Rounds`,
		periodsAnalyzed: correlations.length,
		sharpeRatio: {
			diagnosticSharpe: latestSharpe || null,
			calculatedSharpe,
			mean,
			standardDeviation: std,
		},
		interpretation: {
			rating: calculatedSharpe >= 1 ? 'Excellent' :
				calculatedSharpe >= 0.5 ? 'Good' :
				calculatedSharpe >= 0.25 ? 'Moderate' : 'Poor',
			isPositive: calculatedSharpe > 0,
		},
	};
}

// Get max drawdown
async function getMaxDrawdown(
	this: IExecuteFunctions,
	modelName: string,
	period: string,
): Promise<Record<string, unknown>> {
	// Get model ID
	const modelQuery = `
		query {
			v3UserProfile {
				models {
					id
					name
				}
			}
		}
	`;

	const modelData = await executeGraphQL.call(this, modelQuery);
	const models = modelData.v3UserProfile?.models || [];
	const model = models.find((m: Record<string, unknown>) => m.name === modelName);

	if (!model) {
		throw new NodeOperationError(this.getNode(), `Model not found: ${modelName}`);
	}

	const query = `
		query($modelId: String!) {
			v2SignalSubmissions(modelId: $modelId) {
				round {
					number
				}
				diagnostics {
					validationCorrelation
					validationMaxDrawdown
				}
			}
		}
	`;

	const data = await executeGraphQL.call(this, query, { modelId: model.id });
	const submissions = data.v2SignalSubmissions || [];

	// Filter by period
	const periodCount = period === 'all' ? submissions.length : parseInt(period, 10);
	const periodSubmissions = submissions.slice(0, Math.min(periodCount, submissions.length));

	// Get correlations and calculate cumulative
	const correlations = periodSubmissions
		.map((s: Record<string, unknown>) => (s.diagnostics as Record<string, unknown>)?.validationCorrelation)
		.filter((c: unknown) => c !== null && c !== undefined) as number[];

	// Calculate drawdown from cumulative correlations
	let maxDrawdown = 0;
	let peak = 0;
	let cumulative = 0;

	for (const corr of correlations) {
		cumulative += corr;
		if (cumulative > peak) {
			peak = cumulative;
		}
		const drawdown = peak - cumulative;
		if (drawdown > maxDrawdown) {
			maxDrawdown = drawdown;
		}
	}

	// Get diagnostic max drawdown if available
	const diagMaxDrawdown = (submissions[0]?.diagnostics as Record<string, unknown>)?.validationMaxDrawdown;

	return {
		modelName,
		modelId: model.id,
		period: period === 'all' ? 'All Time' : `Last ${period} Rounds`,
		periodsAnalyzed: correlations.length,
		drawdown: {
			diagnosticMaxDrawdown: diagMaxDrawdown || null,
			calculatedMaxDrawdown: maxDrawdown,
			peakCumulativeCorrelation: peak,
			currentCumulativeCorrelation: cumulative,
		},
		riskAssessment: {
			severity: maxDrawdown >= 0.15 ? 'High' :
				maxDrawdown >= 0.10 ? 'Moderate' :
				maxDrawdown >= 0.05 ? 'Low' : 'Minimal',
			recommendation: maxDrawdown >= 0.15
				? 'Consider reducing stake or improving model consistency'
				: 'Drawdown is within acceptable limits',
		},
	};
}
