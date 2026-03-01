/**
 * Tier 2: Unit tests for activity tool handlers (mocked client)
 *
 * Verifies that each handler:
 * - Passes correct filter parameters to the API
 * - Converts activity_type to numeric IDs (comment=1, changeset=2, email=3)
 * - Converts offset/limit into page[number]/page[size]
 * - Returns a string response
 */

import { describe, it, expect, vi } from 'vitest';
import {
  listActivities,
  getActivity,
  listTaskActivities,
  listProjectActivities,
} from '../../src/tools/activities.js';
import { createMockClient } from '../helpers/mock-client.js';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockActivityAttributes(overrides: Record<string, unknown> = {}) {
  return {
    event: 'create',
    activity_type_id: 1,
    subject: 'Added a comment',
    created_at: '2026-01-01T10:00:00Z',
    parent_id: null,
    parent_type: null,
    parent_name: null,
    root_id: null,
    root_type: null,
    root_name: null,
    made_by_automation: false,
    changeset: null,
    ...overrides,
  };
}

function mockActivityResponse(id = '1', attrOverrides: Record<string, unknown> = {}) {
  return {
    data: {
      type: 'activities',
      id,
      attributes: mockActivityAttributes(attrOverrides),
      relationships: {
        creator: { data: { type: 'people', id: '50' } },
      },
    },
    included: [
      {
        type: 'people',
        id: '50',
        attributes: { first_name: 'Alice', last_name: 'Smith' },
      },
    ],
  };
}

function mockActivityListResponse(count = 2) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      type: 'activities',
      id: String(i + 1),
      attributes: mockActivityAttributes({ event: i === 0 ? 'create' : 'update' }),
      relationships: {
        creator: { data: { type: 'people', id: '50' } },
      },
    })),
    included: [
      {
        type: 'people',
        id: '50',
        attributes: { first_name: 'Alice', last_name: 'Smith' },
      },
    ],
    meta: {
      total_count: count,
      total_pages: 1,
    },
  };
}

const defaultArgs = { limit: 20, offset: 0, response_format: 'markdown' as const };

// ─── listActivities ───────────────────────────────────────────────────────────

describe('listActivities', () => {
  it('calls GET /activities', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, defaultArgs);
    expect(client.get).toHaveBeenCalledWith('/activities', expect.any(Object));
  });

  it('returns a string', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    const result = await listActivities(client, defaultArgs);
    expect(typeof result).toBe('string');
  });

  it('sends page[number]=1 and page[size]=20 by default', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, defaultArgs);
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['page[number]']).toBe(1);
    expect(params['page[size]']).toBe(20);
  });

  it('converts offset+limit to page number correctly', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, limit: 10, offset: 20 });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['page[number]']).toBe(3);
  });

  it('includes include=creator', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, defaultArgs);
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params.include).toBe('creator');
  });

  it('sends filter[deal_id] when deal_id is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, deal_id: '42' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[deal_id]']).toBe('42');
  });

  it('sends filter[task_id] when task_id is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, task_id: '99' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[task_id]']).toBe('99');
  });

  it('sends filter[project_id] when project_id is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, project_id: '77' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[project_id]']).toBe('77');
  });

  it('sends filter[company_id] when company_id is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, company_id: '55' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[company_id]']).toBe('55');
  });

  it('sends filter[person_id] when person_id is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, person_id: '66' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[person_id]']).toBe('66');
  });

  it('sends filter[creator_id] when creator_id is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, creator_id: '11' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[creator_id]']).toBe('11');
  });

  it('sends filter[event] when event is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, event: 'create' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[event]']).toBe('create');
  });

  it('maps activity_type=comment to filter[type]=1', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, activity_type: 'comment' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[type]']).toBe(1);
  });

  it('maps activity_type=changeset to filter[type]=2', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, activity_type: 'changeset' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[type]']).toBe(2);
  });

  it('maps activity_type=email to filter[type]=3', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, activity_type: 'email' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[type]']).toBe(3);
  });

  it('sends filter[after] when after is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, after: '2025-01-01' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[after]']).toBe('2025-01-01');
  });

  it('sends filter[before] when before is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listActivities(client, { ...defaultArgs, before: '2025-12-31' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[before]']).toBe('2025-12-31');
  });

  it('returns json format when requested', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    const result = await listActivities(client, {
      ...defaultArgs,
      response_format: 'json',
    });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('handles empty activity list', async () => {
    const client = createMockClient({
      get: { data: [], meta: { total_count: 0, total_pages: 0 } },
    });
    const result = await listActivities(client, defaultArgs);
    expect(typeof result).toBe('string');
  });
});

