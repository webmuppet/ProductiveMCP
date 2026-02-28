/**
 * Company Zod schemas
 */

import { z } from "zod";
import { ResponseFormatSchema, LimitSchema, OffsetSchema } from "./common.js";

export const ListCompaniesSchema = z
  .object({
    name: z.string().optional(),
    status: z.enum(["active", "archived"]).optional(),
    tags: z.string().optional(),
    default_currency: z.string().optional(),
    limit: LimitSchema,
    offset: OffsetSchema,
    sort_by: z
      .enum(["name", "created_at", "last_activity_at"])
      .optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetCompanySchema = z
  .object({
    company_id: z.string().min(1, "Company ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateCompanySchema = z
  .object({
    name: z.string().min(1, "Company name is required").max(200),
    billing_name: z.string().optional(),
    vat: z.string().optional(),
    default_currency: z.string().optional(),
    company_code: z.string().optional(),
    domain: z.string().optional(),
    due_days: z.number().int().optional(),
    tag_list: z.array(z.string()).optional(),
    emails: z.array(z.string().email()).optional(),
    phones: z.array(z.string()).optional(),
    websites: z.array(z.string()).optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateCompanySchema = z
  .object({
    company_id: z.string().min(1, "Company ID is required"),
    name: z.string().min(1).max(200).optional(),
    billing_name: z.string().optional(),
    vat: z.string().optional(),
    default_currency: z.string().optional(),
    company_code: z.string().optional(),
    domain: z.string().optional(),
    due_days: z.number().int().optional(),
    tag_list: z.array(z.string()).optional(),
    emails: z.array(z.string().email()).optional(),
    phones: z.array(z.string()).optional(),
    websites: z.array(z.string()).optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ArchiveCompanySchema = z
  .object({
    company_id: z.string().min(1, "Company ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();
