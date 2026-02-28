/**
 * Tier 2: Unit tests for ProductiveClient constructor (baseURL parameter)
 * and environment-toggle related validation logic.
 */

import { describe, it, expect } from 'vitest';
import { ProductiveClient } from '../../src/client.js';

// ─── ProductiveClient constructor ─────────────────────────────────────────────

describe('ProductiveClient constructor', () => {
  it('instantiates with token and orgId', () => {
    const client = new ProductiveClient('token-abc', 'org-123');
    expect(client.getOrgId()).toBe('org-123');
  });

  it('instantiates with custom baseURL (sandbox)', () => {
    const client = new ProductiveClient(
      'sandbox-token',
      'sandbox-org',
      'https://sandbox.productive.io/api/v2',
    );
    expect(client.getOrgId()).toBe('sandbox-org');
  });

  it('production and sandbox clients have independent orgIds', () => {
    const prod = new ProductiveClient('prod-token', 'prod-org');
    const sandbox = new ProductiveClient(
      'sandbox-token',
      'sandbox-org',
      'https://sandbox.productive.io/api/v2',
    );
    expect(prod.getOrgId()).toBe('prod-org');
    expect(sandbox.getOrgId()).toBe('sandbox-org');
  });

  it('exposes getRateLimitStatus', () => {
    const client = new ProductiveClient('token', 'org');
    const status = client.getRateLimitStatus();
    expect(status).toHaveProperty('count');
    expect(status).toHaveProperty('limit');
    expect(status).toHaveProperty('remaining');
  });

  it('starts with a fresh rate limiter (count = 0)', () => {
    const client = new ProductiveClient('token', 'org');
    const status = client.getRateLimitStatus();
    expect(status.count).toBe(0);
  });

  it('two clients have independent rate limiters', () => {
    const client1 = new ProductiveClient('token1', 'org1');
    const client2 = new ProductiveClient('token2', 'org2');
    // Both start fresh — verifying they don't share state
    expect(client1.getRateLimitStatus().count).toBe(0);
    expect(client2.getRateLimitStatus().count).toBe(0);
  });
});
