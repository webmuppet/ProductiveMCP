/**
 * Deal-related Zod schemas
 * Deals are sales opportunities (filter[type]=1 on the /deals endpoint).
 */

import { z } from "zod";
import {
  ResponseFormatSchema,
  LimitSchema,
  OffsetSchema,
  ISO8601DateSchema,
} from "./common.js";

/**
 * Valid sort fields for deals
 */
export const DEAL_SORT_FIELDS = [
  "name",
  "date",
  "end_date",
  "revenue",
  "probability",
  "company.name",
  "responsible.name",
  "deal_status",
  "created_at",
  "last_activity_at",
] as const;

/**
 * Stage status API value map
 */
export const STAGE_STATUS_VALUES: Record<string, number> = {
  open: 1,
  won: 2,
  lost: 3,
};

/**
 * Schema for listing deals (with optional pipeline summary mode)
 */
export const ListDealsSchema = z
  .object({
    company_id: z.string().optional(),
    responsible_id: z.string().optional(),
    pipeline_id: z.string().optional(),
    stage_status: z.enum(["open", "won", "lost"]).optional(),
    deal_status_id: z.string().optional(),
    query: z.string().optional(),
    summary: z.boolean().default(false),
    limit: LimitSchema,
    offset: OffsetSchema,
    sort_by: z.enum(DEAL_SORT_FIELDS).optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for getting a single deal
 */
export const GetDealSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for creating a deal
 */
export const CreateDealSchema = z
  .object({
    name: z
      .string()
      .min(1, "Deal name is required")
      .max(200, "Name must be 200 characters or less"),
    date: ISO8601DateSchema,
    deal_status_id: z.string().min(1, "Deal status ID is required"),
    end_date: z.union([ISO8601DateSchema, z.null()]).optional(),
    probability: z.number().int().min(0).max(100).optional(),
    currency: z.string().optional(),
    purchase_order_number: z.string().optional(),
    company_id: z.string().optional(),
    responsible_id: z.string().optional(),
    pipeline_id: z.string().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for updating a deal
 */
export const UpdateDealSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    name: z
      .string()
      .min(1)
      .max(200, "Name must be 200 characters or less")
      .optional(),
    date: ISO8601DateSchema.optional(),
    end_date: z.union([ISO8601DateSchema, z.null()]).optional(),
    probability: z.number().int().min(0).max(100).optional(),
    purchase_order_number: z.union([z.string(), z.null()]).optional(),
    deal_status_id: z.string().optional(),
    company_id: z.string().optional(),
    responsible_id: z.string().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for closing a deal (won or lost)
 * Note: lost_reason_id is optional but strongly recommended when outcome is "lost".
 */
export const CloseDealSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    outcome: z.enum(["won", "lost"]),
    deal_status_id: z
      .string()
      .min(1, "Deal status ID is required (the Won or Lost stage ID)"),
    lost_reason_id: z.string().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for copying a deal
 */
export const CopyDealSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for generating a budget from a won deal
 */
export const GenerateBudgetFromDealSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for listing comments on a deal
 */
export const ListDealCommentsSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    limit: LimitSchema,
    offset: OffsetSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for creating a comment on a deal
 */
export const CreateDealCommentSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    body: z.string().min(1, "Comment body is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();

/**
 * Schema for listing activities for a deal
 */
export const ListDealActivitiesSchema = z
  .object({
    deal_id: z.string().min(1, "Deal ID is required"),
    limit: LimitSchema,
    offset: OffsetSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();
