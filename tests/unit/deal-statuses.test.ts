/**
 * Tier 2: Unit tests for deal status and pipeline tool handlers (mocked client)
 *
 * Verifies:
 * - Correct endpoint paths and query parameters
 * - include=pipeline always sent (for relationship resolution)
 * - filter[pipeline_id] only sent when provided
 * - Pipeline type filtering via filter[pipeline_type_id]
 * - getPipeline fetches statuses in a second call by default
 * - getPipeline skips status fetch when include_statuses=false
 */

import { describe, it, expect, vi } from 'vitest';
import { listDealStatuses, getDealStatus } from '../../src/tools/deal-statuses.js';
import { listPipelines, getPipeline } from '../../src/tools/pipelines.js';
import { createMockClient } from '../helpers/mock-client.js';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockDealStatusAttributes(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Prospecting',
    position: 1,
    color_id: null,
    status_id: 1, // open
    probability: 20,
    probability_enabled: true,
    time_tracking_enabled: false,
    expense_tracking_enabled: false,
    booking_tracking_enabled: false,
    lost_reason_enabled: false,
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockDealStatusResponse(id = '10', pipelineId = '1') {
  return {
    data: {
      type: 'deal_statuses',
      id,
      attributes: mockDealStatusAttributes(),
      relationships: {
        pipeline: { data: { type: 'pipelines', id: pipelineId } },
      },
    },
    included: [
      {
        type: 'pipelines',
        id: pipelineId,
        attributes: { name: 'Sales Pipeline', position: 1, pipeline_type_id: 1 },
        relationships: {},
      },
    ],
  };
}

function mockPipelineAttributes(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Sales Pipeline',
    position: 1,
    pipeline_type_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockPipelineResponse(id = '1') {
  return {
    data: {
      type: 'pipelines',
      id,
      attributes: mockPipelineAttributes(),
      relationships: {},
    },
  };
}

// ─── listDealStatuses ─────────────────────────────────────────────────────────

describe('listDealStatuses', () => {
  it('calls GET /deal_statuses with include=pipeline', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listDealStatuses(client, {
      limit: 30,
      offset: 0,
      response_format: 'markdown',
    });

    expect(client.get).toHaveBeenCalledWith('/deal_statuses', expect.objectContaining({
      include: 'pipeline',
    }));
  });

  it('does NOT send filter[pipeline_id] when pipeline_id is omitted', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listDealStatuses(client, {
      limit: 30,
      offset: 0,
      response_format: 'markdown',
    });

    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[pipeline_id]']).toBeUndefined();
  });

  it('sends filter[pipeline_id] when provided', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listDealStatuses(client, {
      pipeline_id: '7',
      limit: 30,
      offset: 0,
      response_format: 'markdown',
    });

    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[pipeline_id]']).toBe('7');
  });

  it('sends correct pagination params', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listDealStatuses(client, {
      limit: 20,
      offset: 40,
      response_format: 'markdown',
    });

    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['page[size]']).toBe(20);
    expect(params['page[number]']).toBe(3);
  });

  it('returns markdown by default', async () => {
    const client = createMockClient({
      get: { data: [mockDealStatusResponse('10').data], meta: { total_count: 1 } },
    });
    const result = await listDealStatuses(client, {
      limit: 30,
      offset: 0,
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns valid JSON when response_format=json', async () => {
    const client = createMockClient({
      get: { data: [mockDealStatusResponse('10').data], meta: { total_count: 1 } },
    });
    const result = await listDealStatuses(client, {
      limit: 30,
      offset: 0,
      response_format: 'json',
    });
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ─── getDealStatus ────────────────────────────────────────────────────────────

describe('getDealStatus', () => {
  it('calls GET /deal_statuses/:id with include=pipeline', async () => {
    const client = createMockClient({ get: mockDealStatusResponse('10') });
    await getDealStatus(client, {
      deal_status_id: '10',
      response_format: 'markdown',
    });

    expect(client.get).toHaveBeenCalledWith('/deal_statuses/10', {
      include: 'pipeline',
    });
  });

  it('returns markdown output', async () => {
    const client = createMockClient({ get: mockDealStatusResponse('10') });
    const result = await getDealStatus(client, {
      deal_status_id: '10',
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('Prospecting');
  });

  it('returns valid JSON when response_format=json', async () => {
    const client = createMockClient({ get: mockDealStatusResponse('10') });
    const result = await getDealStatus(client, {
      deal_status_id: '10',
      response_format: 'json',
    });
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe('10');
  });

  it('resolves pipeline name from included', async () => {
    const client = createMockClient({ get: mockDealStatusResponse('10', '3') });
    const result = await getDealStatus(client, {
      deal_status_id: '10',
      response_format: 'json',
    });
    const parsed = JSON.parse(result);
    expect(parsed.pipeline_id).toBe('3');
    expect(parsed.pipeline_name).toBe('Sales Pipeline');
  });

  it('maps status_id=1 to stage_type=open', async () => {
    const client = createMockClient({ get: mockDealStatusResponse('10') });
    const result = await getDealStatus(client, {
      deal_status_id: '10',
      response_format: 'json',
    });
    const parsed = JSON.parse(result);
    expect(parsed.stage_type).toBe('open');
  });

  it('maps status_id=2 to stage_type=won', async () => {
    const resp = mockDealStatusResponse('11');
    (resp.data.attributes as Record<string, unknown>).status_id = 2;
    const client = createMockClient({ get: resp });
    const result = await getDealStatus(client, {
      deal_status_id: '11',
      response_format: 'json',
    });
    const parsed = JSON.parse(result);
    expect(parsed.stage_type).toBe('won');
  });

  it('maps status_id=3 to stage_type=lost', async () => {
    const resp = mockDealStatusResponse('12');
    (resp.data.attributes as Record<string, unknown>).status_id = 3;
    const client = createMockClient({ get: resp });
    const result = await getDealStatus(client, {
      deal_status_id: '12',
      response_format: 'json',
    });
    const parsed = JSON.parse(result);
    expect(parsed.stage_type).toBe('lost');
  });
});

// ─── listPipelines ────────────────────────────────────────────────────────────

describe('listPipelines', () => {
  it('calls GET /pipelines', async () => {
    const client = createMockClient({ get: { data: [] } });
    await listPipelines(client, { response_format: 'markdown' });
    expect(client.get).toHaveBeenCalledWith('/pipelines', expect.any(Object));
  });

  it('does NOT send filter[pipeline_type_id] when pipeline_type is omitted', async () => {
    const client = createMockClient({ get: { data: [] } });
    await listPipelines(client, { response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[pipeline_type_id]']).toBeUndefined();
  });

  it('sends filter[pipeline_type_id]=1 for sales', async () => {
    const client = createMockClient({ get: { data: [] } });
    await listPipelines(client, { pipeline_type: 'sales', response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[pipeline_type_id]']).toBe(1);
  });

  it('sends filter[pipeline_type_id]=2 for production', async () => {
    const client = createMockClient({ get: { data: [] } });
    await listPipelines(client, { pipeline_type: 'production', response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[pipeline_type_id]']).toBe(2);
  });

  it('returns markdown output', async () => {
    const client = createMockClient({
      get: { data: [mockPipelineResponse('1').data] },
    });
    const result = await listPipelines(client, { response_format: 'markdown' });
    expect(typeof result).toBe('string');
  });

  it('returns valid JSON when response_format=json', async () => {
    const client = createMockClient({
      get: { data: [mockPipelineResponse('1').data] },
    });
    const result = await listPipelines(client, { response_format: 'json' });
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ─── getPipeline ──────────────────────────────────────────────────────────────

describe('getPipeline', () => {
  it('calls GET /pipelines/:id', async () => {
    const client = createMockClient({ get: mockPipelineResponse('5') });
    await getPipeline(client, { pipeline_id: '5', response_format: 'markdown' });
    expect(client.get).toHaveBeenCalledWith('/pipelines/5');
  });

  it('makes a second call to GET /deal_statuses by default', async () => {
    const client = createMockClient({ get: mockPipelineResponse('5') });
    // Override to return pipeline for first call, statuses for second
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPipelineResponse('5'))
      .mockResolvedValueOnce({ data: [], meta: { total_count: 0 } });

    await getPipeline(client, { pipeline_id: '5', response_format: 'markdown' });

    expect(client.get).toHaveBeenCalledTimes(2);
    const secondCall = (client.get as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(secondCall[0]).toBe('/deal_statuses');
    expect(secondCall[1]).toMatchObject({ 'filter[pipeline_id]': '5' });
  });

  it('does NOT call /deal_statuses when include_statuses=false', async () => {
    const client = createMockClient({ get: mockPipelineResponse('5') });
    await getPipeline(client, {
      pipeline_id: '5',
      include_statuses: false,
      response_format: 'markdown',
    });

    expect(client.get).toHaveBeenCalledTimes(1);
  });

  it('returns markdown output', async () => {
    const client = createMockClient({ get: mockPipelineResponse('5') });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPipelineResponse('5'))
      .mockResolvedValueOnce({ data: [], meta: { total_count: 0 } });

    const result = await getPipeline(client, {
      pipeline_id: '5',
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('Sales Pipeline');
  });

  it('returns valid JSON when response_format=json', async () => {
    const client = createMockClient({ get: mockPipelineResponse('5') });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPipelineResponse('5'))
      .mockResolvedValueOnce({ data: [], meta: { total_count: 0 } });

    const result = await getPipeline(client, {
      pipeline_id: '5',
      response_format: 'json',
    });
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe('5');
  });

  it('maps pipeline_type_id=1 to pipeline_type=sales', async () => {
    const client = createMockClient({ get: mockPipelineResponse('5') });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPipelineResponse('5'))
      .mockResolvedValueOnce({ data: [] });

    const result = await getPipeline(client, {
      pipeline_id: '5',
      response_format: 'json',
    });
    const parsed = JSON.parse(result);
    expect(parsed.pipeline_type).toBe('sales');
  });

  it('maps pipeline_type_id=2 to pipeline_type=production', async () => {
    const prodPipeline = mockPipelineResponse('6');
    (prodPipeline.data.attributes as Record<string, unknown>).pipeline_type_id = 2;
    const client = createMockClient({ get: prodPipeline });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(prodPipeline)
      .mockResolvedValueOnce({ data: [] });

    const result = await getPipeline(client, {
      pipeline_id: '6',
      response_format: 'json',
    });
    const parsed = JSON.parse(result);
    expect(parsed.pipeline_type).toBe('production');
  });

  it('includes statuses array in response when statuses are returned', async () => {
    const client = createMockClient({ get: mockPipelineResponse('5') });
    (client.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPipelineResponse('5'))
      .mockResolvedValueOnce({
        data: [mockDealStatusResponse('10', '5').data],
        included: mockDealStatusResponse('10', '5').included,
      });

    const result = await getPipeline(client, {
      pipeline_id: '5',
      response_format: 'json',
    });
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed.statuses)).toBe(true);
    expect(parsed.statuses).toHaveLength(1);
    expect(parsed.statuses[0].id).toBe('10');
  });
});
