/**
 * Tier 3: Integration tests for page tools against the Productive sandbox.
 *
 * These tests are skipped automatically when sandbox env vars are not set.
 * To run: set PRODUCTIVE_SANDBOX_API_TOKEN, PRODUCTIVE_SANDBOX_ORG_ID,
 * PRODUCTIVE_SANDBOX_BASE_URL, and PRODUCTIVE_SANDBOX_PROJECT_ID, then:
 *   npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HAS_SANDBOX, getSandboxClient, SANDBOX_PROJECT_ID } from './setup.js';
import { createPage, getPage, deletePage, updatePage } from '../../src/tools/pages.js';
import type { ProductiveClient } from '../../src/client.js';

describe.skipIf(!HAS_SANDBOX)('Pages Integration (sandbox)', () => {
  let client: ProductiveClient;
  let createdPageId: string | null = null;

  beforeAll(() => {
    client = getSandboxClient();
  });

  afterAll(async () => {
    // Always clean up — delete the page created during the test run
    if (createdPageId && client) {
      try {
        await deletePage(client, { page_id: createdPageId });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('creates a top-level page and returns success message', async () => {
    const result = await createPage(client, {
      title: '[Integration Test] Vitest Page',
      body: '# Integration Test\n\nThis page was created by the automated test suite and should be deleted automatically.',
      project_id: SANDBOX_PROJECT_ID || undefined,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('id');
    expect(parsed.title).toBe('[Integration Test] Vitest Page');

    createdPageId = parsed.id;
  });

  it('retrieves the created page by ID', async () => {
    if (!createdPageId) return; // depends on create test

    const result = await getPage(client, {
      page_id: createdPageId,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBe(createdPageId);
    expect(parsed.title).toBe('[Integration Test] Vitest Page');
  });

  it('updates the created page title', async () => {
    if (!createdPageId) return;

    const result = await updatePage(client, {
      page_id: createdPageId,
      title: '[Integration Test] Vitest Page (Updated)',
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.title).toBe('[Integration Test] Vitest Page (Updated)');
  });

  it('deletes the created page', async () => {
    if (!createdPageId) return;

    const result = await deletePage(client, { page_id: createdPageId });
    expect(result).toContain(createdPageId);
    expect(result).toContain('deleted successfully');

    // Mark as deleted so afterAll cleanup doesn't try again
    createdPageId = null;
  });
});
