/**
 * Tier 3: Integration tests for budget tools against the Productive sandbox.
 *
 * These tests are skipped automatically when sandbox env vars are not set.
 * To run: set env vars (see .env.example), then: npm run test:integration
 *
 * The test creates a budget, verifies it appears in listBudgets, then
 * cleans up in afterAll by closing it.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HAS_SANDBOX, getSandboxClient, SANDBOX_PROJECT_ID } from './setup.js';
import { createBudget, listBudgets, getBudget, closeBudget } from '../../src/tools/budgets.js';
import type { ProductiveClient } from '../../src/client.js';

// Sandbox requires currency, company, and responsible on budget creation (same as deals)
const SANDBOX_COMPANY_ID = process.env.PRODUCTIVE_SANDBOX_COMPANY_ID ?? '';
const SANDBOX_PERSON_ID = process.env.PRODUCTIVE_SANDBOX_PERSON_ID ?? '';
const HAS_BUDGET_SANDBOX = HAS_SANDBOX && !!SANDBOX_COMPANY_ID && !!SANDBOX_PERSON_ID;

describe.skipIf(!HAS_BUDGET_SANDBOX)('Budgets Integration (sandbox)', () => {
  let client: ProductiveClient;
  let createdBudgetId: string | null = null;

  beforeAll(() => {
    client = getSandboxClient();
  });

  afterAll(async () => {
    // Best-effort cleanup: close the budget so it doesn't clutter the sandbox
    if (createdBudgetId && client) {
      try {
        await closeBudget(client, {
          budget_id: createdBudgetId,
          response_format: 'json',
        });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // ─── Create ──────────────────────────────────────────────────────────────

  it('creates a budget and returns a valid budget object', async () => {
    // Sandbox requires currency, company, and responsible (same as deals)
    const result = await createBudget(client, {
      name: '[Integration Test] Vitest Budget',
      date: '2026-01-01',
      currency: 'USD',
      company_id: SANDBOX_COMPANY_ID,
      responsible_id: SANDBOX_PERSON_ID,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBeTruthy();
    expect(parsed.name).toBe('[Integration Test] Vitest Budget');
    expect(parsed.status).toBe('open');
    expect(parsed.start_date).toBe('2026-01-01');

    createdBudgetId = parsed.id;
  });

  // ─── Read ─────────────────────────────────────────────────────────────────

  it('retrieves the created budget by ID', async () => {
    if (!createdBudgetId) return;

    const result = await getBudget(client, {
      budget_id: createdBudgetId,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBe(createdBudgetId);
    expect(parsed.name).toBe('[Integration Test] Vitest Budget');
  });

  it('lists budgets and includes the created budget', async () => {
    if (!createdBudgetId) return;

    const result = await listBudgets(client, {
      limit: 50,
      offset: 0,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    const items = Array.isArray(parsed) ? parsed : parsed.items ?? [];
    const found = items.find((b: { id: string }) => b.id === createdBudgetId);
    expect(found).toBeTruthy();
  });

  // ─── Create with company + responsible ────────────────────────────────────
  // NOTE: Linking a project at creation time is not supported by the sandbox
  // (a project can only have one active budget; MCP Testing Project already has one).
  // The project relationship payload structure is verified in unit tests.

  it('creates a budget with company and responsible and returns them in the response', async () => {
    const result = await createBudget(client, {
      name: '[Integration Test] Vitest Budget (Full)',
      date: '2026-01-01',
      currency: 'USD',
      company_id: SANDBOX_COMPANY_ID,
      responsible_id: SANDBOX_PERSON_ID,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBeTruthy();
    expect(parsed.company_id).toBe(SANDBOX_COMPANY_ID);
    expect(parsed.responsible_id).toBe(SANDBOX_PERSON_ID);
    expect(parsed.currency).toBe('USD');

    // Clean up
    if (parsed.id && client) {
      try {
        await closeBudget(client, { budget_id: parsed.id, response_format: 'json' });
      } catch { /* ignore */ }
    }
  });
});
