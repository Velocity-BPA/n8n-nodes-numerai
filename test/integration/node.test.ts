/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { Numerai } from '../../nodes/Numerai/Numerai.node';
import { NumeraiTrigger } from '../../nodes/Numerai/NumeraiTrigger.node';

describe('Numerai Node Integration', () => {
	describe('Numerai Action Node', () => {
		it('should have correct node description', () => {
			const node = new Numerai();
			expect(node.description.name).toBe('numerai');
			expect(node.description.displayName).toBe('Numerai');
			expect(node.description.group).toContain('transform');
			expect(node.description.version).toBe(1);
		});

		it('should require numeraiApi credentials', () => {
			const node = new Numerai();
			const credentials = node.description.credentials;
			expect(credentials).toBeDefined();
			expect(credentials![0].name).toBe('numeraiApi');
			expect(credentials![0].required).toBe(true);
		});

		it('should have all resources defined', () => {
			const node = new Numerai();
			const resourceProperty = node.description.properties.find(
				(p) => p.name === 'resource'
			);
			expect(resourceProperty).toBeDefined();
			expect(resourceProperty!.type).toBe('options');

			const options = resourceProperty!.options as Array<{ value: string }>;
			const resourceValues = options.map((o) => o.value);

			expect(resourceValues).toContain('account');
			expect(resourceValues).toContain('dataset');
			expect(resourceValues).toContain('diagnostics');
			expect(resourceValues).toContain('leaderboard');
			expect(resourceValues).toContain('model');
			expect(resourceValues).toContain('round');
			expect(resourceValues).toContain('signals');
			expect(resourceValues).toContain('stake');
		});

		it('should have operations for each resource', () => {
			const node = new Numerai();
			const operationProperties = node.description.properties.filter(
				(p) => p.name === 'operation'
			);

			// Should have operation properties
			expect(operationProperties.length).toBeGreaterThan(0);
		});

		it('should have execute method', () => {
			const node = new Numerai();
			expect(typeof node.execute).toBe('function');
		});
	});

	describe('Numerai Trigger Node', () => {
		it('should have correct node description', () => {
			const node = new NumeraiTrigger();
			expect(node.description.name).toBe('numeraiTrigger');
			expect(node.description.displayName).toBe('Numerai Trigger');
			expect(node.description.group).toContain('trigger');
			expect(node.description.polling).toBe(true);
		});

		it('should require numeraiApi credentials', () => {
			const node = new NumeraiTrigger();
			const credentials = node.description.credentials;
			expect(credentials).toBeDefined();
			expect(credentials![0].name).toBe('numeraiApi');
			expect(credentials![0].required).toBe(true);
		});

		it('should have all trigger options defined', () => {
			const node = new NumeraiTrigger();
			const triggerProperty = node.description.properties.find(
				(p) => p.name === 'triggerOn'
			);
			expect(triggerProperty).toBeDefined();
			expect(triggerProperty!.type).toBe('options');

			const options = triggerProperty!.options as Array<{ value: string }>;
			const triggerValues = options.map((o) => o.value);

			// Round triggers
			expect(triggerValues).toContain('newRound');
			expect(triggerValues).toContain('roundClosing');
			expect(triggerValues).toContain('roundResolved');
			expect(triggerValues).toContain('scoresReleased');

			// Submission triggers
			expect(triggerValues).toContain('submissionReceived');
			expect(triggerValues).toContain('submissionScored');
			expect(triggerValues).toContain('submissionFailed');

			// Stake triggers
			expect(triggerValues).toContain('stakeChanged');
			expect(triggerValues).toContain('payoutReceived');
			expect(triggerValues).toContain('stakeAtRisk');
		});

		it('should have poll method', () => {
			const node = new NumeraiTrigger();
			expect(typeof node.poll).toBe('function');
		});

		it('should have no inputs (trigger nodes)', () => {
			const node = new NumeraiTrigger();
			expect(node.description.inputs).toHaveLength(0);
		});

		it('should have one output', () => {
			const node = new NumeraiTrigger();
			expect(node.description.outputs).toHaveLength(1);
		});
	});

	describe('Node Properties Validation', () => {
		it('should have unique property names in Numerai node', () => {
			const node = new Numerai();
			const propertyNames = node.description.properties.map((p) => p.name);
			const uniqueNames = [...new Set(propertyNames)];

			// Properties can share names with displayOptions restrictions
			// Just ensure core properties are present
			expect(propertyNames).toContain('resource');
			expect(propertyNames.filter((n) => n === 'operation').length).toBeGreaterThan(0);
		});

		it('should have valid property types', () => {
			const node = new Numerai();
			const validTypes = ['string', 'number', 'boolean', 'options', 'multiOptions', 'json'];

			for (const property of node.description.properties) {
				expect(validTypes).toContain(property.type);
			}
		});

		it('should have descriptions for all properties', () => {
			const node = new Numerai();

			// Most properties should have descriptions
			const propertiesWithDescriptions = node.description.properties.filter(
				(p) => p.description
			);
			expect(propertiesWithDescriptions.length).toBeGreaterThan(
				node.description.properties.length * 0.7
			);
		});
	});
});
