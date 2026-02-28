/**
 * Pipeline Zod schemas
 */

import { z } from "zod";
import { ResponseFormatSchema } from "./common.js";

export const ListPipelinesSchema = z
  .object({
    pipeline_type: z.enum(["sales", "production"]).optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetPipelineSchema = z
  .object({
    pipeline_id: z.string().min(1, "Pipeline ID is required"),
    include_statuses: z.boolean().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();
