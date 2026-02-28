/**
 * Tier 2: Unit tests for deal tool handlers (mocked client)
 *
 * Focuses on testing that each handler:
 * - Sets the correct required API parameters (filter[type]=1, budget:false, etc.)
 * - Builds the right JSON:API payload structure
 * - Uses the correct HTTP method and endpoint
 * - Returns the expected response format
 */

import { describe, it, expect, vi } from 'vitest';
import {
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  closeDeal,
  generateBudgetFromDeal,
  copyDeal,
  listDealComments,
  createDealComment,
  listDealActivities,
} from '../../src/tools/deals.js';
import { createMockClient } from '../helpers/mock-client.js';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockDealAttributes(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Deal',
    budget: false,
    date: '2026-03-01',
    end_date: null,
    probability: 50,
    currency: 'USD',
    revenue: '10000.00',
    revenue_default: '10000.00',
    cost: '5000.00',
    cost_default: '5000.00',
    profit: '5000.00',
    profit_default: '5000.00',
    profit_margin: '50.00',
    invoiced: '0.00',
    purchase_order_number: null,
    deal_type_id: 2,
    number: 'D-001',
    closed_at: null,
    last_activity_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockDealResponse(id = '1', attrOverrides: Record<string, unknown> = {}) {
  return {
    data: {
      type: 'deals',
      id,
      attributes: mockDealAttributes(attrOverrides),
      relationships: {
        deal_status: { data: { type: 'deal_statuses', id: '10' } },
        company: { data: { type: 'companies', id: '20' } },
        responsible: { data: { type: 'people', id: '30' } },
        pipeline: { data: { type: 'pipelines', id: '5' } },
      },
    },
    included: [
      { type: 'deal_statuses', id: '10', attributes: { name: 'Proposal' } },
      { type: 'companies', id: '20', attributes: { name: 'Acme Corp' } },
      { type: 'people', id: '30', attributes: { first_name: 'Jane', last_name: 'Doe' } },
      { type: 'pipelines', id: '5', attributes: { name: 'Sales Pipeline' } },
    ],
  };
}

function mockDealListResponse(count = 2) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      type: 'deals',
      id: String(i + 1),
      attributes: mockDealAttributes({ name: `Deal ${i + 1}` }),
      relationships: {},
    })),
    meta: { total_count: count, total_pages: 1 },
  };
}

function mockActivityResponse() {
  return {
    data: [
      {
        type: 'activities',
        id: '100',
        attributes: {
          event: 'update',
          changeset: [{ field: 'deal_status_id', from: '1', to: '2' }],
          item_id: '1',
          item_type: 'Deal',
          item_name: 'Test Deal',
          created_at: '2026-02-01T10:00:00Z',
          deal_id: '1',
          made_by_automation: false,
        },
        relationships: {},
      },
    ],
    meta: { total_count: 1, total_pages: 1 },
  };
}

