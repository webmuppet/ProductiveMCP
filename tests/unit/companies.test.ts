/**
 * Tier 2: Unit tests for company, lost reason, and contract tool handlers (mocked client)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  archiveCompany,
} from '../../src/tools/companies.js';
import { listLostReasons } from '../../src/tools/lost-reasons.js';
import {
  listContracts,
  getContract,
  createContract,
  updateContract,
  generateContract,
} from '../../src/tools/contracts.js';
import { createMockClient } from '../helpers/mock-client.js';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockCompanyAttributes(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Acme Inc',
    billing_name: null,
    vat: null,
    default_currency: 'USD',
    company_code: null,
    domain: 'acme.com',
    avatar_url: null,
    due_days: 30,
    tag_list: ['client'],
    contact: {
      emails: [{ email: 'info@acme.com' }],
      phones: [],
      websites: [],
    },
    custom_fields: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    archived_at: null,
    last_activity_at: null,
    ...overrides,
  };
}

function mockCompanyResponse(id = '100') {
  return {
    data: {
      type: 'companies',
      id,
      attributes: mockCompanyAttributes(),
      relationships: {},
    },
  };
}

function mockLostReasonAttributes(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Price',
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockContractAttributes(overrides: Record<string, unknown> = {}) {
  return {
    interval_id: 1,
    next_occurrence_on: '2026-04-01',
    ends_on: null,
    copy_purchase_order_number: false,
    copy_expenses: false,
    use_rollover_hours: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockContractResponse(id = '50') {
  return {
    data: {
      type: 'contracts',
      id,
      attributes: mockContractAttributes(),
      relationships: {
        template: { data: { type: 'deals', id: 'deal-1' } },
      },
    },
    included: [
      {
        type: 'deals',
        id: 'deal-1',
        attributes: { name: 'Retainer Template' },
        relationships: {},
      },
    ],
  };
}

// ─── listCompanies ────────────────────────────────────────────────────────────

describe('listCompanies', () => {
  it('calls GET /companies', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listCompanies(client, { limit: 20, offset: 0, response_format: 'markdown' });
    expect(client.get).toHaveBeenCalledWith('/companies', expect.any(Object));
  });

  it('sends filter[name] when name is provided', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listCompanies(client, { name: 'Acme', limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[name]']).toBe('Acme');
  });

  it('sends filter[archived]=false for status=active', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listCompanies(client, { status: 'active', limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[archived]']).toBe(false);
  });

  it('sends filter[archived]=true for status=archived', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listCompanies(client, { status: 'archived', limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[archived]']).toBe(true);
  });

  it('does NOT send filter[archived] when status is omitted', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listCompanies(client, { limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[archived]']).toBeUndefined();
  });

  it('sends sort param with sort_by and sort_order=asc', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listCompanies(client, { sort_by: 'name', sort_order: 'asc', limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['sort']).toBe('name');
  });

  it('sends descending sort with dash prefix for sort_order=desc', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listCompanies(client, { sort_by: 'created_at', sort_order: 'desc', limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['sort']).toBe('-created_at');
  });

  it('returns valid JSON when response_format=json', async () => {
    const client = createMockClient({ get: { data: [mockCompanyResponse().data], meta: { total_count: 1 } } });
    const result = await listCompanies(client, { limit: 20, offset: 0, response_format: 'json' });
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ─── getCompany ───────────────────────────────────────────────────────────────

describe('getCompany', () => {
  it('calls GET /companies/:id', async () => {
    const client = createMockClient({ get: mockCompanyResponse('100') });
    await getCompany(client, { company_id: '100', response_format: 'markdown' });
    expect(client.get).toHaveBeenCalledWith('/companies/100');
  });

  it('returns markdown with company name', async () => {
    const client = createMockClient({ get: mockCompanyResponse('100') });
    const result = await getCompany(client, { company_id: '100', response_format: 'markdown' });
    expect(result).toContain('Acme Inc');
  });

  it('flattens contact emails in JSON output', async () => {
    const client = createMockClient({ get: mockCompanyResponse('100') });
    const result = await getCompany(client, { company_id: '100', response_format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.emails).toEqual(['info@acme.com']);
  });

  it('builds url from domain', async () => {
    const client = createMockClient({ get: mockCompanyResponse('100') });
    const result = await getCompany(client, { company_id: '100', response_format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.url).toBe('https://acme.com');
  });
});

// ─── createCompany ────────────────────────────────────────────────────────────

describe('createCompany', () => {
  it('calls POST /companies', async () => {
    const client = createMockClient({ post: mockCompanyResponse('101') });
    await createCompany(client, { name: 'New Corp', response_format: 'markdown' });
    expect(client.post).toHaveBeenCalledWith('/companies', expect.objectContaining({
      data: expect.objectContaining({ type: 'companies' }),
    }));
  });

  it('sends name in attributes', async () => {
    const client = createMockClient({ post: mockCompanyResponse('101') });
    await createCompany(client, { name: 'New Corp', response_format: 'markdown' });
    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes.name).toBe('New Corp');
  });

  it('nests emails in contact object', async () => {
    const client = createMockClient({ post: mockCompanyResponse('101') });
    await createCompany(client, {
      name: 'New Corp',
      emails: ['hello@newcorp.com'],
      response_format: 'markdown',
    });
    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes.contact?.emails).toEqual([{ email: 'hello@newcorp.com' }]);
  });

  it('does NOT include contact object when no contact fields provided', async () => {
    const client = createMockClient({ post: mockCompanyResponse('101') });
    await createCompany(client, { name: 'New Corp', response_format: 'markdown' });
    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes.contact).toBeUndefined();
  });

  it('nests phones in contact object', async () => {
    const client = createMockClient({ post: mockCompanyResponse('101') });
    await createCompany(client, { name: 'Corp', phones: ['+1234567890'], response_format: 'markdown' });
    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes.contact?.phones).toEqual([{ phone: '+1234567890' }]);
  });
});

// ─── updateCompany ────────────────────────────────────────────────────────────

describe('updateCompany', () => {
  it('calls PATCH /companies/:id', async () => {
    const client = createMockClient({ patch: mockCompanyResponse('100') });
    await updateCompany(client, { company_id: '100', name: 'Updated Corp', response_format: 'markdown' });
    expect(client.patch).toHaveBeenCalledWith('/companies/100', expect.any(Object));
  });

  it('sends correct type and id in payload', async () => {
    const client = createMockClient({ patch: mockCompanyResponse('100') });
    await updateCompany(client, { company_id: '100', response_format: 'markdown' });
    const payload = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.type).toBe('companies');
    expect(payload.data.id).toBe('100');
  });

  it('updates nested contact emails', async () => {
    const client = createMockClient({ patch: mockCompanyResponse('100') });
    await updateCompany(client, { company_id: '100', emails: ['new@acme.com'], response_format: 'markdown' });
    const payload = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes?.contact?.emails).toEqual([{ email: 'new@acme.com' }]);
  });
});

// ─── archiveCompany ───────────────────────────────────────────────────────────

describe('archiveCompany', () => {
  it('calls PATCH /companies/:id/archive', async () => {
    const client = createMockClient({ patch: mockCompanyResponse('100') });
    await archiveCompany(client, { company_id: '100', response_format: 'markdown' });
    expect(client.patch).toHaveBeenCalledWith('/companies/100/archive', {});
  });

  it('returns confirmation message in markdown', async () => {
    const client = createMockClient({ patch: mockCompanyResponse('100') });
    const result = await archiveCompany(client, { company_id: '100', response_format: 'markdown' });
    expect(result).toContain('archived');
  });
});

// ─── listLostReasons ─────────────────────────────────────────────────────────

describe('listLostReasons', () => {
  it('calls GET /lost_reasons', async () => {
    const client = createMockClient({ get: { data: [] } });
    await listLostReasons(client, { response_format: 'markdown' });
    expect(client.get).toHaveBeenCalledWith('/lost_reasons');
  });

  it('filters out archived reasons by default', async () => {
    const client = createMockClient({
      get: {
        data: [
          {
            type: 'lost_reasons', id: '1',
            attributes: mockLostReasonAttributes({ name: 'Price', archived_at: null }),
            relationships: {},
          },
          {
            type: 'lost_reasons', id: '2',
            attributes: mockLostReasonAttributes({ name: 'Timing', archived_at: '2025-01-01T00:00:00Z' }),
            relationships: {},
          },
        ],
      },
    });
    const result = await listLostReasons(client, { response_format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Price');
  });

  it('includes archived reasons when include_archived=true', async () => {
    const client = createMockClient({
      get: {
        data: [
          {
            type: 'lost_reasons', id: '1',
            attributes: mockLostReasonAttributes({ archived_at: null }),
            relationships: {},
          },
          {
            type: 'lost_reasons', id: '2',
            attributes: mockLostReasonAttributes({ archived_at: '2025-01-01T00:00:00Z' }),
            relationships: {},
          },
        ],
      },
    });
    const result = await listLostReasons(client, { include_archived: true, response_format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
  });

  it('returns markdown output', async () => {
    const client = createMockClient({
      get: {
        data: [{
          type: 'lost_reasons', id: '1',
          attributes: mockLostReasonAttributes(),
          relationships: {},
        }],
      },
    });
    const result = await listLostReasons(client, { response_format: 'markdown' });
    expect(result).toContain('Price');
  });
});

// ─── listContracts ────────────────────────────────────────────────────────────

describe('listContracts', () => {
  it('calls GET /contracts with include=template', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listContracts(client, { limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params.include).toBe('template');
  });

  it('sends filter[contract_interval_id] for interval=monthly', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listContracts(client, { interval: 'monthly', limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[contract_interval_id]']).toBe(1);
  });

  it('sends filter[contract_interval_id]=6 for interval=quarterly', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listContracts(client, { interval: 'quarterly', limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[contract_interval_id]']).toBe(6);
  });

  it('does NOT send interval filter when omitted', async () => {
    const client = createMockClient({ get: { data: [], meta: { total_count: 0 } } });
    await listContracts(client, { limit: 20, offset: 0, response_format: 'markdown' });
    const params = (client.get as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(params['filter[contract_interval_id]']).toBeUndefined();
  });

  it('returns valid JSON', async () => {
    const client = createMockClient({ get: { data: [mockContractResponse().data], included: mockContractResponse().included, meta: { total_count: 1 } } });
    const result = await listContracts(client, { limit: 20, offset: 0, response_format: 'json' });
    expect(() => JSON.parse(result)).not.toThrow();
  });
});

// ─── getContract ─────────────────────────────────────────────────────────────

describe('getContract', () => {
  it('calls GET /contracts/:id with include=template', async () => {
    const client = createMockClient({ get: mockContractResponse() });
    await getContract(client, { contract_id: '50', response_format: 'markdown' });
    expect(client.get).toHaveBeenCalledWith('/contracts/50', { include: 'template' });
  });

  it('resolves template name from included', async () => {
    const client = createMockClient({ get: mockContractResponse() });
    const result = await getContract(client, { contract_id: '50', response_format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.template_name).toBe('Retainer Template');
    expect(parsed.template_id).toBe('deal-1');
  });

  it('maps interval_id=1 to monthly', async () => {
    const client = createMockClient({ get: mockContractResponse() });
    const result = await getContract(client, { contract_id: '50', response_format: 'json' });
    const parsed = JSON.parse(result);
    expect(parsed.interval).toBe('monthly');
  });
});

// ─── createContract ──────────────────────────────────────────────────────────

describe('createContract', () => {
  it('calls POST /contracts', async () => {
    const client = createMockClient({ post: mockContractResponse() });
    await createContract(client, {
      interval: 'monthly',
      template_id: 'deal-1',
      next_occurrence_on: '2026-04-01',
      response_format: 'markdown',
    });
    expect(client.post).toHaveBeenCalledWith('/contracts', expect.any(Object));
  });

  it('converts interval string to interval_id in payload', async () => {
    const client = createMockClient({ post: mockContractResponse() });
    await createContract(client, {
      interval: 'quarterly',
      template_id: 'deal-1',
      next_occurrence_on: '2026-04-01',
      response_format: 'markdown',
    });
    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes.interval_id).toBe(6);
  });

  it('sets template relationship with type=deals', async () => {
    const client = createMockClient({ post: mockContractResponse() });
    await createContract(client, {
      interval: 'monthly',
      template_id: 'deal-99',
      next_occurrence_on: '2026-04-01',
      response_format: 'markdown',
    });
    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.relationships.template.data).toEqual({
      type: 'deals',
      id: 'deal-99',
    });
  });
});

// ─── updateContract ──────────────────────────────────────────────────────────

describe('updateContract', () => {
  it('calls PATCH /contracts/:id', async () => {
    const client = createMockClient({ patch: mockContractResponse() });
    await updateContract(client, { contract_id: '50', response_format: 'markdown' });
    expect(client.patch).toHaveBeenCalledWith('/contracts/50', expect.any(Object));
  });

  it('converts interval string to interval_id when provided', async () => {
    const client = createMockClient({ patch: mockContractResponse() });
    await updateContract(client, { contract_id: '50', interval: 'annual', response_format: 'markdown' });
    const payload = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes?.interval_id).toBe(4);
  });

  it('allows setting ends_on to null', async () => {
    const client = createMockClient({ patch: mockContractResponse() });
    await updateContract(client, { contract_id: '50', ends_on: null, response_format: 'markdown' });
    const payload = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(payload.data.attributes?.ends_on).toBeNull();
  });
});

// ─── generateContract ────────────────────────────────────────────────────────

describe('generateContract', () => {
  it('calls POST /contracts/:id/generate', async () => {
    const client = createMockClient({ post: mockContractResponse() });
    await generateContract(client, { contract_id: '50', response_format: 'markdown' });
    expect(client.post).toHaveBeenCalledWith('/contracts/50/generate', {});
  });

  it('returns confirmation message', async () => {
    const client = createMockClient({ post: mockContractResponse() });
    const result = await generateContract(client, { contract_id: '50', response_format: 'markdown' });
    expect(result).toContain('Generated');
  });
});
