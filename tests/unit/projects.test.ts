/**
 * Tier 2: Unit tests for project tools.
 * Uses a mocked ProductiveClient — no network calls.
 */

import { describe, it, expect, vi } from 'vitest';
import { createMockClient } from '../helpers/mock-client.js';
import {
  getProject,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  listWorkflows,
} from '../../src/tools/projects.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockProjectResponse(id = '999', overrides: Record<string, unknown> = {}) {
  return {
    data: {
      type: 'projects',
      id,
      attributes: {
        name: 'Test Project',
        project_number: 'P-001',
        project_type_id: 1,
        archived: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
      },
      relationships: {
        company: { data: { type: 'companies', id: '200' } },
        project_manager: { data: { type: 'people', id: '300' } },
        workflow: { data: { type: 'workflows', id: '52925' } },
      },
    },
    included: [
      {
        type: 'companies',
        id: '200',
        attributes: { name: 'Acme Corp' },
      },
      {
        type: 'people',
        id: '300',
        attributes: { name: 'Greg F' },
      },
      {
        type: 'workflows',
        id: '52925',
        attributes: { name: 'Default workflow' },
      },
    ],
  };
}

// ─── getProject ───────────────────────────────────────────────────────────────

describe('getProject', () => {
  it('fetches /projects/:id with company,project_manager,workflow include', async () => {
    const mockResponse = mockProjectResponse('881766');
    const client = createMockClient({ get: mockResponse });

    await getProject(client, { project_id: '881766', response_format: 'json' });

    expect(client.get).toHaveBeenCalledWith('/projects/881766', {
      include: 'company,project_manager,workflow',
    });
  });

  it('returns formatted project with company, PM, and workflow', async () => {
    const mockResponse = mockProjectResponse('881766');
    const client = createMockClient({ get: mockResponse });

    const result = await getProject(client, { project_id: '881766', response_format: 'json' });
    const parsed = JSON.parse(result);

    expect(parsed.id).toBe('881766');
    expect(parsed.name).toBe('Test Project');
    expect(parsed.client_id).toBe('200');
    expect(parsed.client_name).toBe('Acme Corp');
    expect(parsed.project_manager_id).toBe('300');
    expect(parsed.project_manager_name).toBe('Greg F');
    expect(parsed.workflow_id).toBe('52925');
    expect(parsed.workflow_name).toBe('Default workflow');
  });

  it('handles project without company relationship', async () => {
    const mockResponse = {
      data: {
        type: 'projects',
        id: '1',
        attributes: {
          name: 'Internal Project',
          project_type_id: 2,
          archived: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        relationships: {
          project_manager: { data: { type: 'people', id: '300' } },
          workflow: { data: { type: 'workflows', id: '52925' } },
        },
      },
      included: [],
    };
    const client = createMockClient({ get: mockResponse });

    const result = await getProject(client, { project_id: '1', response_format: 'json' });
    const parsed = JSON.parse(result);

    expect(parsed.client_id).toBeNull();
    expect(parsed.client_name).toBeNull();
    expect(parsed.project_manager_id).toBe('300');
  });

  it('returns markdown format by default', async () => {
    const client = createMockClient({ get: mockProjectResponse() });
    const result = await getProject(client, { project_id: '1', response_format: 'markdown' });
    expect(result).toContain('# Test Project');
    expect(result).toContain('**Status:**');
  });
});

// ─── createProject ────────────────────────────────────────────────────────────

describe('createProject', () => {
  const baseArgs = {
    name: 'New Project',
    project_type_id: 1,
    workflow_id: '52925',
    project_manager_id: '1065388',
    response_format: 'json' as const,
  };

  it('sends correct payload with required relationships', async () => {
    const client = createMockClient({ post: mockProjectResponse() });

    await createProject(client, baseArgs);

    expect(client.post).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'projects',
          attributes: expect.objectContaining({
            name: 'New Project',
            project_type_id: 1,
          }),
          relationships: expect.objectContaining({
            workflow: { data: { type: 'workflows', id: '52925' } },
            project_manager: { data: { type: 'people', id: '1065388' } },
          }),
        }),
      }),
      expect.objectContaining({ include: 'company,project_manager,workflow' }),
    );
  });

  it('includes company relationship when company_id provided', async () => {
    const client = createMockClient({ post: mockProjectResponse() });

    await createProject(client, { ...baseArgs, company_id: '1153449' });

    expect(client.post).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({
        data: expect.objectContaining({
          relationships: expect.objectContaining({
            company: { data: { type: 'companies', id: '1153449' } },
          }),
        }),
      }),
      expect.anything(),
    );
  });

  it('omits company relationship when company_id not provided', async () => {
    const client = createMockClient({ post: mockProjectResponse() });

    await createProject(client, baseArgs);

    const callPayload = vi.mocked(client.post).mock.calls[0][1] as {
      data: { relationships: Record<string, unknown> };
    };
    expect(callPayload.data.relationships).not.toHaveProperty('company');
  });

  it('includes project_color_id in attributes when set', async () => {
    const client = createMockClient({ post: mockProjectResponse() });

    await createProject(client, { ...baseArgs, project_color_id: 3 });

    expect(client.post).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({
        data: expect.objectContaining({
          attributes: expect.objectContaining({ project_color_id: 3 }),
        }),
      }),
      expect.anything(),
    );
  });

  it('uses type "people" for project_manager (not memberships)', async () => {
    const client = createMockClient({ post: mockProjectResponse() });

    await createProject(client, baseArgs);

    const callPayload = vi.mocked(client.post).mock.calls[0][1] as {
      data: { relationships: { project_manager: { data: { type: string } } } };
    };
    expect(callPayload.data.relationships.project_manager.data.type).toBe('people');
  });

  it('returns success message in markdown format', async () => {
    const client = createMockClient({ post: mockProjectResponse() });
    const result = await createProject(client, {
      ...baseArgs,
      response_format: 'markdown',
    });
    expect(result).toContain('Project created successfully');
  });
});