function mockBudgetResponse(id = '99') {
  return {
    data: {
      type: 'deals',
      id,
      attributes: {
        name: 'Generated Budget',
        budget: true,
        date: '2026-03-01',
        end_date: null,
        currency: 'USD',
        revenue: null,
        cost: null,
        profit: null,
        profit_margin: null,
        invoiced: null,
        deal_type_id: 2,
        number: 'B-001',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      relationships: {},
    },
  };
}

// ─── listDeals ────────────────────────────────────────────────────────────────

describe('listDeals', () => {
  it('always sets filter[type]=1 to ensure only deals are returned (not budgets)', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, { summary: false, limit: 25, offset: 0, response_format: 'markdown' });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['filter[type]']).toBe(1);
  });

  it('calls GET /deals with the correct endpoint', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, { summary: false, limit: 25, offset: 0, response_format: 'markdown' });

    const [endpoint] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(endpoint).toBe('/deals');
  });

  it('does NOT send filter[stage_status] to API (not supported by Productive)', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, {
      stage_status: 'open',
      summary: false,
      limit: 25,
      offset: 0,
      response_format: 'markdown',
    });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['filter[stage_status]']).toBeUndefined();
  });

  it('does not send filter[stage_status] for won (not supported by API)', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, { stage_status: 'won', summary: false, limit: 25, offset: 0, response_format: 'markdown' });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['filter[stage_status]']).toBeUndefined();
  });

  it('does not send filter[stage_status] for lost (not supported by API)', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, { stage_status: 'lost', summary: false, limit: 25, offset: 0, response_format: 'markdown' });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['filter[stage_status]']).toBeUndefined();
  });

  it('applies company_id filter when provided', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, { company_id: '42', summary: false, limit: 25, offset: 0, response_format: 'markdown' });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['filter[company_id]']).toBe('42');
  });

  it('applies responsible_id filter when provided', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, { responsible_id: '7', summary: false, limit: 25, offset: 0, response_format: 'markdown' });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['filter[responsible_id]']).toBe('7');
  });

  it('applies sort with desc prefix when sort_order is desc', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, {
      sort_by: 'name',
      sort_order: 'desc',
      summary: false,
      limit: 25,
      offset: 0,
      response_format: 'markdown',
    });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['sort']).toBe('-name');
  });

  it('applies sort without prefix when sort_order is asc', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    await listDeals(client, {
      sort_by: 'revenue',
      sort_order: 'asc',
      summary: false,
      limit: 25,
      offset: 0,
      response_format: 'markdown',
    });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['sort']).toBe('revenue');
  });

  it('returns markdown string by default', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    const result = await listDeals(client, { summary: false, limit: 25, offset: 0, response_format: 'markdown' });

    expect(typeof result).toBe('string');
  });

  it('returns JSON string when response_format is json', async () => {
    const client = createMockClient({ get: mockDealListResponse() });

    const result = await listDeals(client, { summary: false, limit: 25, offset: 0, response_format: 'json' });

    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ─── listDeals (summary mode) ─────────────────────────────────────────────────

describe('listDeals (summary mode)', () => {
  it('fetches all deals (no stage_status filter) and filters open client-side', async () => {
    const client = createMockClient({
      get: { ...mockDealListResponse(1), meta: { total_count: 1, total_pages: 1 } },
    });

    await listDeals(client, { summary: true, limit: 25, offset: 0, response_format: 'markdown' });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(params['filter[stage_status]']).toBeUndefined(); // filter[stage_status] not supported by API
    expect(params['filter[type]']).toBe(1); // deals only
  });

  it('paginates through all pages when total_pages > 1', async () => {
    const mockPage = (page: number) => ({
      data: [
        {
          type: 'deals',
          id: String(page),
          attributes: mockDealAttributes({ name: `Deal Page ${page}` }),
          relationships: {},
        },
      ],
      meta: { total_count: 2, total_pages: 2 },
    });

    let callCount = 0;
    const client = createMockClient();
    (client.get as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return Promise.resolve(mockPage(callCount));
    });

    await listDeals(client, { summary: true, limit: 25, offset: 0, response_format: 'markdown' });

    expect(client.get).toHaveBeenCalledTimes(2);
  });

  it('groups deals by deal_status_name in the summary', async () => {
    const response = {
      data: [
        {
          type: 'deals',
          id: '1',
          attributes: mockDealAttributes({ name: 'Deal A', revenue: '5000.00', probability: 60 }),
          relationships: { deal_status: { data: { type: 'deal_statuses', id: '10' } } },
        },
        {
          type: 'deals',
          id: '2',
          attributes: mockDealAttributes({ name: 'Deal B', revenue: '3000.00', probability: 80 }),
          relationships: { deal_status: { data: { type: 'deal_statuses', id: '10' } } },
        },
      ],
      included: [{ type: 'deal_statuses', id: '10', attributes: { name: 'Proposal' } }],
      meta: { total_count: 2, total_pages: 1 },
    };

    const client = createMockClient({ get: response });

    const result = await listDeals(client, { summary: true, limit: 25, offset: 0, response_format: 'json' });
    const parsed = JSON.parse(result);

    expect(parsed.total_deals).toBe(2);
    expect(parsed.stages).toHaveLength(1);
    expect(parsed.stages[0].stage_name).toBe('Proposal');
    expect(parsed.stages[0].deal_count).toBe(2);
  });

  it('calculates weighted revenue as sum of revenue * probability/100', async () => {
    const response = {
      data: [
        {
          type: 'deals',
          id: '1',
          // revenue=10000, probability=50 → weighted=5000
          attributes: mockDealAttributes({ revenue: '10000.00', probability: 50 }),
          relationships: {},
        },
      ],
      meta: { total_count: 1, total_pages: 1 },
    };

    const client = createMockClient({ get: response });

    const result = await listDeals(client, { summary: true, limit: 25, offset: 0, response_format: 'json' });
    const parsed = JSON.parse(result);

    expect(parsed.weighted_revenue).toBeCloseTo(5000);
  });
});

// ─── getDeal ──────────────────────────────────────────────────────────────────

describe('getDeal', () => {
  it('calls GET /deals/{id} with the correct endpoint', async () => {
    const client = createMockClient({ get: mockDealResponse('55') });

    await getDeal(client, { deal_id: '55', response_format: 'markdown' });

    const [endpoint] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(endpoint).toBe('/deals/55');
  });

  it('also fetches activities from /activities with filter[deal_id]', async () => {
    const dealClient = createMockClient();
    let callCount = 0;

    (dealClient.get as ReturnType<typeof vi.fn>).mockImplementation((endpoint: string) => {
      callCount++;
      if (endpoint === '/deals/55') return Promise.resolve(mockDealResponse('55'));
      if (endpoint === '/activities') return Promise.resolve(mockActivityResponse());
      return Promise.resolve({ data: [] });
    });

    await getDeal(dealClient, { deal_id: '55', response_format: 'markdown' });

    expect(callCount).toBe(2);
    const activityCall = (dealClient.get as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === '/activities',
    );
    expect(activityCall).toBeDefined();
    const [, activityParams] = activityCall as [string, Record<string, unknown>];
    expect(activityParams['filter[deal_id]']).toBe('55');
  });

  it('returns deal details even if activity fetch fails', async () => {
    const client = createMockClient();

    (client.get as ReturnType<typeof vi.fn>).mockImplementation((endpoint: string) => {
      if (endpoint === '/deals/55') return Promise.resolve(mockDealResponse('55'));
      return Promise.reject(new Error('Activities unavailable'));
    });

    // Should not throw
    const result = await getDeal(client, { deal_id: '55', response_format: 'markdown' });
    expect(typeof result).toBe('string');
  });

  it('returns JSON with deal and activities when response_format is json', async () => {
    const client = createMockClient();

    (client.get as ReturnType<typeof vi.fn>).mockImplementation((endpoint: string) => {
      if (endpoint === '/deals/55') return Promise.resolve(mockDealResponse('55'));
      if (endpoint === '/activities') return Promise.resolve(mockActivityResponse());
      return Promise.resolve({ data: [] });
    });

    const result = await getDeal(client, { deal_id: '55', response_format: 'json' });
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty('deal');
    expect(parsed).toHaveProperty('activities');
    expect(parsed.deal.id).toBe('55');
  });
});

// ─── createDeal ───────────────────────────────────────────────────────────────

describe('createDeal', () => {
  const minArgs = {
    name: 'New Deal',
    date: '2026-03-01',
    deal_status_id: '10',
    response_format: 'markdown' as const,
  };

  it('sets budget:false in attributes to distinguish deals from budgets', async () => {
    const client = createMockClient({ post: mockDealResponse('1') });

    await createDeal(client, minArgs);

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { attributes: Record<string, unknown> } },
    ];
    expect(payload.data.attributes.budget).toBe(false);
  });

  it('sets deal_type_id:2 (client deal) as a fixed internal value', async () => {
    const client = createMockClient({ post: mockDealResponse('1') });

    await createDeal(client, minArgs);

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { attributes: Record<string, unknown> } },
    ];
    expect(payload.data.attributes.deal_type_id).toBe(2);
  });

  it('sets JSON:API type to "deals"', async () => {
    const client = createMockClient({ post: mockDealResponse('1') });

    await createDeal(client, minArgs);

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { type: string } },
    ];
    expect(payload.data.type).toBe('deals');
  });

  it('includes deal_status relationship in the payload', async () => {
    const client = createMockClient({ post: mockDealResponse('1') });

    await createDeal(client, minArgs);

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships: Record<string, unknown> } },
    ];
    expect(payload.data.relationships).toMatchObject({
      deal_status: { data: { type: 'deal_statuses', id: '10' } },
    });
  });

  it('includes company relationship when company_id provided', async () => {
    const client = createMockClient({ post: mockDealResponse('1') });

    await createDeal(client, { ...minArgs, company_id: '42' });

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships: Record<string, unknown> } },
    ];
    expect(payload.data.relationships).toMatchObject({
      company: { data: { type: 'companies', id: '42' } },
    });
  });

  it('includes responsible relationship when responsible_id provided', async () => {
    const client = createMockClient({ post: mockDealResponse('1') });

    await createDeal(client, { ...minArgs, responsible_id: '7' });

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships: Record<string, unknown> } },
    ];
    expect(payload.data.relationships).toMatchObject({
      responsible: { data: { type: 'people', id: '7' } },
    });
  });

  it('calls POST /deals', async () => {
    const client = createMockClient({ post: mockDealResponse('1') });

    await createDeal(client, minArgs);

    const [endpoint] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(endpoint).toBe('/deals');
  });

  it('returns JSON with the new deal ID when response_format is json', async () => {
    const client = createMockClient({ post: mockDealResponse('99') });

    const result = await createDeal(client, { ...minArgs, response_format: 'json' });
    const parsed = JSON.parse(result);

    expect(parsed.id).toBe('99');
  });
});