// ─── getActivity ──────────────────────────────────────────────────────────────

describe('getActivity', () => {
  it('calls GET /activities/:id', async () => {
    const client = createMockClient({ get: mockActivityResponse('42') });
    await getActivity(client, { activity_id: '42', response_format: 'markdown' });
    expect(client.get).toHaveBeenCalledWith('/activities/42', expect.any(Object));
  });

  it('includes creator,comment,email,attachment', async () => {
    const client = createMockClient({ get: mockActivityResponse('42') });
    await getActivity(client, { activity_id: '42', response_format: 'markdown' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params.include).toBe('creator,comment,email,attachment');
  });

  it('returns a string', async () => {
    const client = createMockClient({ get: mockActivityResponse('42') });
    const result = await getActivity(client, {
      activity_id: '42',
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
  });

  it('returns json format when requested', async () => {
    const client = createMockClient({ get: mockActivityResponse('42') });
    const result = await getActivity(client, {
      activity_id: '42',
      response_format: 'json',
    });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('handles array data response by using first element', async () => {
    const client = createMockClient({
      get: {
        data: [mockActivityResponse('42').data],
        included: mockActivityResponse('42').included,
      },
    });
    const result = await getActivity(client, {
      activity_id: '42',
      response_format: 'markdown',
    });
    expect(typeof result).toBe('string');
  });
});

// ─── listTaskActivities ───────────────────────────────────────────────────────

describe('listTaskActivities', () => {
  const taskArgs = { task_id: '88', ...defaultArgs };

  it('calls GET /activities', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listTaskActivities(client, taskArgs);
    expect(client.get).toHaveBeenCalledWith('/activities', expect.any(Object));
  });

  it('sends filter[task_id]', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listTaskActivities(client, taskArgs);
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[task_id]']).toBe('88');
  });

  it('sends page[number] and page[size]', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listTaskActivities(client, taskArgs);
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['page[number]']).toBe(1);
    expect(params['page[size]']).toBe(20);
  });

  it('maps activity_type to numeric filter[type]', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listTaskActivities(client, { ...taskArgs, activity_type: 'email' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[type]']).toBe(3);
  });

  it('returns a string', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    const result = await listTaskActivities(client, taskArgs);
    expect(typeof result).toBe('string');
  });

  it('does not send filter[task_id] for other entity types', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listTaskActivities(client, taskArgs);
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[deal_id]']).toBeUndefined();
    expect(params['filter[project_id]']).toBeUndefined();
  });
});

// ─── listProjectActivities ────────────────────────────────────────────────────

describe('listProjectActivities', () => {
  const projectArgs = { project_id: '55', ...defaultArgs };

  it('calls GET /activities', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listProjectActivities(client, projectArgs);
    expect(client.get).toHaveBeenCalledWith('/activities', expect.any(Object));
  });

  it('sends filter[project_id]', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listProjectActivities(client, projectArgs);
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[project_id]']).toBe('55');
  });

  it('sends page[number] and page[size]', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listProjectActivities(client, projectArgs);
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['page[number]']).toBe(1);
    expect(params['page[size]']).toBe(20);
  });

  it('maps activity_type=comment to filter[type]=1', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listProjectActivities(client, { ...projectArgs, activity_type: 'comment' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[type]']).toBe(1);
  });

  it('sends filter[event] when event is given', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listProjectActivities(client, { ...projectArgs, event: 'update' });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['filter[event]']).toBe('update');
  });

  it('returns a string', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    const result = await listProjectActivities(client, projectArgs);
    expect(typeof result).toBe('string');
  });

  it('handles pagination with offset', async () => {
    const client = createMockClient({ get: mockActivityListResponse() });
    await listProjectActivities(client, { ...projectArgs, limit: 10, offset: 30 });
    const [, params] = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(params['page[number]']).toBe(4);
    expect(params['page[size]']).toBe(10);
  });
});
