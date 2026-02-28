/**
 * Tier 1: Schema tests for common validators
 */

import { describe, it, expect } from 'vitest';
import {
  ResponseFormatSchema,
  LimitSchema,
  OffsetSchema,
  ISO8601DateSchema,
  OptionalISO8601DateSchema,
} from '../../src/schemas/common.js';

describe('ResponseFormatSchema', () => {
  it('accepts "markdown"', () => {
    expect(ResponseFormatSchema.safeParse('markdown').success).toBe(true);
  });

  it('accepts "json"', () => {
    expect(ResponseFormatSchema.safeParse('json').success).toBe(true);
  });

  it('defaults to "markdown" when undefined', () => {
    const result = ResponseFormatSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('markdown');
  });

  it('rejects unknown formats', () => {
    expect(ResponseFormatSchema.safeParse('html').success).toBe(false);
    expect(ResponseFormatSchema.safeParse('xml').success).toBe(false);
    expect(ResponseFormatSchema.safeParse('').success).toBe(false);
  });
});

describe('LimitSchema', () => {
  it('accepts valid integers', () => {
    expect(LimitSchema.safeParse(20).success).toBe(true);
    expect(LimitSchema.safeParse(1).success).toBe(true);
    expect(LimitSchema.safeParse(100).success).toBe(true);
  });

  it('defaults to 20 when undefined', () => {
    const result = LimitSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(20);
  });

  it('coerces numeric strings', () => {
    const result = LimitSchema.safeParse('50');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(50);
  });

  it('rejects values below minimum (1)', () => {
    expect(LimitSchema.safeParse(0).success).toBe(false);
    expect(LimitSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects values above maximum (100)', () => {
    expect(LimitSchema.safeParse(101).success).toBe(false);
    expect(LimitSchema.safeParse(1000).success).toBe(false);
  });

  it('rejects non-integer floats', () => {
    expect(LimitSchema.safeParse(10.5).success).toBe(false);
  });

  it('rejects non-numeric strings', () => {
    expect(LimitSchema.safeParse('abc').success).toBe(false);
  });
});

describe('OffsetSchema', () => {
  it('accepts valid zero and positive integers', () => {
    expect(OffsetSchema.safeParse(0).success).toBe(true);
    expect(OffsetSchema.safeParse(100).success).toBe(true);
    expect(OffsetSchema.safeParse(1000).success).toBe(true);
  });

  it('defaults to 0 when undefined', () => {
    const result = OffsetSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(0);
  });

  it('coerces numeric strings', () => {
    const result = OffsetSchema.safeParse('40');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(40);
  });

  it('rejects negative values', () => {
    expect(OffsetSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects non-numeric strings', () => {
    expect(OffsetSchema.safeParse('abc').success).toBe(false);
  });
});

describe('ISO8601DateSchema', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(ISO8601DateSchema.safeParse('2026-01-15').success).toBe(true);
    expect(ISO8601DateSchema.safeParse('2000-12-31').success).toBe(true);
  });

  it('rejects dates with time components', () => {
    expect(ISO8601DateSchema.safeParse('2026-01-15T10:00:00Z').success).toBe(false);
  });

  it('rejects wrong separator formats', () => {
    expect(ISO8601DateSchema.safeParse('2026/01/15').success).toBe(false);
    expect(ISO8601DateSchema.safeParse('15-01-2026').success).toBe(false);
  });

  it('rejects partial dates', () => {
    expect(ISO8601DateSchema.safeParse('2026-01').success).toBe(false);
    expect(ISO8601DateSchema.safeParse('2026').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(ISO8601DateSchema.safeParse('').success).toBe(false);
  });
});

describe('OptionalISO8601DateSchema', () => {
  it('accepts a valid date string', () => {
    const result = OptionalISO8601DateSchema.safeParse('2026-03-01');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('2026-03-01');
  });

  it('accepts null (to clear a date field)', () => {
    const result = OptionalISO8601DateSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it('accepts undefined (field omitted)', () => {
    const result = OptionalISO8601DateSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it('rejects invalid date formats', () => {
    expect(OptionalISO8601DateSchema.safeParse('not-a-date').success).toBe(false);
    expect(OptionalISO8601DateSchema.safeParse('2026/01/15').success).toBe(false);
  });
});