// ─── updateDeal ───────────────────────────────────────────────────────────────

describe('updateDeal', () => {
  it('calls PATCH /deals/{id}', async () => {
    const client = createMockClient({
      patch: mockDealResponse('5'),
      get: mockDealResponse('5'),
    });

    await updateDeal(client, { deal_id: '5', name: 'Updated', response_format: 'markdown' });

    const [endpoint] = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(endpoint).toBe('/deals/5');
  });

  it('includes deal_status relationship when deal_status_id provided', async () => {
    const client = createMockClient({
      patch: mockDealResponse('5'),
      get: mockDealResponse('5'),
    });

    await updateDeal(client, { deal_id: '5', deal_status_id: '20', response_format: 'markdown' });

    const [, payload] = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships?: Record<string, unknown> } },
    ];
    expect(payload.data.relationships).toMatchObject({
      deal_status: { data: { type: 'deal_statuses', id: '20' } },
    });
  });

  it('omits attributes when no attributes to update', async () => {
    const client = createMockClient({
      patch: mockDealResponse('5'),
      get: mockDealResponse('5'),
    });

    await updateDeal(client, { deal_id: '5', deal_status_id: '20', response_format: 'markdown' });

    const [, payload] = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { attributes?: unknown } },
    ];
    expect(payload.data.attributes).toBeUndefined();
  });

  it('fetches the updated deal after PATCH', async () => {
    const client = createMockClient({
      patch: mockDealResponse('5'),
      get: mockDealResponse('5'),
    });

    await updateDeal(client, { deal_id: '5', name: 'Updated Name', response_format: 'markdown' });

    expect(client.get).toHaveBeenCalledWith('/deals/5', expect.any(Object));
  });
});

