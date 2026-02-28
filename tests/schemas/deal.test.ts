/**
 * Tier 1: Schema tests for deal-related Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  ListDealsSchema,
  GetDealSchema,
  CreateDealSchema,
  UpdateDealSchema,
  CloseDealSchema,
  CopyDealSchema,
  GenerateBudgetFromDealSchema,
  ListDealCommentsSchema,
  CreateDealCommentSchema,
  ListDealActivitiesSchema,
  DEAL_SORT_FIELDS,
  STAGE_STATUS_VALUES,
} from '../../src/schemas/deal.js';

// ─── STAGE_STATUS_VALUES ──────────────────────────────────────────────────────

describe('STAGE_STATUS_VALUES', () => {
  it('maps open to 1', () => {
    expect(STAGE_STATUS_VALUES.open).toBe(1);
  });

  it('maps won to 2', () => {
    expect(STAGE_STATUS_VALUES.won).toBe(2);
  });

  it('maps lost to 3', () => {
    expect(STAGE_STATUS_VALUES.lost).toBe(3);
  });
});

// ─── ListDealsSchema ──────────────────────────────────────────────────────────

describe('ListDealsSchema', () => {
  it('accepts empty input (all defaults)', () => {
    const result = ListDealsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.summary).toBe(false);
      expect(result.data.response_format).toBe('markdown');
    }
  });

  it('defaults summary to false', () => {
    const result = ListDealsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.summary).toBe(false);
  });

  it('accepts summary=true', () => {
    const result = ListDealsSchema.safeParse({ summary: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.summary).toBe(true);
  });

  it('accepts all stage_status values', () => {
    for (const status of ['open', 'won', 'lost'] as const) {
      const result = ListDealsSchema.safeParse({ stage_status: status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid stage_status', () => {
    const result = ListDealsSchema.safeParse({ stage_status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts all DEAL_SORT_FIELDS', () => {
    for (const field of DEAL_SORT_FIELDS) {
      const result = ListDealsSchema.safeParse({ sort_by: field });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid sort_by field', () => {
    const result = ListDealsSchema.safeParse({ sort_by: 'unknown_field' });
    expect(result.success).toBe(false);
  });

  it('accepts sort_order asc and desc', () => {
    expect(ListDealsSchema.safeParse({ sort_order: 'asc' }).success).toBe(true);
    expect(ListDealsSchema.safeParse({ sort_order: 'desc' }).success).toBe(true);
  });

  it('rejects invalid sort_order', () => {
    expect(ListDealsSchema.safeParse({ sort_order: 'random' }).success).toBe(false);
  });

  it('accepts all filter fields together', () => {
    const result = ListDealsSchema.safeParse({
      company_id: '1',
      responsible_id: '2',
      pipeline_id: '3',
      deal_status_id: '4',
      query: 'acme',
      stage_status: 'open',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = ListDealsSchema.safeParse({ unexpected: 'field' });
    expect(result.success).toBe(false);
  });
});

// ─── GetDealSchema ────────────────────────────────────────────────────────────

describe('GetDealSchema', () => {
  it('accepts valid deal_id', () => {
    const result = GetDealSchema.safeParse({ deal_id: '123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty deal_id', () => {
    const result = GetDealSchema.safeParse({ deal_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_id', () => {
    const result = GetDealSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('defaults response_format to markdown', () => {
    const result = GetDealSchema.safeParse({ deal_id: '123' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.response_format).toBe('markdown');
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = GetDealSchema.safeParse({ deal_id: '123', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ─── CreateDealSchema ─────────────────────────────────────────────────────────

describe('CreateDealSchema', () => {
  const minValid = { name: 'Acme Deal', date: '2026-03-01', deal_status_id: '42' };

  it('accepts minimal valid input (name, date, deal_status_id)', () => {
    const result = CreateDealSchema.safeParse(minValid);
    expect(result.success).toBe(true);
  });

  it('accepts full valid input', () => {
    const result = CreateDealSchema.safeParse({
      ...minValid,
      end_date: '2026-06-30',
      probability: 75,
      currency: 'USD',
      purchase_order_number: 'PO-123',
      company_id: '5',
      responsible_id: '10',
      pipeline_id: '3',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null end_date', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, end_date: null });
    expect(result.success).toBe(true);
  });

  it('rejects probability below 0', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, probability: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects probability above 100', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, probability: 101 });
    expect(result.success).toBe(false);
  });

  it('accepts probability at boundaries (0 and 100)', () => {
    expect(CreateDealSchema.safeParse({ ...minValid, probability: 0 }).success).toBe(true);
    expect(CreateDealSchema.safeParse({ ...minValid, probability: 100 }).success).toBe(true);
  });

  it('rejects non-integer probability', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, probability: 50.5 });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, name: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts name of exactly 200 characters', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, name: 'x'.repeat(200) });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name: _n, ...rest } = minValid;
    const result = CreateDealSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const { date: _d, ...rest } = minValid;
    const result = CreateDealSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_status_id', () => {
    const { deal_status_id: _s, ...rest } = minValid;
    const result = CreateDealSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode — budget is not user-facing)', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, budget: false });
    expect(result.success).toBe(false);
  });

  it('rejects deal_type_id as user-facing field (strict mode)', () => {
    const result = CreateDealSchema.safeParse({ ...minValid, deal_type_id: 2 });
    expect(result.success).toBe(false);
  });
});

// ─── UpdateDealSchema ─────────────────────────────────────────────────────────

describe('UpdateDealSchema', () => {
  it('accepts deal_id only (all other fields optional)', () => {
    const result = UpdateDealSchema.safeParse({ deal_id: '99' });
    expect(result.success).toBe(true);
  });

  it('accepts all updatable fields', () => {
    const result = UpdateDealSchema.safeParse({
      deal_id: '99',
      name: 'Updated Name',
      date: '2026-04-01',
      end_date: '2026-09-30',
      probability: 60,
      purchase_order_number: 'PO-456',
      deal_status_id: '5',
      company_id: '2',
      responsible_id: '7',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null end_date (to clear)', () => {
    const result = UpdateDealSchema.safeParse({ deal_id: '99', end_date: null });
    expect(result.success).toBe(true);
  });

  it('accepts null purchase_order_number (to clear)', () => {
    const result = UpdateDealSchema.safeParse({ deal_id: '99', purchase_order_number: null });
    expect(result.success).toBe(true);
  });

  it('rejects empty deal_id', () => {
    const result = UpdateDealSchema.safeParse({ deal_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects probability above 100', () => {
    const result = UpdateDealSchema.safeParse({ deal_id: '1', probability: 150 });
    expect(result.success).toBe(false);
  });

  it('rejects probability below 0', () => {
    const result = UpdateDealSchema.safeParse({ deal_id: '1', probability: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = UpdateDealSchema.safeParse({ deal_id: '1', extra: 'field' });
    expect(result.success).toBe(false);
  });
});

// ─── CloseDealSchema ──────────────────────────────────────────────────────────

describe('CloseDealSchema', () => {
  it('accepts valid won outcome', () => {
    const result = CloseDealSchema.safeParse({
      deal_id: '10',
      outcome: 'won',
      deal_status_id: '99',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid lost outcome with lost_reason_id', () => {
    const result = CloseDealSchema.safeParse({
      deal_id: '10',
      outcome: 'lost',
      deal_status_id: '88',
      lost_reason_id: '3',
    });
    expect(result.success).toBe(true);
  });

  it('accepts lost outcome without lost_reason_id (optional, not blocking)', () => {
    const result = CloseDealSchema.safeParse({
      deal_id: '10',
      outcome: 'lost',
      deal_status_id: '88',
    });
    // lost_reason_id is optional — should not block
    expect(result.success).toBe(true);
  });

  it('rejects invalid outcome value', () => {
    const result = CloseDealSchema.safeParse({
      deal_id: '10',
      outcome: 'cancelled',
      deal_status_id: '99',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing outcome', () => {
    const result = CloseDealSchema.safeParse({ deal_id: '10', deal_status_id: '99' });
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_status_id', () => {
    const result = CloseDealSchema.safeParse({ deal_id: '10', outcome: 'won' });
    expect(result.success).toBe(false);
  });

  it('rejects empty deal_status_id', () => {
    const result = CloseDealSchema.safeParse({
      deal_id: '10',
      outcome: 'won',
      deal_status_id: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = CloseDealSchema.safeParse({
      deal_id: '10',
      outcome: 'won',
      deal_status_id: '99',
      extra: 'field',
    });
    expect(result.success).toBe(false);
  });
});

// ─── CopyDealSchema ───────────────────────────────────────────────────────────

describe('CopyDealSchema', () => {
  it('accepts valid deal_id', () => {
    const result = CopyDealSchema.safeParse({ deal_id: '55' });
    expect(result.success).toBe(true);
  });

  it('rejects empty deal_id', () => {
    const result = CopyDealSchema.safeParse({ deal_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_id', () => {
    const result = CopyDealSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = CopyDealSchema.safeParse({ deal_id: '55', name: 'extra' });
    expect(result.success).toBe(false);
  });
});

// ─── GenerateBudgetFromDealSchema ─────────────────────────────────────────────

describe('GenerateBudgetFromDealSchema', () => {
  it('accepts valid deal_id', () => {
    const result = GenerateBudgetFromDealSchema.safeParse({ deal_id: '77' });
    expect(result.success).toBe(true);
  });

  it('rejects empty deal_id', () => {
    const result = GenerateBudgetFromDealSchema.safeParse({ deal_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_id', () => {
    const result = GenerateBudgetFromDealSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = GenerateBudgetFromDealSchema.safeParse({ deal_id: '77', extra: 'field' });
    expect(result.success).toBe(false);
  });
});

// ─── ListDealCommentsSchema ───────────────────────────────────────────────────

describe('ListDealCommentsSchema', () => {
  it('accepts valid deal_id with defaults', () => {
    const result = ListDealCommentsSchema.safeParse({ deal_id: '42' });
    expect(result.success).toBe(true);
  });

  it('accepts limit and offset', () => {
    const result = ListDealCommentsSchema.safeParse({ deal_id: '42', limit: 10, offset: 20 });
    expect(result.success).toBe(true);
  });

  it('rejects empty deal_id', () => {
    const result = ListDealCommentsSchema.safeParse({ deal_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_id', () => {
    const result = ListDealCommentsSchema.safeParse({ limit: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = ListDealCommentsSchema.safeParse({ deal_id: '42', extra: 'field' });
    expect(result.success).toBe(false);
  });
});

// ─── CreateDealCommentSchema ──────────────────────────────────────────────────

describe('CreateDealCommentSchema', () => {
  it('accepts valid deal_id and body', () => {
    const result = CreateDealCommentSchema.safeParse({
      deal_id: '42',
      body: 'Had a call with the client.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = CreateDealCommentSchema.safeParse({ deal_id: '42', body: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing body', () => {
    const result = CreateDealCommentSchema.safeParse({ deal_id: '42' });
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_id', () => {
    const result = CreateDealCommentSchema.safeParse({ body: 'note' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = CreateDealCommentSchema.safeParse({
      deal_id: '42',
      body: 'note',
      extra: 'field',
    });
    expect(result.success).toBe(false);
  });
});

// ─── ListDealActivitiesSchema ─────────────────────────────────────────────────

describe('ListDealActivitiesSchema', () => {
  it('accepts valid deal_id with defaults', () => {
    const result = ListDealActivitiesSchema.safeParse({ deal_id: '42' });
    expect(result.success).toBe(true);
  });

  it('accepts limit and offset', () => {
    const result = ListDealActivitiesSchema.safeParse({ deal_id: '42', limit: 5, offset: 10 });
    expect(result.success).toBe(true);
  });

  it('rejects empty deal_id', () => {
    const result = ListDealActivitiesSchema.safeParse({ deal_id: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing deal_id', () => {
    const result = ListDealActivitiesSchema.safeParse({ limit: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = ListDealActivitiesSchema.safeParse({ deal_id: '42', unknown: true });
    expect(result.success).toBe(false);
  });
});
