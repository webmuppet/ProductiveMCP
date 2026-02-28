/**
 * Tier 1: Schema tests for deal status and pipeline Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  ListDealStatusesSchema,
  GetDealStatusSchema,
} from '../../src/schemas/deal-status.js';
import {
  ListPipelinesSchema,
  GetPipelineSchema,
} from '../../src/schemas/pipeline.js';

// ─── ListDealStatusesSchema ───────────────────────────────────────────────────

describe('ListDealStatusesSchema', () => {
  it('accepts empty input (all defaults)', () => {
    const result = ListDealStatusesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('applies default limit=20', () => {
    const result = ListDealStatusesSchema.parse({});
    expect(result.limit).toBe(20);
  });

  it('applies default offset=0', () => {
    const result = ListDealStatusesSchema.parse({});
    expect(result.offset).toBe(0);
  });

  it('applies default response_format=markdown', () => {
    const result = ListDealStatusesSchema.parse({});
    expect(result.response_format).toBe('markdown');
  });

  it('accepts pipeline_id filter', () => {
    const result = ListDealStatusesSchema.parse({ pipeline_id: '42' });
    expect(result.pipeline_id).toBe('42');
  });

  it('pipeline_id is optional', () => {
    const result = ListDealStatusesSchema.parse({});
    expect(result.pipeline_id).toBeUndefined();
  });

  it('accepts valid limit', () => {
    const result = ListDealStatusesSchema.parse({ limit: 50 });
    expect(result.limit).toBe(50);
  });

  it('accepts valid offset', () => {
    const result = ListDealStatusesSchema.parse({ offset: 10 });
    expect(result.offset).toBe(10);
  });

  it('accepts json response_format', () => {
    const result = ListDealStatusesSchema.parse({ response_format: 'json' });
    expect(result.response_format).toBe('json');
  });

  it('rejects invalid response_format', () => {
    const result = ListDealStatusesSchema.safeParse({ response_format: 'xml' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = ListDealStatusesSchema.safeParse({ unknown: 'field' });
    expect(result.success).toBe(false);
  });
});

// ─── GetDealStatusSchema ──────────────────────────────────────────────────────

describe('GetDealStatusSchema', () => {
  it('accepts valid deal_status_id', () => {
    const result = GetDealStatusSchema.parse({ deal_status_id: '123' });
    expect(result.deal_status_id).toBe('123');
  });

  it('applies default response_format=markdown', () => {
    const result = GetDealStatusSchema.parse({ deal_status_id: '123' });
    expect(result.response_format).toBe('markdown');
  });

  it('accepts json response_format', () => {
    const result = GetDealStatusSchema.parse({
      deal_status_id: '123',
      response_format: 'json',
    });
    expect(result.response_format).toBe('json');
  });

  it('rejects missing deal_status_id', () => {
    const result = GetDealStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty string deal_status_id', () => {
    const result = GetDealStatusSchema.safeParse({ deal_status_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = GetDealStatusSchema.safeParse({
      deal_status_id: '123',
      extra: 'field',
    });
    expect(result.success).toBe(false);
  });
});

// ─── ListPipelinesSchema ──────────────────────────────────────────────────────

describe('ListPipelinesSchema', () => {
  it('accepts empty input (all defaults)', () => {
    const result = ListPipelinesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('applies default response_format=markdown', () => {
    const result = ListPipelinesSchema.parse({});
    expect(result.response_format).toBe('markdown');
  });

  it('pipeline_type is optional', () => {
    const result = ListPipelinesSchema.parse({});
    expect(result.pipeline_type).toBeUndefined();
  });

  it('accepts pipeline_type=sales', () => {
    const result = ListPipelinesSchema.parse({ pipeline_type: 'sales' });
    expect(result.pipeline_type).toBe('sales');
  });

  it('accepts pipeline_type=production', () => {
    const result = ListPipelinesSchema.parse({ pipeline_type: 'production' });
    expect(result.pipeline_type).toBe('production');
  });

  it('rejects invalid pipeline_type', () => {
    const result = ListPipelinesSchema.safeParse({ pipeline_type: 'marketing' });
    expect(result.success).toBe(false);
  });

  it('accepts json response_format', () => {
    const result = ListPipelinesSchema.parse({ response_format: 'json' });
    expect(result.response_format).toBe('json');
  });

  it('rejects invalid response_format', () => {
    const result = ListPipelinesSchema.safeParse({ response_format: 'text' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = ListPipelinesSchema.safeParse({ unknown: true });
    expect(result.success).toBe(false);
  });
});

// ─── GetPipelineSchema ────────────────────────────────────────────────────────

describe('GetPipelineSchema', () => {
  it('accepts valid pipeline_id', () => {
    const result = GetPipelineSchema.parse({ pipeline_id: '5' });
    expect(result.pipeline_id).toBe('5');
  });

  it('applies default response_format=markdown', () => {
    const result = GetPipelineSchema.parse({ pipeline_id: '5' });
    expect(result.response_format).toBe('markdown');
  });

  it('include_statuses defaults to undefined (treated as true in handler)', () => {
    const result = GetPipelineSchema.parse({ pipeline_id: '5' });
    expect(result.include_statuses).toBeUndefined();
  });

  it('accepts include_statuses=true', () => {
    const result = GetPipelineSchema.parse({ pipeline_id: '5', include_statuses: true });
    expect(result.include_statuses).toBe(true);
  });

  it('accepts include_statuses=false', () => {
    const result = GetPipelineSchema.parse({ pipeline_id: '5', include_statuses: false });
    expect(result.include_statuses).toBe(false);
  });

  it('rejects missing pipeline_id', () => {
    const result = GetPipelineSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty string pipeline_id', () => {
    const result = GetPipelineSchema.safeParse({ pipeline_id: '' });
    expect(result.success).toBe(false);
  });

  it('accepts json response_format', () => {
    const result = GetPipelineSchema.parse({
      pipeline_id: '5',
      response_format: 'json',
    });
    expect(result.response_format).toBe('json');
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = GetPipelineSchema.safeParse({ pipeline_id: '5', extra: 'bad' });
    expect(result.success).toBe(false);
  });
});