// ─── closeDeal ────────────────────────────────────────────────────────────────

describe('closeDeal', () => {
  it('sends deal_status relationship in the PATCH payload', async () => {
    const client = createMockClient({
      patch: mockDealResponse('10'),
      get: mockDealResponse('10'),
    });

    await closeDeal(client, {
      deal_id: '10',
      outcome: 'won',
      deal_status_id: '99',
      response_format: 'markdown',
    });

    const [, payload] = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships: Record<string, unknown> } },
    ];
    expect(payload.data.relationships).toMatchObject({
      deal_status: { data: { type: 'deal_statuses', id: '99' } },
    });
  });

  it('includes lost_reason relationship when lost_reason_id is provided', async () => {
    const client = createMockClient({
      patch: mockDealResponse('10'),
      get: mockDealResponse('10'),
    });

    await closeDeal(client, {
      deal_id: '10',
      outcome: 'lost',
      deal_status_id: '88',
      lost_reason_id: '3',
      response_format: 'markdown',
    });

    const [, payload] = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships: Record<string, unknown> } },
    ];
    expect(payload.data.relationships).toMatchObject({
      lost_reason: { data: { type: 'lost_reasons', id: '3' } },
    });
  });

  it('does not include lost_reason when closing as won', async () => {
    const client = createMockClient({
      patch: mockDealResponse('10'),
      get: mockDealResponse('10'),
    });

    await closeDeal(client, {
      deal_id: '10',
      outcome: 'won',
      deal_status_id: '99',
      response_format: 'markdown',
    });

    const [, payload] = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships: Record<string, unknown> } },
    ];
    expect(payload.data.relationships?.lost_reason).toBeUndefined();
  });
});

