/**
 * Lost Reason Zod schemas
 */

import { z } from "zod";
import { ResponseFormatSchema } from "./common.js";

export const ListLostReasonsSchema = z
  .object({
    include_archived: z.boolean().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();
