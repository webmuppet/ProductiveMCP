/**
 * Shared setup for integration tests.
 * Creates a ProductiveClient pointed at the sandbox environment.
 * Throws (causing test skip) if sandbox env vars are not configured.
 */

import { ProductiveClient } from '../../src/client.js';

/**
 * Returns a client configured for the sandbox environment.
 * Call this inside beforeAll() — if it throws, tests are skipped via describe.skipIf.
 */
export function getSandboxClient(): ProductiveClient {
  const token = process.env.PRODUCTIVE_SANDBOX_API_TOKEN;
  const orgId = process.env.PRODUCTIVE_SANDBOX_ORG_ID;
  const baseURL = process.env.PRODUCTIVE_SANDBOX_BASE_URL;

  if (!token || !orgId || !baseURL) {
    throw new Error(
      'Sandbox env vars not configured — skipping integration tests.\n' +
      'Set PRODUCTIVE_SANDBOX_API_TOKEN, PRODUCTIVE_SANDBOX_ORG_ID, and PRODUCTIVE_SANDBOX_BASE_URL.',
    );
  }

  return new ProductiveClient(token, orgId, baseURL);
}

/**
 * True when all three sandbox env vars are present.
 * Use with describe.skipIf(!HAS_SANDBOX) to conditionally skip test suites.
 */
export const HAS_SANDBOX = !!(
  process.env.PRODUCTIVE_SANDBOX_API_TOKEN &&
  process.env.PRODUCTIVE_SANDBOX_ORG_ID &&
  process.env.PRODUCTIVE_SANDBOX_BASE_URL
);

/**
 * Sandbox project ID for integration tests.
 * Must be set to a real project in the sandbox org.
 */
export const SANDBOX_PROJECT_ID = process.env.PRODUCTIVE_SANDBOX_PROJECT_ID ?? '';
