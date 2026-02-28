/**
 * Company MCP tools
 */

import { z } from "zod";
import type { ProductiveClient } from "../client.js";
import type {
  JSONAPIResponse,
  Company,
  FormattedCompany,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from "../types.js";
import {
  formatCompany,
  formatCompanyListMarkdown,
  formatSingleCompanyMarkdown,
  formatResponse,
  truncateResponse,
} from "../utils/formatting.js";
import {
  ListCompaniesSchema,
  GetCompanySchema,
  CreateCompanySchema,
  UpdateCompanySchema,
  ArchiveCompanySchema,
} from "../schemas/company.js";

const COMPANY_SORT_MAP: Record<string, string> = {
  name: "name",
  created_at: "created_at",
  last_activity_at: "last_activity_at",
};

/**
 * List companies with optional filters and search.
 */
export async function listCompanies(
  client: ProductiveClient,
  args: z.infer<typeof ListCompaniesSchema>,
): Promise<string> {
  const pageNumber = Math.floor(args.offset / args.limit) + 1;

  const params: Record<string, unknown> = {
    "page[number]": pageNumber,
    "page[size]": args.limit,
  };

  if (args.name) params["filter[name]"] = args.name;

  if (args.status === "archived") {
    params["filter[archived]"] = true;
  } else if (args.status === "active") {
    params["filter[archived]"] = false;
  }

  if (args.tags) params["filter[tag_list]"] = args.tags;
  if (args.default_currency) params["filter[default_currency]"] = args.default_currency;

  if (args.sort_by) {
    const field = COMPANY_SORT_MAP[args.sort_by] ?? "name";
    const direction = args.sort_order === "desc" ? `-${field}` : field;
    params["sort"] = direction;
  }

  const response = await client.get<JSONAPIResponse>("/companies", params);

  const companies = (
    Array.isArray(response.data) ? response.data : [response.data]
  ).map((c) => formatCompany(c as Company));

  const total = response.meta?.total_count;

  const result = formatResponse(companies, args.response_format, () =>
    formatCompanyListMarkdown(companies, total),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Get a single company by ID.
 */
export async function getCompany(
  client: ProductiveClient,
  args: z.infer<typeof GetCompanySchema>,
): Promise<string> {
  const response = await client.get<JSONAPIResponse>(
    `/companies/${args.company_id}`,
  );

  const companyData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const company: FormattedCompany = formatCompany(companyData as Company);

  const result = formatResponse(
    company,
    args.response_format,
    () => formatSingleCompanyMarkdown(company),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Create a new company.
 */
export async function createCompany(
  client: ProductiveClient,
  args: z.infer<typeof CreateCompanySchema>,
): Promise<string> {
  const attributes: CreateCompanyPayload["data"]["attributes"] = {
    name: args.name,
  };

  if (args.billing_name !== undefined) attributes.billing_name = args.billing_name;
  if (args.vat !== undefined) attributes.vat = args.vat;
  if (args.default_currency !== undefined) attributes.default_currency = args.default_currency;
  if (args.company_code !== undefined) attributes.company_code = args.company_code;
  if (args.domain !== undefined) attributes.domain = args.domain;
  if (args.due_days !== undefined) attributes.due_days = args.due_days;
  if (args.tag_list !== undefined) attributes.tag_list = args.tag_list;

  // Build nested contact object from flat arrays
  const hasContact =
    (args.emails && args.emails.length > 0) ||
    (args.phones && args.phones.length > 0) ||
    (args.websites && args.websites.length > 0);

  if (hasContact) {
    attributes.contact = {};
    if (args.emails?.length) {
      attributes.contact.emails = args.emails.map((email) => ({ email }));
    }
    if (args.phones?.length) {
      attributes.contact.phones = args.phones.map((phone) => ({ phone }));
    }
    if (args.websites?.length) {
      attributes.contact.websites = args.websites.map((website) => ({ website }));
    }
  }

  const payload: CreateCompanyPayload = {
    data: { type: "companies", attributes },
  };

  const response = await client.post<JSONAPIResponse>("/companies", payload);

  const companyData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const company: FormattedCompany = formatCompany(companyData as Company);

  const result = formatResponse(
    company,
    args.response_format,
    () => formatSingleCompanyMarkdown(company),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Update a company's details.
 */
export async function updateCompany(
  client: ProductiveClient,
  args: z.infer<typeof UpdateCompanySchema>,
): Promise<string> {
  const attributes: UpdateCompanyPayload["data"]["attributes"] = {};

  if (args.name !== undefined) attributes!.name = args.name;
  if (args.billing_name !== undefined) attributes!.billing_name = args.billing_name;
  if (args.vat !== undefined) attributes!.vat = args.vat;
  if (args.default_currency !== undefined) attributes!.default_currency = args.default_currency;
  if (args.company_code !== undefined) attributes!.company_code = args.company_code;
  if (args.domain !== undefined) attributes!.domain = args.domain;
  if (args.due_days !== undefined) attributes!.due_days = args.due_days;
  if (args.tag_list !== undefined) attributes!.tag_list = args.tag_list;

  const hasContact =
    args.emails !== undefined ||
    args.phones !== undefined ||
    args.websites !== undefined;

  if (hasContact) {
    attributes!.contact = {};
    if (args.emails !== undefined) {
      attributes!.contact!.emails = args.emails.map((email) => ({ email }));
    }
    if (args.phones !== undefined) {
      attributes!.contact!.phones = args.phones.map((phone) => ({ phone }));
    }
    if (args.websites !== undefined) {
      attributes!.contact!.websites = args.websites.map((website) => ({
        website,
      }));
    }
  }

  const payload: UpdateCompanyPayload = {
    data: { type: "companies", id: args.company_id, attributes },
  };

  const response = await client.patch<JSONAPIResponse>(
    `/companies/${args.company_id}`,
    payload,
  );

  const companyData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const company: FormattedCompany = formatCompany(companyData as Company);

  const result = formatResponse(
    company,
    args.response_format,
    () => formatSingleCompanyMarkdown(company),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Archive a company (soft delete).
 */
export async function archiveCompany(
  client: ProductiveClient,
  args: z.infer<typeof ArchiveCompanySchema>,
): Promise<string> {
  const response = await client.patch<JSONAPIResponse>(
    `/companies/${args.company_id}/archive`,
    {},
  );

  const companyData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const company: FormattedCompany = formatCompany(companyData as Company);

  const result = formatResponse(
    company,
    args.response_format,
    () =>
      `# Company Archived\n\n**${company.name}** (ID: \`${company.id}\`) has been archived.`,
  );

  return truncateResponse(result, args.response_format);
}
