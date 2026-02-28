/**
 * Tier 1: Schema tests for company, lost reason, and contract Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  ListCompaniesSchema,
  GetCompanySchema,
  CreateCompanySchema,
  UpdateCompanySchema,
  ArchiveCompanySchema,
} from '../../src/schemas/company.js';
import { ListLostReasonsSchema } from '../../src/schemas/lost-reason.js';
import {
  ListContractsSchema,
  GetContractSchema,
  CreateContractSchema,
  UpdateContractSchema,
  GenerateContractSchema,
  CONTRACT_INTERVAL_IDS,
} from '../../src/schemas/contract.js';

// ─── CONTRACT_INTERVAL_IDS ────────────────────────────────────────────────────

describe('CONTRACT_INTERVAL_IDS', () => {
  it('maps monthly to 1', () => expect(CONTRACT_INTERVAL_IDS.monthly).toBe(1));
  it('maps bi-weekly to 2', () => expect(CONTRACT_INTERVAL_IDS['bi-weekly']).toBe(2));
  it('maps weekly to 3', () => expect(CONTRACT_INTERVAL_IDS.weekly).toBe(3));
  it('maps annual to 4', () => expect(CONTRACT_INTERVAL_IDS.annual).toBe(4));
  it('maps semi-annual to 5', () => expect(CONTRACT_INTERVAL_IDS['semi-annual']).toBe(5));
  it('maps quarterly to 6', () => expect(CONTRACT_INTERVAL_IDS.quarterly).toBe(6));
});

// ─── ListCompaniesSchema ──────────────────────────────────────────────────────

describe('ListCompaniesSchema', () => {
  it('accepts empty input (all defaults)', () => {
    expect(ListCompaniesSchema.safeParse({}).success).toBe(true);
  });

  it('applies default limit=20', () => {
    expect(ListCompaniesSchema.parse({}).limit).toBe(20);
  });

  it('applies default offset=0', () => {
    expect(ListCompaniesSchema.parse({}).offset).toBe(0);
  });

  it('applies default response_format=markdown', () => {
    expect(ListCompaniesSchema.parse({}).response_format).toBe('markdown');
  });

  it('accepts name filter', () => {
    expect(ListCompaniesSchema.parse({ name: 'Acme' }).name).toBe('Acme');
  });

  it('accepts status=active', () => {
    expect(ListCompaniesSchema.parse({ status: 'active' }).status).toBe('active');
  });

  it('accepts status=archived', () => {
    expect(ListCompaniesSchema.parse({ status: 'archived' }).status).toBe('archived');
  });

  it('rejects invalid status', () => {
    expect(ListCompaniesSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('accepts sort_by=name', () => {
    expect(ListCompaniesSchema.parse({ sort_by: 'name' }).sort_by).toBe('name');
  });

  it('accepts sort_by=created_at', () => {
    expect(ListCompaniesSchema.parse({ sort_by: 'created_at' }).sort_by).toBe('created_at');
  });

  it('accepts sort_by=last_activity_at', () => {
    expect(ListCompaniesSchema.parse({ sort_by: 'last_activity_at' }).sort_by).toBe('last_activity_at');
  });

  it('rejects invalid sort_by', () => {
    expect(ListCompaniesSchema.safeParse({ sort_by: 'updated_at' }).success).toBe(false);
  });

  it('accepts sort_order=asc', () => {
    expect(ListCompaniesSchema.parse({ sort_order: 'asc' }).sort_order).toBe('asc');
  });

  it('accepts sort_order=desc', () => {
    expect(ListCompaniesSchema.parse({ sort_order: 'desc' }).sort_order).toBe('desc');
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(ListCompaniesSchema.safeParse({ unknown: true }).success).toBe(false);
  });
});

// ─── GetCompanySchema ─────────────────────────────────────────────────────────

describe('GetCompanySchema', () => {
  it('accepts valid company_id', () => {
    expect(GetCompanySchema.parse({ company_id: '42' }).company_id).toBe('42');
  });

  it('rejects missing company_id', () => {
    expect(GetCompanySchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty string company_id', () => {
    expect(GetCompanySchema.safeParse({ company_id: '' }).success).toBe(false);
  });

  it('applies default response_format=markdown', () => {
    expect(GetCompanySchema.parse({ company_id: '42' }).response_format).toBe('markdown');
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(GetCompanySchema.safeParse({ company_id: '42', extra: true }).success).toBe(false);
  });
});

// ─── CreateCompanySchema ──────────────────────────────────────────────────────

describe('CreateCompanySchema', () => {
  it('accepts name only (all others optional)', () => {
    expect(CreateCompanySchema.parse({ name: 'Acme Inc' }).name).toBe('Acme Inc');
  });

  it('rejects missing name', () => {
    expect(CreateCompanySchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty name', () => {
    expect(CreateCompanySchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    expect(CreateCompanySchema.safeParse({ name: 'a'.repeat(201) }).success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = CreateCompanySchema.parse({
      name: 'Acme',
      billing_name: 'Acme Billing Ltd',
      vat: 'GB123456789',
      default_currency: 'GBP',
      company_code: 'ACM',
      domain: 'acme.com',
      due_days: 30,
      tag_list: ['client', 'enterprise'],
      emails: ['contact@acme.com'],
      phones: ['+441234567890'],
      websites: ['https://acme.com'],
    });
    expect(result.billing_name).toBe('Acme Billing Ltd');
    expect(result.tag_list).toEqual(['client', 'enterprise']);
    expect(result.emails).toEqual(['contact@acme.com']);
  });

  it('rejects invalid email in emails array', () => {
    expect(CreateCompanySchema.safeParse({
      name: 'Acme',
      emails: ['not-an-email'],
    }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(CreateCompanySchema.safeParse({ name: 'Acme', unknown: true }).success).toBe(false);
  });
});

// ─── UpdateCompanySchema ──────────────────────────────────────────────────────

describe('UpdateCompanySchema', () => {
  it('accepts company_id only (all updates optional)', () => {
    expect(UpdateCompanySchema.parse({ company_id: '42' }).company_id).toBe('42');
  });

  it('rejects missing company_id', () => {
    expect(UpdateCompanySchema.safeParse({}).success).toBe(false);
  });

  it('accepts name update', () => {
    expect(UpdateCompanySchema.parse({ company_id: '42', name: 'New Name' }).name).toBe('New Name');
  });

  it('rejects empty name', () => {
    expect(UpdateCompanySchema.safeParse({ company_id: '42', name: '' }).success).toBe(false);
  });

  it('accepts tag_list as array', () => {
    const result = UpdateCompanySchema.parse({ company_id: '42', tag_list: ['tag1'] });
    expect(result.tag_list).toEqual(['tag1']);
  });

  it('rejects invalid email in emails array', () => {
    expect(UpdateCompanySchema.safeParse({
      company_id: '42',
      emails: ['bad'],
    }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(UpdateCompanySchema.safeParse({ company_id: '42', unknown: true }).success).toBe(false);
  });
});

// ─── ArchiveCompanySchema ─────────────────────────────────────────────────────

describe('ArchiveCompanySchema', () => {
  it('accepts valid company_id', () => {
    expect(ArchiveCompanySchema.parse({ company_id: '42' }).company_id).toBe('42');
  });

  it('rejects missing company_id', () => {
    expect(ArchiveCompanySchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty company_id', () => {
    expect(ArchiveCompanySchema.safeParse({ company_id: '' }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(ArchiveCompanySchema.safeParse({ company_id: '42', extra: true }).success).toBe(false);
  });
});

// ─── ListLostReasonsSchema ────────────────────────────────────────────────────

describe('ListLostReasonsSchema', () => {
  it('accepts empty input (all defaults)', () => {
    expect(ListLostReasonsSchema.safeParse({}).success).toBe(true);
  });

  it('applies default response_format=markdown', () => {
    expect(ListLostReasonsSchema.parse({}).response_format).toBe('markdown');
  });

  it('include_archived defaults to undefined (treated as false)', () => {
    expect(ListLostReasonsSchema.parse({}).include_archived).toBeUndefined();
  });

  it('accepts include_archived=true', () => {
    expect(ListLostReasonsSchema.parse({ include_archived: true }).include_archived).toBe(true);
  });

  it('accepts include_archived=false', () => {
    expect(ListLostReasonsSchema.parse({ include_archived: false }).include_archived).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(ListLostReasonsSchema.safeParse({ unknown: true }).success).toBe(false);
  });
});

// ─── ListContractsSchema ──────────────────────────────────────────────────────

describe('ListContractsSchema', () => {
  it('accepts empty input (all defaults)', () => {
    expect(ListContractsSchema.safeParse({}).success).toBe(true);
  });

  it('applies default limit=20', () => {
    expect(ListContractsSchema.parse({}).limit).toBe(20);
  });

  it('interval is optional', () => {
    expect(ListContractsSchema.parse({}).interval).toBeUndefined();
  });

  it('accepts all interval values', () => {
    const intervals = ['monthly', 'bi-weekly', 'weekly', 'annual', 'semi-annual', 'quarterly'] as const;
    for (const interval of intervals) {
      expect(ListContractsSchema.parse({ interval }).interval).toBe(interval);
    }
  });

  it('rejects invalid interval', () => {
    expect(ListContractsSchema.safeParse({ interval: 'daily' }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(ListContractsSchema.safeParse({ unknown: true }).success).toBe(false);
  });
});

// ─── GetContractSchema ────────────────────────────────────────────────────────

describe('GetContractSchema', () => {
  it('accepts valid contract_id', () => {
    expect(GetContractSchema.parse({ contract_id: '99' }).contract_id).toBe('99');
  });

  it('rejects missing contract_id', () => {
    expect(GetContractSchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty contract_id', () => {
    expect(GetContractSchema.safeParse({ contract_id: '' }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(GetContractSchema.safeParse({ contract_id: '99', extra: true }).success).toBe(false);
  });
});

// ─── CreateContractSchema ─────────────────────────────────────────────────────

describe('CreateContractSchema', () => {
  const validBase = {
    interval: 'monthly' as const,
    template_id: 'deal-123',
    next_occurrence_on: '2026-04-01',
  };

  it('accepts valid required fields', () => {
    const result = CreateContractSchema.parse(validBase);
    expect(result.interval).toBe('monthly');
    expect(result.template_id).toBe('deal-123');
    expect(result.next_occurrence_on).toBe('2026-04-01');
  });

  it('rejects missing interval', () => {
    const { interval: _, ...rest } = validBase;
    expect(CreateContractSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing template_id', () => {
    const { template_id: _, ...rest } = validBase;
    expect(CreateContractSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing next_occurrence_on', () => {
    const { next_occurrence_on: _, ...rest } = validBase;
    expect(CreateContractSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid date format', () => {
    expect(CreateContractSchema.safeParse({
      ...validBase,
      next_occurrence_on: '01/04/2026',
    }).success).toBe(false);
  });

  it('accepts ends_on date', () => {
    const result = CreateContractSchema.parse({ ...validBase, ends_on: '2027-12-31' });
    expect(result.ends_on).toBe('2027-12-31');
  });

  it('accepts boolean flags', () => {
    const result = CreateContractSchema.parse({
      ...validBase,
      copy_expenses: true,
      use_rollover_hours: false,
      copy_purchase_order_number: true,
    });
    expect(result.copy_expenses).toBe(true);
    expect(result.use_rollover_hours).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(CreateContractSchema.safeParse({ ...validBase, extra: true }).success).toBe(false);
  });
});

// ─── UpdateContractSchema ─────────────────────────────────────────────────────

describe('UpdateContractSchema', () => {
  it('accepts contract_id only (all updates optional)', () => {
    expect(UpdateContractSchema.parse({ contract_id: '99' }).contract_id).toBe('99');
  });

  it('rejects missing contract_id', () => {
    expect(UpdateContractSchema.safeParse({}).success).toBe(false);
  });

  it('accepts ends_on as null (to clear end date)', () => {
    const result = UpdateContractSchema.parse({ contract_id: '99', ends_on: null });
    expect(result.ends_on).toBeNull();
  });

  it('accepts ends_on as date string', () => {
    const result = UpdateContractSchema.parse({ contract_id: '99', ends_on: '2027-06-30' });
    expect(result.ends_on).toBe('2027-06-30');
  });

  it('rejects invalid ends_on format', () => {
    expect(UpdateContractSchema.safeParse({ contract_id: '99', ends_on: 'not-a-date' }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(UpdateContractSchema.safeParse({ contract_id: '99', unknown: true }).success).toBe(false);
  });
});

// ─── GenerateContractSchema ───────────────────────────────────────────────────

describe('GenerateContractSchema', () => {
  it('accepts valid contract_id', () => {
    expect(GenerateContractSchema.parse({ contract_id: '99' }).contract_id).toBe('99');
  });

  it('rejects missing contract_id', () => {
    expect(GenerateContractSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(GenerateContractSchema.safeParse({ contract_id: '99', extra: true }).success).toBe(false);
  });
});
