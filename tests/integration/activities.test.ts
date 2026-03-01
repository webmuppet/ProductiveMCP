/**
 * Tier 3: Integration tests for activity tools against the Productive sandbox.
 *
 * These tests are skipped automatically when sandbox env vars are not set.
 * To run: set the following env vars, then: npm run test:integration
 *
 *   PRODUCTIVE_SANDBOX_API_TOKEN   — API token for the sandbox org
 *   PRODUCTIVE_SANDBOX_ORG_ID      — Organisation ID for the sandbox org
 *   PRODUCTIVE_SANDBOX_BASE_URL    — Base URL (e.g. https://api.productive.io)
 *
 * Optional vars for richer coverage:
 *   PRODUCTIVE_SANDBOX_TASK_ID     — A valid task ID in the sandbox
 *   PRODUCTIVE_SANDBOX_PROJECT_ID  — A valid project ID in the sandbox
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { HAS_SANDBOX, getSandboxClient } from './setup.js';
import {
  listActivities,
  listTaskActivities,
  listProjectActivities,
} from '../../src/tools/activities.js';
import type { ProductiveClient } from '../../src/client.js';

const SANDBOX_TASK_ID = process.env.PRODUCTIVE_SANDBOX_TASK_ID ?? '';
const SANDBOX_PROJECT_ID = process.env.PRODUCTIVE_SANDBOX_PROJECT_ID ?? '';

describe.skipIf(!HAS_SANDBOX)('Activities Integration (sandbox)', () => {
  let client: ProductiveClient;

  beforeAll(() => {
    client = getSandboxClient();
  });

  it('listActivities returns a string response', async () => {
    const result = await listActivities(client, {
      limit: 5,
      offset: 0,
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('listActivities with json format returns parseable JSON', async () => {
    const result = await listActivities(client, {
      limit: 5,
      offset: 0,
      response_format: 'json',
    });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it.skipIf(!SANDBOX_TASK_ID)('listTaskActivities returns results for task', async () => {
    const result = await listTaskActivities(client, {
      task_id: SANDBOX_TASK_ID,
      limit: 5,
      offset: 0,
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
  });

  it.skipIf(!SANDBOX_PROJECT_ID)('listProjectActivities returns results for project', async () => {
    const result = await listProjectActivities(client, {
      project_id: SANDBOX_PROJECT_ID,
      limit: 5,
      offset: 0,
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
  });
});