// ─── generateBudgetFromDeal ───────────────────────────────────────────────────

describe('generateBudgetFromDeal', () => {
  it('calls POST /deals/{id}/budget', async () => {
    const client = createMockClient({ post: mockBudgetResponse('99') });

    await generateBudgetFromDeal(client, { deal_id: '10', response_format: 'markdown' });

    const [endpoint] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(endpoint).toBe('/deals/10/budget');
  });

  it('returns a string result', async () => {
    const client = createMockClient({ post: mockBudgetResponse('99') });

    const result = await generateBudgetFromDeal(client, { deal_id: '10', response_format: 'markdown' });

    expect(typeof result).toBe('string');
  });
});

// ─── copyDeal ─────────────────────────────────────────────────────────────────

describe('copyDeal', () => {
  it('calls POST /deals/{id}/copy', async () => {
    const client = createMockClient({ post: mockDealResponse('50') });

    await copyDeal(client, { deal_id: '10', response_format: 'markdown' });

    const [endpoint] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(endpoint).toBe('/deals/10/copy');
  });

  it('returns a string result', async () => {
    const client = createMockClient({ post: mockDealResponse('50') });

    const result = await copyDeal(client, { deal_id: '10', response_format: 'markdown' });

    expect(typeof result).toBe('string');
  });
});

// ─── listDealComments ─────────────────────────────────────────────────────────

describe('listDealComments', () => {
  const mockCommentResponse = {
    data: [
      {
        type: 'comments',
        id: '200',
        attributes: {
          body: '<p>Had a call with the CEO.</p>',
          created_at: '2026-02-01T10:00:00Z',
          updated_at: '2026-02-01T10:00:00Z',
          pinned: false,
        },
        relationships: {
          creator: { data: { type: 'people', id: '30' } },
          deal: { data: { type: 'deals', id: '10' } },
        },
      },
    ],
    meta: { total_count: 1 },
    included: [
      { type: 'people', id: '30', attributes: { first_name: 'Jane', last_name: 'Doe' } },
    ],
  };

  // The new 2-step implementation:
  //   Step 1: GET /activities?filter[deal_id]=X&filter[item_type]=comment  → get comment IDs
  //   Step 2: GET /comments?filter[id]=id1,id2,...                         → fetch comments

  const mockActivityLookup = {
    data: [
      {
        type: 'activities',
        id: 'act-1',
        attributes: { item_id: 200, item_type: 'comment' },
      },
    ],
    meta: { total_count: 1 },
  };

  it('calls GET /activities first to discover comment IDs for the deal', async () => {
    const client = createMockClient({ get: mockCommentResponse });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockActivityLookup)
      .mockResolvedValueOnce(mockCommentResponse);

    await listDealComments(client, { deal_id: '10', limit: 25, offset: 0, response_format: 'markdown' });

    const [endpoint, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(endpoint).toBe('/activities');
    expect(params['filter[deal_id]']).toBe('10');
    expect(params['filter[item_type]']).toBe('comment');
  });

  it('calls GET /comments with filter[id] using IDs from activities', async () => {
    const client = createMockClient({ get: mockCommentResponse });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockActivityLookup)
      .mockResolvedValueOnce(mockCommentResponse);

    await listDealComments(client, { deal_id: '10', limit: 25, offset: 0, response_format: 'markdown' });

    const [endpoint, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[1] as [
      string,
      Record<string, unknown>,
    ];
    expect(endpoint).toBe('/comments');
    expect(params['filter[id]']).toBe('200'); // item_id from the activity
  });

  it('returns markdown string by default', async () => {
    const client = createMockClient({ get: mockCommentResponse });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockActivityLookup)
      .mockResolvedValueOnce(mockCommentResponse);

    const result = await listDealComments(client, { deal_id: '10', limit: 25, offset: 0, response_format: 'markdown' });

    expect(typeof result).toBe('string');
  });
});

