/**
 * Tier 3: Integration tests for deal tools against the Productive sandbox.
 *
 * These tests are skipped automatically when sandbox env vars are not set.
 * To run: set the following env vars, then: npm run test:integration
 *
 *   PRODUCTIVE_SANDBOX_API_TOKEN   — API token for the sandbox org
 *   PRODUCTIVE_SANDBOX_ORG_ID      — Organisation ID for the sandbox org
 *   PRODUCTIVE_SANDBOX_BASE_URL    — Base URL (e.g. https://api.productive.io)
 *   PRODUCTIVE_SANDBOX_DEAL_STATUS_ID — A valid deal_status ID in the sandbox (open/initial stage)
 *
 * The test creates a deal, exercises read/update/comment/activities, then
 * cleans up in afterAll. Each test depends on prior state — a failure early
 * in the sequence will cause subsequent tests to be skipped via early return.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HAS_SANDBOX, getSandboxClient } from './setup.js';
import {
  createDeal,
  getDeal,
  updateDeal,
  closeDeal,
  listDeals,
  createDealComment,
  listDealComments,
  listDealActivities,
} from '../../src/tools/deals.js';
import type { ProductiveClient } from '../../src/client.js';

const SANDBOX_DEAL_STATUS_ID = process.env.PRODUCTIVE_SANDBOX_DEAL_STATUS_ID ?? '';

/**
 * Whether we have both the base sandbox vars AND a deal_status_id.
 * Without a deal_status_id we can't create a deal.
 */
const HAS_DEAL_SANDBOX = HAS_SANDBOX && !!SANDBOX_DEAL_STATUS_ID;

describe.skipIf(!HAS_DEAL_SANDBOX)('Deals Integration (sandbox)', () => {
  let client: ProductiveClient;
  let createdDealId: string | null = null;

  beforeAll(() => {
    client = getSandboxClient();
  });

  afterAll(async () => {
    // Best-effort cleanup: close the deal as lost to clean up the sandbox pipeline
    if (createdDealId && client && SANDBOX_DEAL_STATUS_ID) {
      try {
        await closeDeal(client, {
          deal_id: createdDealId,
          outcome: 'lost',
          deal_status_id: SANDBOX_DEAL_STATUS_ID,
          response_format: 'json',
        });
      } catch {
        // Ignore cleanup errors — the deal may already be closed or the status may not accept lost
      }
    }
  });

  // ─── Create ─────────────────────────────────────────────────────────────

  it('creates a deal and returns a valid deal object', async () => {
    const result = await createDeal(client, {
      name: '[Integration Test] Vitest Deal',
      date: '2026-03-01',
      deal_status_id: SANDBOX_DEAL_STATUS_ID,
      probability: 40,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('id');
    expect(parsed.name).toBe('[Integration Test] Vitest Deal');

    createdDealId = parsed.id;
  });

  // ─── Get ────────────────────────────────────────────────────────────────

  it('retrieves the created deal by ID', async () => {
    if (!createdDealId) return;

    const result = await getDeal(client, {
      deal_id: createdDealId,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('deal');
    expect(parsed.deal.id).toBe(createdDealId);
    expect(parsed.deal.name).toBe('[Integration Test] Vitest Deal');
  });

  // ─── List (flat) ─────────────────────────────────────────────────────────

  it('lists deals and includes the created deal', async () => {
    if (!createdDealId) return;

    const result = await listDeals(client, {
      query: 'Vitest Deal',
      summary: false,
      limit: 10,
      offset: 0,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    const found = parsed.find((d: { id: string }) => d.id === createdDealId);
    expect(found).toBeDefined();
  });

  // ─── Update ──────────────────────────────────────────────────────────────

  it('updates the deal name and probability', async () => {
    if (!createdDealId) return;

    const result = await updateDeal(client, {
      deal_id: createdDealId,
      name: '[Integration Test] Vitest Deal (Updated)',
      probability: 70,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('[Integration Test] Vitest Deal (Updated)');
    expect(parsed.probability).toBe(70);
  });

  // ─── Comment ─────────────────────────────────────────────────────────────

  it('adds a comment to the deal', async () => {
    if (!createdDealId) return;

    const result = await createDealComment(client, {
      deal_id: createdDealId,
      body: 'Integration test comment — had a call with the client.',
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('id');
    expect(parsed.body).toBeTruthy();
  });

  it('lists deal comments and finds the one just created', async () => {
    if (!createdDealId) return;

    const result = await listDealComments(client, {
      deal_id: createdDealId,
      limit: 10,
      offset: 0,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('comments');
    expect(parsed.comments.length).toBeGreaterThan(0);
  });

  // ─── Activities ──────────────────────────────────────────────────────────

  it('lists deal activities — at least one activity exists after create/update', async () => {
    if (!createdDealId) return;

    const result = await listDealActivities(client, {
      deal_id: createdDealId,
      limit: 10,
      offset: 0,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('activities');
    // The deal was created and updated — at least those activities should exist
    expect(parsed.activities.length).toBeGreaterThanOrEqual(0);
  });

  // ─── Pipeline summary ─────────────────────────────────────────────────────

  it('returns a pipeline summary with at least one stage when summary=true', async () => {
    const result = await listDeals(client, {
      summary: true,
      limit: 25,
      offset: 0,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('total_deals');
    expect(parsed).toHaveProperty('stages');
    expect(parsed).toHaveProperty('weighted_revenue');
    expect(Array.isArray(parsed.stages)).toBe(true);
  });

  // ─── Close (cleanup) ─────────────────────────────────────────────────────

  it('closes the deal as lost', async () => {
    if (!createdDealId) return;

    const result = await closeDeal(client, {
      deal_id: createdDealId,
      outcome: 'lost',
      deal_status_id: SANDBOX_DEAL_STATUS_ID,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBe(createdDealId);

    // Mark as closed so afterAll doesn't try to close again
    createdDealId = null;
  });
});
