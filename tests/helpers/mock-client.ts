/**
 * Reusable mock ProductiveClient for unit tests.
 * Each method is a vi.fn() so tests can spy on calls and override return values.
 */

import { vi } from 'vitest';
import type { ProductiveClient } from '../../src/client.js';

export function createMockClient(
  overrides: Partial<Record<'get' | 'post' | 'patch' | 'delete', unknown>> = {},
): ProductiveClient {
  return {
    get: vi.fn().mockResolvedValue(overrides.get ?? { data: [] }),
    post: vi.fn().mockResolvedValue(overrides.post ?? { data: {} }),
    patch: vi.fn().mockResolvedValue(overrides.patch ?? { data: {} }),
    delete: vi.fn().mockResolvedValue(overrides.delete ?? undefined),
    getOrgId: vi.fn().mockReturnValue('test-org-123'),
    getRateLimitStatus: vi.fn().mockReturnValue({ count: 0, limit: 100, remaining: 100 }),
  } as unknown as ProductiveClient;
}

/**
 * Minimal mock page attributes — satisfies formatPage() requirements.
 */
export function mockPageAttributes(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Page',
    body: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    edited_at: null,
    parent_page_id: null,
    root_page_id: null,
    public_access: false,
    public_uuid: null,
    version_number: null,
    ...overrides,
  };
}

/**
 * Build a mock JSON:API page response object.
 */
export function mockPageResponse(id = '999', attrOverrides: Record<string, unknown> = {}) {
  return {
    data: {
      type: 'pages',
      id,
      attributes: mockPageAttributes(attrOverrides),
      relationships: {},
    },
  };
}
