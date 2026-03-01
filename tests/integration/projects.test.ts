/**
 * Tier 3: Integration tests for project tools against the Productive sandbox.
 *
 * These tests are skipped automatically when sandbox env vars are not set.
 * To run: set env vars (see .env.example), then: npm run test:integration
 *
 * The test creates a project, verifies it, updates it, archives it,
 * restores it, and then archives it again for cleanup.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HAS_SANDBOX, getSandboxClient, SANDBOX_PROJECT_ID } from './setup.js';
import {
  listWorkflows,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
} from '../../src/tools/projects.js';
import type { ProductiveClient } from '../../src/client.js';

// Creating projects requires workflow_id, project_manager_id, and company_id (sandbox validation)
const SANDBOX_PERSON_ID = process.env.PRODUCTIVE_SANDBOX_PERSON_ID ?? '';
const SANDBOX_COMPANY_ID = process.env.PRODUCTIVE_SANDBOX_COMPANY_ID ?? '';
const HAS_PROJECT_SANDBOX = HAS_SANDBOX && !!SANDBOX_PERSON_ID && !!SANDBOX_COMPANY_ID;

describe.skipIf(!HAS_PROJECT_SANDBOX)('Projects Integration (sandbox)', () => {
  let client: ProductiveClient;
  let workflowId: string | null = null;
  let createdProjectId: string | null = null;

  beforeAll(async () => {
    client = getSandboxClient();

    // Discover the first workflow to use for project creation
    const wfResult = await listWorkflows(client, { response_format: 'json' });
    const workflows = JSON.parse(wfResult);
    if (Array.isArray(workflows) && workflows.length > 0) {
      workflowId = workflows[0].id;
    }
  });

  afterAll(async () => {
    // Best-effort cleanup: archive the created project
    if (createdProjectId && client) {
      try {
        await archiveProject(client, {
          project_id: createdProjectId,
          response_format: 'json',
        });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // ─── listWorkflows ──────────────────────────────────────────────────────────

  it('lists workflows and returns at least one', async () => {
    const result = await listWorkflows(client, { response_format: 'json' });
    const workflows = JSON.parse(result);

    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
    expect(workflows[0]).toHaveProperty('id');
    expect(workflows[0]).toHaveProperty('name');
  });

  // ─── getProject ────────────────────────────────────────────────────────────

  it('retrieves the sandbox project by ID', async () => {
    if (!SANDBOX_PROJECT_ID) return;

    const result = await getProject(client, {
      project_id: SANDBOX_PROJECT_ID,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBe(SANDBOX_PROJECT_ID);
    expect(parsed.name).toBeTruthy();
  });

  // ─── createProject ─────────────────────────────────────────────────────────

  it('creates a project and returns a valid project object', async () => {
    if (!workflowId) {
      console.warn('Skipping create: no workflow found');
      return;
    }

    const result = await createProject(client, {
      name: '[Integration Test] Vitest Project',
      project_type_id: 1, // client project
      workflow_id: workflowId,
      project_manager_id: SANDBOX_PERSON_ID,
      company_id: SANDBOX_COMPANY_ID, // Sandbox requires company on create
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBeTruthy();
    expect(parsed.name).toBe('[Integration Test] Vitest Project');
    expect(parsed.project_type_id).toBe(1);
    expect(parsed.archived).toBe(false);

    createdProjectId = parsed.id;
  });

  // ─── getProject (by created ID) ────────────────────────────────────────────

  it('retrieves the created project by ID', async () => {
    if (!createdProjectId) return;

    const result = await getProject(client, {
      project_id: createdProjectId,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.id).toBe(createdProjectId);
    expect(parsed.name).toBe('[Integration Test] Vitest Project');
    expect(parsed.workflow_id).toBe(workflowId);
    expect(parsed.project_manager_id).toBe(SANDBOX_PERSON_ID);
  });

  // ─── updateProject ─────────────────────────────────────────────────────────

  it('updates the project name', async () => {
    if (!createdProjectId) return;

    await updateProject(client, {
      project_id: createdProjectId,
      name: '[Integration Test] Vitest Project — Renamed',
      response_format: 'json',
    });

    // Verify the name changed
    const getResult = await getProject(client, {
      project_id: createdProjectId,
      response_format: 'json',
    });
    const parsed = JSON.parse(getResult);
    expect(parsed.name).toBe('[Integration Test] Vitest Project — Renamed');
  });

  // ─── archiveProject ────────────────────────────────────────────────────────

  it('archives the project', async () => {
    if (!createdProjectId) return;

    const result = await archiveProject(client, {
      project_id: createdProjectId,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.archived).toBe(true);
  });

  // ─── restoreProject ────────────────────────────────────────────────────────

  it('restores the archived project', async () => {
    if (!createdProjectId) return;

    const result = await restoreProject(client, {
      project_id: createdProjectId,
      response_format: 'json',
    });

    const parsed = JSON.parse(result);
    expect(parsed.archived).toBe(false);
  });
});
