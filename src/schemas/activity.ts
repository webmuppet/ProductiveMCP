/**
 * Activity Zod schemas
 */

import { z } from "zod";
import { ResponseFormatSchema, LimitSchema, OffsetSchema } from "./common.js";

export const ActivityEventSchema = z.enum([
  "create",
  "update",
  "edit",
  "delete",
  "copy",
]);

export const ActivityTypeSchema = z.enum(["comment", "changeset", "email"]);

// Activity type mapping: comment=1, changeset=2, email=3
export const ACTIVITY_TYPE_IDS: Record<string, number> = {
  comment: 1,
  changeset: 2,
  email: 3,
};

export const ListActivitiesSchema = z
  .object({
    deal_id: z.string().optional(),
    task_id: z.string().optional(),
    project_id: z.string().optional(),
    company_id: z.string().optional(),
    person_id: z.string().optional(),
    creator_id: z.string().optional(),
    event: ActivityEventSchema.optional(),
    activity_type: ActivityTypeSchema.optional(),
    after: z.string().optional(),
    before: z.string().optional(),
    limit: LimitSchema,
    offset: OffsetSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetActivitySchema = z
  .object({
    activity_id: z.string().min(1, "Activity ID is required"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ListTaskActivitiesSchema = z
  .object({
    task_id: z.string().min(1, "Task ID is required"),
    event: ActivityEventSchema.optional(),
    activity_type: ActivityTypeSchema.optional(),
    after: z.string().optional(),
    before: z.string().optional(),
    limit: LimitSchema,
    offset: OffsetSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ListProjectActivitiesSchema = z
  .object({
    project_id: z.string().min(1, "Project ID is required"),
    event: ActivityEventSchema.optional(),
    activity_type: ActivityTypeSchema.optional(),
    after: z.string().optional(),
    before: z.string().optional(),
    limit: LimitSchema,
    offset: OffsetSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();
