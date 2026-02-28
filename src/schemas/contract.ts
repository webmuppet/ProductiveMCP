/**
 * Contract Zod schemas
 */

import { z } from "zod";
import { ResponseFormatSchema, LimitSchema, OffsetSchema } from "./common.js";

export const CONTRACT_INTERVAL_IDS: Record<string, number> = {
  monthly: 1,
  "bi-weekly": 2,
  weekly: 3,
  annual: 4,
  "semi-annual": 5,
  quarterly: 6,
};

export const ContractIntervalSchema = z.enum([
  "monthly",
  "bi-weekly",
  "weekly",
  "annual",
  "semi-annual",
  "quarterly",
]);

export const ListContractsSchema = z
  .object({
    interval: ContractIntervalSchema.optional(),
    limit: LimitSchema,
    offset: OffsetSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetContractSchema = z
  .object({
    contract_id: z.string().min(1, "Contract ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateContractSchema = z
  .object({
    interval: ContractIntervalSchema,
    template_id: z
      .string()
      .min(1, "Template ID (source deal/budget) is required"),
    next_occurrence_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "next_occurrence_on must be YYYY-MM-DD",
    }),
    ends_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "ends_on must be YYYY-MM-DD" })
      .optional(),
    copy_purchase_order_number: z.boolean().optional(),
    copy_expenses: z.boolean().optional(),
    use_rollover_hours: z.boolean().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateContractSchema = z
  .object({
    contract_id: z.string().min(1, "Contract ID is required"),
    interval: ContractIntervalSchema.optional(),
    next_occurrence_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "next_occurrence_on must be YYYY-MM-DD",
      })
      .optional(),
    ends_on: z
      .union([
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, {
            message: "ends_on must be YYYY-MM-DD",
          }),
        z.null(),
      ])
      .optional(),
    copy_purchase_order_number: z.boolean().optional(),
    copy_expenses: z.boolean().optional(),
    use_rollover_hours: z.boolean().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GenerateContractSchema = z
  .object({
    contract_id: z.string().min(1, "Contract ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();