// ─── createDealComment ────────────────────────────────────────────────────────

describe('createDealComment', () => {
  const mockCreatedComment = {
    data: {
      type: 'comments',
      id: '201',
      attributes: {
        body: '<p>Great call!</p>',
        created_at: '2026-02-01T10:00:00Z',
        updated_at: '2026-02-01T10:00:00Z',
        pinned: false,
      },
      relationships: {
        deal: { data: { type: 'deals', id: '10' } },
      },
    },
  };

  it('uses a "deal" relationship (not "task") in the comment payload', async () => {
    const client = createMockClient({ post: mockCreatedComment });

    await createDealComment(client, { deal_id: '10', body: 'Great call!', response_format: 'markdown' });

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { relationships: Record<string, unknown> } },
    ];
    expect(payload.data.relationships.deal).toMatchObject({
      data: { type: 'deals', id: '10' },
    });
    expect(payload.data.relationships.task).toBeUndefined();
  });

  it('calls POST /comments', async () => {
    const client = createMockClient({ post: mockCreatedComment });

    await createDealComment(client, { deal_id: '10', body: 'Note', response_format: 'markdown' });

    const [endpoint] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(endpoint).toBe('/comments');
  });

  it('converts markdown body to HTML before sending', async () => {
    const client = createMockClient({ post: mockCreatedComment });

    await createDealComment(client, {
      deal_id: '10',
      body: '**Bold note**',
      response_format: 'markdown',
    });

    const [, payload] = (client.post as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { data: { attributes: { body: string } } },
    ];
    // Markdown should be converted to HTML
    expect(payload.data.attributes.body).toContain('<');
  });
});

// ─── listDealActivities ───────────────────────────────────────────────────────

describe('listDealActivities', () => {
  it('calls GET /activities with filter[deal_id]', async () => {
    const client = createMockClient({ get: mockActivityResponse() });

    await listDealActivities(client, { deal_id: '10', limit: 25, offset: 0, response_format: 'markdown' });

    const [endpoint, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(endpoint).toBe('/activities');
    expect(params['filter[deal_id]']).toBe('10');
  });

  it('does NOT send sort param (sort by -created_at not supported by API)', async () => {
    const client = createMockClient({ get: mockActivityResponse() });

    await listDealActivities(client, { deal_id: '10', limit: 25, offset: 0, response_format: 'markdown' });

    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(params['sort']).toBeUndefined();
  });

  it('returns markdown string by default', async () => {
    const client = createMockClient({ get: mockActivityResponse() });

    const result = await listDealActivities(client, { deal_id: '10', limit: 25, offset: 0, response_format: 'markdown' });

    expect(typeof result).toBe('string');
  });

  it('returns JSON with activities array when response_format is json', async () => {
    const client = createMockClient({ get: mockActivityResponse() });

    const result = await listDealActivities(client, {
      deal_id: '10',
      limit: 25,
      offset: 0,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('activities');
    expect(Array.isArray(parsed.activities)).toBe(true);
  });
});
