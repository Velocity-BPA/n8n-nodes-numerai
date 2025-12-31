/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

// Jest setup file
// Add any global test setup here

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
