/**
 * Deal Status (pipeline stage) Zod schemas
 */

import { z } from "zod";
import { ResponseFormatSchema, LimitSchema, OffsetSchema } from "./common.js";

export const ListDealStatusesSchema = z
  .object({
    pipeline_id: z.string().optional(),
    limit: LimitSchema,
    offset: OffsetSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetDealStatusSchema = z
  .object({
    deal_status_id: z.string().min(1, "Deal Status ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();