// ─── updateProject ────────────────────────────────────────────────────────────

describe('updateProject', () => {
  it('sends partial payload with only name changed', async () => {
    const client = createMockClient({
      patch: {},
      get: mockProjectResponse(),
    });

    await updateProject(client, {
      project_id: '881766',
      name: 'Renamed',
      response_format: 'json',
    });

    expect(client.patch).toHaveBeenCalledWith(
      '/projects/881766',
      expect.objectContaining({
        data: expect.objectContaining({
          attributes: { name: 'Renamed' },
        }),
      }),
    );
    // relationships block should be absent
    const callPayload = vi.mocked(client.patch).mock.calls[0][1] as {
      data: { relationships?: unknown };
    };
    expect(callPayload.data.relationships).toBeUndefined();
  });

  it('sends partial payload with only relationship changed', async () => {
    const client = createMockClient({
      patch: {},
      get: mockProjectResponse(),
    });

    await updateProject(client, {
      project_id: '881766',
      project_manager_id: '9999',
      response_format: 'json',
    });

    expect(client.patch).toHaveBeenCalledWith(
      '/projects/881766',
      expect.objectContaining({
        data: expect.objectContaining({
          relationships: {
            project_manager: { data: { type: 'people', id: '9999' } },
          },
        }),
      }),
    );
    // attributes block should be absent
    const callPayload = vi.mocked(client.patch).mock.calls[0][1] as {
      data: { attributes?: unknown };
    };
    expect(callPayload.data.attributes).toBeUndefined();
  });

  it('fetches updated project with includes after PATCH', async () => {
    const client = createMockClient({
      patch: {},
      get: mockProjectResponse(),
    });

    await updateProject(client, {
      project_id: '881766',
      name: 'New Name',
      response_format: 'json',
    });

    expect(client.get).toHaveBeenCalledWith('/projects/881766', {
      include: 'company,project_manager,workflow',
    });
  });
});

// ─── archiveProject ───────────────────────────────────────────────────────────

describe('archiveProject', () => {
  it('PATCHes /projects/:id/archive with empty body', async () => {
    const client = createMockClient({ patch: mockProjectResponse() });

    await archiveProject(client, { project_id: '881766', response_format: 'json' });

    expect(client.patch).toHaveBeenCalledWith('/projects/881766/archive', {});
  });

  it('returns formatted project response', async () => {
    const client = createMockClient({ patch: mockProjectResponse() });
    const result = await archiveProject(client, {
      project_id: '881766',
      response_format: 'markdown',
    });
    expect(result).toContain('archived successfully');
  });
});

// ─── restoreProject ───────────────────────────────────────────────────────────

describe('restoreProject', () => {
  it('PATCHes /projects/:id/restore with empty body', async () => {
    const client = createMockClient({ patch: mockProjectResponse() });

    await restoreProject(client, { project_id: '881766', response_format: 'json' });

    expect(client.patch).toHaveBeenCalledWith('/projects/881766/restore', {});
  });

  it('returns formatted project response', async () => {
    const client = createMockClient({ patch: mockProjectResponse() });
    const result = await restoreProject(client, {
      project_id: '881766',
      response_format: 'markdown',
    });
    expect(result).toContain('restored successfully');
  });
});

// ─── listWorkflows ────────────────────────────────────────────────────────────

describe('listWorkflows', () => {
  it('fetches /workflows endpoint', async () => {
    const client = createMockClient({
      get: {
        data: [{ type: 'workflows', id: '52925', attributes: { name: 'Default workflow' } }],
      },
    });

    await listWorkflows(client, { response_format: 'json' });

    expect(client.get).toHaveBeenCalledWith('/workflows');
  });

  it('returns list of workflows in json format', async () => {
    const client = createMockClient({
      get: {
        data: [
          { type: 'workflows', id: '52925', attributes: { name: 'Default workflow' } },
          { type: 'workflows', id: '99999', attributes: { name: 'Custom workflow' } },
        ],
      },
    });

    const result = await listWorkflows(client, { response_format: 'json' });
    const parsed = JSON.parse(result);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ id: '52925', name: 'Default workflow' });
    expect(parsed[1]).toEqual({ id: '99999', name: 'Custom workflow' });
  });

  it('returns markdown format', async () => {
    const client = createMockClient({
      get: {
        data: [{ type: 'workflows', id: '52925', attributes: { name: 'Default workflow' } }],
      },
    });

    const result = await listWorkflows(client, { response_format: 'markdown' });
    expect(result).toContain('# Workflows');
    expect(result).toContain('Default workflow');
    expect(result).toContain('52925');
  });
});
