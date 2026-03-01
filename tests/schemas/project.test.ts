/**
 * Tier 1: Schema tests for project Zod schemas.
 * Pure validation — no client, no network.
 */

import { describe, it, expect } from 'vitest';
import {
  GetProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  ArchiveProjectSchema,
  RestoreProjectSchema,
  ListWorkflowsSchema,
} from '../../src/schemas/project.js';

// ─── GetProjectSchema ─────────────────────────────────────────────────────────

describe('GetProjectSchema', () => {
  it('accepts a valid project_id', () => {
    const result = GetProjectSchema.safeParse({ project_id: '881766' });
    expect(result.success).toBe(true);
  });

  it('rejects missing project_id', () => {
    const result = GetProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty project_id', () => {
    const result = GetProjectSchema.safeParse({ project_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = GetProjectSchema.safeParse({
      project_id: '881766',
      archived: false,
    });
    expect(result.success).toBe(false);
  });

  it('defaults response_format to markdown', () => {
    const result = GetProjectSchema.safeParse({ project_id: '881766' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.response_format).toBe('markdown');
    }
  });
});

// ─── CreateProjectSchema ──────────────────────────────────────────────────────

describe('CreateProjectSchema', () => {
  const validRequired = {
    name: 'Q2 Website Refresh',
    project_type_id: 1,
    workflow_id: '52925',
    project_manager_id: '1065388',
  };

  it('accepts all required fields', () => {
    const result = CreateProjectSchema.safeParse(validRequired);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Q2 Website Refresh');
      expect(result.data.project_type_id).toBe(1);
      expect(result.data.workflow_id).toBe('52925');
      expect(result.data.project_manager_id).toBe('1065388');
      expect(result.data.response_format).toBe('markdown');
    }
  });

  it('accepts all fields including optionals', () => {
    const result = CreateProjectSchema.safeParse({
      ...validRequired,
      company_id: '1153449',
      project_color_id: 3,
      response_format: 'json',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company_id).toBe('1153449');
      expect(result.data.project_color_id).toBe(3);
      expect(result.data.response_format).toBe('json');
    }
  });

  it('rejects missing name', () => {
    const { name: _name, ...rest } = validRequired;
    const result = CreateProjectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = CreateProjectSchema.safeParse({ ...validRequired, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 200 characters', () => {
    const result = CreateProjectSchema.safeParse({
      ...validRequired,
      name: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing project_type_id', () => {
    const { project_type_id: _id, ...rest } = validRequired;
    const result = CreateProjectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer project_type_id', () => {
    const result = CreateProjectSchema.safeParse({
      ...validRequired,
      project_type_id: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative project_type_id', () => {
    const result = CreateProjectSchema.safeParse({
      ...validRequired,
      project_type_id: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing workflow_id', () => {
    const { workflow_id: _wf, ...rest } = validRequired;
    const result = CreateProjectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty workflow_id', () => {
    const result = CreateProjectSchema.safeParse({ ...validRequired, workflow_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing project_manager_id', () => {
    const { project_manager_id: _pm, ...rest } = validRequired;
    const result = CreateProjectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty project_manager_id', () => {
    const result = CreateProjectSchema.safeParse({
      ...validRequired,
      project_manager_id: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = CreateProjectSchema.safeParse({
      ...validRequired,
      archived: false,
    });
    expect(result.success).toBe(false);
  });
});

// ─── UpdateProjectSchema ──────────────────────────────────────────────────────

describe('UpdateProjectSchema', () => {
  it('accepts project_id and name only', () => {
    const result = UpdateProjectSchema.safeParse({
      project_id: '881766',
      name: 'Renamed Project',
    });
    expect(result.success).toBe(true);
  });

  it('accepts project_id and project_manager_id only', () => {
    const result = UpdateProjectSchema.safeParse({
      project_id: '881766',
      project_manager_id: '1065388',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all optional update fields', () => {
    const result = UpdateProjectSchema.safeParse({
      project_id: '881766',
      name: 'New Name',
      project_type_id: 2,
      project_color_id: 5,
      project_manager_id: '1065388',
      company_id: '1153449',
      response_format: 'json',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing project_id', () => {
    const result = UpdateProjectSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = UpdateProjectSchema.safeParse({
      project_id: '881766',
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = UpdateProjectSchema.safeParse({
      project_id: '881766',
      archived: false,
    });
    expect(result.success).toBe(false);
  });
});

// ─── ArchiveProjectSchema ─────────────────────────────────────────────────────

describe('ArchiveProjectSchema', () => {
  it('accepts a valid project_id', () => {
    const result = ArchiveProjectSchema.safeParse({ project_id: '881766' });
    expect(result.success).toBe(true);
  });

  it('rejects missing project_id', () => {
    const result = ArchiveProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── RestoreProjectSchema ─────────────────────────────────────────────────────

describe('RestoreProjectSchema', () => {
  it('accepts a valid project_id', () => {
    const result = RestoreProjectSchema.safeParse({ project_id: '881766' });
    expect(result.success).toBe(true);
  });

  it('rejects missing project_id', () => {
    const result = RestoreProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── ListWorkflowsSchema ──────────────────────────────────────────────────────

describe('ListWorkflowsSchema', () => {
  it('accepts empty object', () => {
    const result = ListWorkflowsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.response_format).toBe('markdown');
    }
  });

  it('accepts json response_format', () => {
    const result = ListWorkflowsSchema.safeParse({ response_format: 'json' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = ListWorkflowsSchema.safeParse({ project_id: '123' });
    expect(result.success).toBe(false);
  });
});
