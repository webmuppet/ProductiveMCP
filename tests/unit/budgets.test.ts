/**
 * Tier 2: Unit tests for budget tool handlers (mocked client).
 *
 * Focuses on:
 * - Correct payload shape (budget:true, deal_type_id:2, no deal_status)
 * - Relationships built only when IDs provided
 * - Optional attributes omitted when not provided
 * - Response formatted via formatBudget / formatSingleBudgetMarkdown
 */

import { describe, it, expect, vi } from 'vitest';
import { createBudget } from '../../src/tools/budgets.js';
import { createMockClient } from '../helpers/mock-client.js';

// ─── Mock helpers ──────────────────────────────────────────────────────────────

function mockBudgetAttributes(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Budget',
    budget: true,
    budget_status: 1,
    date: '2026-04-01',
    end_date: null,
    delivered_on: null,
    total: null,
    currency: 'USD',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockBudgetResponse(id = '99', attrOverrides: Record<string, unknown> = {}) {
  return {
    data: {
      type: 'deals',
      id,
      attributes: mockBudgetAttributes(attrOverrides),
      relationships: {
        project: { data: { type: 'projects', id: '760385' } },
        company: { data: { type: 'companies', id: '1153449' } },
        responsible: { data: { type: 'people', id: '1065388' } },
      },
    },
    included: [
      { type: 'projects', id: '760385', attributes: { name: 'Test Project' } },
      { type: 'companies', id: '1153449', attributes: { name: 'Acme Corp' } },
      { type: 'people', id: '1065388', attributes: { first_name: 'Jane', last_name: 'Doe' } },
    ],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('createBudget', () => {
  it('POSTs to /deals with budget:true and deal_type_id:2', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Q2 Retainer',
      date: '2026-04-01',
      response_format: 'json',
    });

    const postCall = (client.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(postCall[0]).toBe('/deals');

    const payload = postCall[1] as { data: { attributes: Record<string, unknown>; relationships?: unknown } };
    expect(payload.data.attributes.budget).toBe(true);
    expect(payload.data.attributes.deal_type_id).toBe(2);
    expect(payload.data.attributes.name).toBe('Q2 Retainer');
    expect(payload.data.attributes.date).toBe('2026-04-01');
  });

  it('does NOT include a deal_status relationship', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Budget No Status',
      date: '2026-01-01',
      response_format: 'json',
    });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { relationships?: Record<string, unknown> };
    };
    expect(payload.data.relationships?.deal_status).toBeUndefined();
  });

  it('omits relationships block when no IDs provided', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Bare Budget',
      date: '2026-01-01',
      response_format: 'json',
    });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { relationships?: unknown };
    };
    expect(payload.data.relationships).toBeUndefined();
  });

  it('includes project relationship when project_id provided', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Project Budget',
      date: '2026-01-01',
      project_id: '760385',
      response_format: 'json',
    });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { relationships: { project: { data: { type: string; id: string } } } };
    };
    expect(payload.data.relationships.project).toEqual({
      data: { type: 'projects', id: '760385' },
    });
  });

  it('includes company and responsible relationships when provided', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Full Rels Budget',
      date: '2026-01-01',
      company_id: '1153449',
      responsible_id: '1065388',
      response_format: 'json',
    });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: {
        relationships: {
          company: { data: { type: string; id: string } };
          responsible: { data: { type: string; id: string } };
        };
      };
    };
    expect(payload.data.relationships.company).toEqual({
      data: { type: 'companies', id: '1153449' },
    });
    expect(payload.data.relationships.responsible).toEqual({
      data: { type: 'people', id: '1065388' },
    });
  });

  it('includes optional attributes when provided', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Budget With Extras',
      date: '2026-01-01',
      end_date: '2026-12-31',
      currency: 'EUR',
      purchase_order_number: 'PO-999',
      response_format: 'json',
    });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { attributes: Record<string, unknown> };
    };
    expect(payload.data.attributes.end_date).toBe('2026-12-31');
    expect(payload.data.attributes.currency).toBe('EUR');
    expect(payload.data.attributes.purchase_order_number).toBe('PO-999');
  });

  it('omits optional attributes when not provided', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Minimal Budget',
      date: '2026-01-01',
      response_format: 'json',
    });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { attributes: Record<string, unknown> };
    };
    expect(payload.data.attributes.end_date).toBeUndefined();
    expect(payload.data.attributes.currency).toBeUndefined();
    expect(payload.data.attributes.purchase_order_number).toBeUndefined();
  });

  it('passes include=project,company,responsible as query param', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    await createBudget(client, {
      name: 'Include Test',
      date: '2026-01-01',
      response_format: 'markdown',
    });

    const postCall = (client.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(postCall[2]).toEqual({ include: 'project,company,responsible' });
  });

  it('returns markdown string by default', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    const result = await createBudget(client, {
      name: 'Markdown Budget',
      date: '2026-01-01',
      response_format: 'markdown',
    });

    expect(typeof result).toBe('string');
    expect(result).toContain('Budget created successfully');
    expect(result).toContain('Test Budget');
  });

  it('returns JSON string when response_format is json', async () => {
    const client = createMockClient({ post: mockBudgetResponse() });

    const result = await createBudget(client, {
      name: 'JSON Budget',
      date: '2026-01-01',
      response_format: 'json',
    });

    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('Test Budget');
  });
});
