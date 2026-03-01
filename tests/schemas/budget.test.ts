/**
 * Tier 1: Schema tests for budget Zod schemas.
 * Pure validation — no client, no network.
 */

import { describe, it, expect } from 'vitest';
import { CreateBudgetSchema } from '../../src/schemas/budget.js';

describe('CreateBudgetSchema', () => {
  it('accepts required fields only', () => {
    const result = CreateBudgetSchema.safeParse({
      name: 'Q2 Retainer',
      date: '2026-04-01',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Q2 Retainer');
      expect(result.data.date).toBe('2026-04-01');
      // defaults
      expect(result.data.response_format).toBe('markdown');
    }
  });

  it('accepts all optional fields', () => {
    const result = CreateBudgetSchema.safeParse({
      name: 'Full Budget',
      date: '2026-01-01',
      end_date: '2026-12-31',
      currency: 'EUR',
      purchase_order_number: 'PO-12345',
      project_id: '760385',
      company_id: '1153449',
      responsible_id: '1065388',
      response_format: 'json',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.end_date).toBe('2026-12-31');
      expect(result.data.currency).toBe('EUR');
      expect(result.data.purchase_order_number).toBe('PO-12345');
      expect(result.data.project_id).toBe('760385');
      expect(result.data.company_id).toBe('1153449');
      expect(result.data.responsible_id).toBe('1065388');
      expect(result.data.response_format).toBe('json');
    }
  });

  it('accepts null end_date', () => {
    const result = CreateBudgetSchema.safeParse({
      name: 'Open-ended Budget',
      date: '2026-01-01',
      end_date: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.end_date).toBeNull();
    }
  });

  it('rejects missing name', () => {
    const result = CreateBudgetSchema.safeParse({ date: '2026-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = CreateBudgetSchema.safeParse({ name: '', date: '2026-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 200 characters', () => {
    const result = CreateBudgetSchema.safeParse({
      name: 'x'.repeat(201),
      date: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const result = CreateBudgetSchema.safeParse({ name: 'My Budget' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = CreateBudgetSchema.safeParse({
      name: 'My Budget',
      date: '01-01-2026', // wrong format
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    const result = CreateBudgetSchema.safeParse({
      name: 'My Budget',
      date: '2026-01-01',
      budget: true, // internal field — not user-facing
    });
    expect(result.success).toBe(false);
  });
});
