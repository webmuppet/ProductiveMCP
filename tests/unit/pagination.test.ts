/**
 * Tier 2: Unit tests for formatPaginationFooter()
 *
 * Tests edge cases for the pagination footer utility:
 * - Single page (no footer)
 * - First page of many
 * - Middle page
 * - Last page (no "next page" hint)
 * - Null totals (no footer)
 * - Exact fit (no footer when total <= limit)
 */

import { describe, it, expect } from 'vitest';
import { formatPaginationFooter } from '../../src/utils/formatting.js';

describe('formatPaginationFooter', () => {
  it('returns empty string when total_count is null', () => {
    expect(formatPaginationFooter({
      offset: 0,
      limit: 20,
      total_count: null,
      total_pages: null,
      current_page: 1,
    })).toBe('');
  });

  it('returns empty string when total fits on one page (offset=0, total <= limit)', () => {
    expect(formatPaginationFooter({
      offset: 0,
      limit: 20,
      total_count: 15,
      total_pages: 1,
      current_page: 1,
    })).toBe('');
  });

  it('returns empty string when total exactly equals limit', () => {
    expect(formatPaginationFooter({
      offset: 0,
      limit: 20,
      total_count: 20,
      total_pages: 1,
      current_page: 1,
    })).toBe('');
  });

  it('shows footer for first page of multi-page results', () => {
    const footer = formatPaginationFooter({
      offset: 0,
      limit: 10,
      total_count: 35,
      total_pages: 4,
      current_page: 1,
    });
    expect(footer).toContain('Showing 1–10 of 35 results');
    expect(footer).toContain('Page 1 of 4');
    expect(footer).toContain('offset=10');
  });

  it('shows footer for middle page', () => {
    const footer = formatPaginationFooter({
      offset: 20,
      limit: 10,
      total_count: 35,
      total_pages: 4,
      current_page: 3,
    });
    expect(footer).toContain('Showing 21–30 of 35 results');
    expect(footer).toContain('Page 3 of 4');
    expect(footer).toContain('offset=30');
  });

  it('shows footer for last page without next-page hint', () => {
    const footer = formatPaginationFooter({
      offset: 30,
      limit: 10,
      total_count: 35,
      total_pages: 4,
      current_page: 4,
    });
    expect(footer).toContain('Showing 31–35 of 35 results');
    expect(footer).toContain('Page 4 of 4');
    expect(footer).not.toContain('offset=');
  });

  it('uses correct showing_end when last page has fewer items than limit', () => {
    const footer = formatPaginationFooter({
      offset: 30,
      limit: 20,
      total_count: 35,
      total_pages: 2,
      current_page: 2,
    });
    expect(footer).toContain('Showing 31–35 of 35 results');
  });

  it('does not show page X of Y when total_pages is 1', () => {
    const footer = formatPaginationFooter({
      offset: 0,
      limit: 20,
      total_count: 25,
      total_pages: 2,
      current_page: 1,
    });
    expect(footer).toContain('Page 1 of 2');
  });

  it('starts with separator line (---)', () => {
    const footer = formatPaginationFooter({
      offset: 0,
      limit: 10,
      total_count: 50,
      total_pages: 5,
      current_page: 1,
    });
    expect(footer.startsWith('---')).toBe(true);
  });

  it('handles total_pages=null gracefully (shows count but not page X of Y)', () => {
    const footer = formatPaginationFooter({
      offset: 0,
      limit: 10,
      total_count: 50,
      total_pages: null,
      current_page: 1,
    });
    expect(footer).toContain('Showing 1–10 of 50 results');
    expect(footer).not.toContain('Page');
  });

  it('shows next offset correctly for varied page sizes', () => {
    const footer = formatPaginationFooter({
      offset: 0,
      limit: 5,
      total_count: 30,
      total_pages: 6,
      current_page: 1,
    });
    expect(footer).toContain('offset=5');
  });

  it('shows showing_start=1 when offset=0', () => {
    const footer = formatPaginationFooter({
      offset: 0,
      limit: 20,
      total_count: 100,
      total_pages: 5,
      current_page: 1,
    });
    expect(footer).toContain('Showing 1–20');
  });

  it('shows correct range for large offset', () => {
    const footer = formatPaginationFooter({
      offset: 80,
      limit: 20,
      total_count: 100,
      total_pages: 5,
      current_page: 5,
    });
    expect(footer).toContain('Showing 81–100 of 100 results');
    expect(footer).not.toContain('offset=');
  });
});
