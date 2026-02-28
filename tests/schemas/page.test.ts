/**
 * Tier 1: Schema tests for page-related Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  CreatePageSchema,
  UpdatePageSchema,
  GetPageSchema,
  DeletePageSchema,
  ListPagesSchema,
  SearchPagesSchema,
  PAGE_SORT_FIELDS,
} from '../../src/schemas/page.js';

// ─── CreatePageSchema ────────────────────────────────────────────────────────

describe('CreatePageSchema', () => {
  it('accepts minimal valid input (title only)', () => {
    const result = CreatePageSchema.safeParse({ title: 'My Page' });
    expect(result.success).toBe(true);
  });

  it('accepts full valid input without hierarchy', () => {
    const result = CreatePageSchema.safeParse({
      title: 'Spec Doc',
      body: '# Overview\n\nContent here.',
      project_id: '123',
      version_number: '1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid child page (both parent_page_id and root_page_id)', () => {
    const result = CreatePageSchema.safeParse({
      title: 'Child Page',
      body: '# Child',
      project_id: '123',
      parent_page_id: '456',
      root_page_id: '100',
    });
    expect(result.success).toBe(true);
  });

  it('defaults response_format to "markdown"', () => {
    const result = CreatePageSchema.safeParse({ title: 'Test' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.response_format).toBe('markdown');
  });

  it('rejects empty title', () => {
    const result = CreatePageSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 500 characters', () => {
    const result = CreatePageSchema.safeParse({ title: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts title of exactly 500 characters', () => {
    const result = CreatePageSchema.safeParse({ title: 'x'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = CreatePageSchema.safeParse({
      title: 'Test',
      unexpected_field: 'value',
    });
    expect(result.success).toBe(false);
  });

  it('rejects parent_page_id without root_page_id', () => {
    const result = CreatePageSchema.safeParse({
      title: 'Child',
      parent_page_id: '456',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('root_page_id');
    }
  });

  it('rejects root_page_id without parent_page_id', () => {
    const result = CreatePageSchema.safeParse({
      title: 'Child',
      root_page_id: '100',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('root_page_id');
    }
  });

  it('accepts neither parent_page_id nor root_page_id (top-level page)', () => {
    const result = CreatePageSchema.safeParse({ title: 'Top Level' });
    expect(result.success).toBe(true);
  });
});

// ─── UpdatePageSchema ────────────────────────────────────────────────────────

describe('UpdatePageSchema', () => {
  it('accepts minimal input (page_id only)', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '123' });
    expect(result.success).toBe(true);
  });

  it('accepts title update', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '123', title: 'New Title' });
    expect(result.success).toBe(true);
  });

  it('accepts body update', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '123', body: '# New content' });
    expect(result.success).toBe(true);
  });

  it('accepts null body (to clear content)', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '123', body: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBeNull();
  });

  it('rejects empty page_id', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty title string', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '123', title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 500 characters', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '123', title: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = UpdatePageSchema.safeParse({ page_id: '123', unknown: 'value' });
    expect(result.success).toBe(false);
  });
});

// ─── GetPageSchema ────────────────────────────────────────────────────────────

describe('GetPageSchema', () => {
  it('accepts valid page_id', () => {
    const result = GetPageSchema.safeParse({ page_id: '42' });
    expect(result.success).toBe(true);
  });

  it('rejects empty page_id', () => {
    const result = GetPageSchema.safeParse({ page_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing page_id', () => {
    const result = GetPageSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = GetPageSchema.safeParse({ page_id: '42', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ─── DeletePageSchema ─────────────────────────────────────────────────────────

describe('DeletePageSchema', () => {
  it('accepts valid page_id', () => {
    const result = DeletePageSchema.safeParse({ page_id: '99' });
    expect(result.success).toBe(true);
  });

  it('rejects empty page_id', () => {
    const result = DeletePageSchema.safeParse({ page_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = DeletePageSchema.safeParse({ page_id: '99', bonus: true });
    expect(result.success).toBe(false);
  });
});

// ─── ListPagesSchema ──────────────────────────────────────────────────────────

describe('ListPagesSchema', () => {
  it('accepts empty input (all defaults)', () => {
    const result = ListPagesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
      expect(result.data.response_format).toBe('markdown');
    }
  });

  it('accepts project_id as string', () => {
    const result = ListPagesSchema.safeParse({ project_id: '123' });
    expect(result.success).toBe(true);
  });

  it('accepts project_id as array of strings', () => {
    const result = ListPagesSchema.safeParse({ project_id: ['123', '456'] });
    expect(result.success).toBe(true);
  });

  it('accepts valid sort_by field', () => {
    for (const field of PAGE_SORT_FIELDS) {
      const result = ListPagesSchema.safeParse({ sort_by: field });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid sort_by field', () => {
    const result = ListPagesSchema.safeParse({ sort_by: 'invalid_field' });
    expect(result.success).toBe(false);
  });

  it('accepts sort_order asc and desc', () => {
    expect(ListPagesSchema.safeParse({ sort_order: 'asc' }).success).toBe(true);
    expect(ListPagesSchema.safeParse({ sort_order: 'desc' }).success).toBe(true);
  });

  it('rejects invalid sort_order', () => {
    expect(ListPagesSchema.safeParse({ sort_order: 'random' }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = ListPagesSchema.safeParse({ mystery: 'field' });
    expect(result.success).toBe(false);
  });
});

// ─── SearchPagesSchema ────────────────────────────────────────────────────────

describe('SearchPagesSchema', () => {
  it('accepts empty input (all defaults)', () => {
    const result = SearchPagesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts query string', () => {
    const result = SearchPagesSchema.safeParse({ query: 'meeting notes' });
    expect(result.success).toBe(true);
  });

  it('accepts project_id filter', () => {
    const result = SearchPagesSchema.safeParse({ project_id: '123' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = SearchPagesSchema.safeParse({ extra: 'field' });
    expect(result.success).toBe(false);
  });
});
