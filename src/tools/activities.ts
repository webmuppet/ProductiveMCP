/**
 * Activity MCP tools
 */

import { z } from "zod";
import type { ProductiveClient } from "../client.js";
import type {
  JSONAPIResponse,
  Activity,
  FormattedActivityDetail,
} from "../types.js";
import {
  formatActivity,
  formatActivityDetail,
  formatActivityListMarkdown,
  formatSingleActivityMarkdown,
  formatResponse,
  truncateResponse,
  formatPaginationFooter,
} from "../utils/formatting.js";
import {
  ListActivitiesSchema,
  GetActivitySchema,
  ListTaskActivitiesSchema,
  ListProjectActivitiesSchema,
  ACTIVITY_TYPE_IDS,
} from "../schemas/activity.js";

/**
 * Build common activity query params from shared filter fields.
 */
function buildActivityParams(args: {
  event?: string;
  activity_type?: string;
  after?: string;
  before?: string;
  limit: number;
  offset: number;
}): Record<string, unknown> {
  const pageNumber = Math.floor(args.offset / args.limit) + 1;

  const params: Record<string, unknown> = {
    "page[number]": pageNumber,
    "page[size]": args.limit,
    include: "creator",
  };

  if (args.event) params["filter[event]"] = args.event;
  if (args.activity_type) {
    params["filter[type]"] = ACTIVITY_TYPE_IDS[args.activity_type];
  }
  if (args.after) params["filter[after]"] = args.after;
  if (args.before) params["filter[before]"] = args.before;

  return params;
}

/**
 * List activities across the workspace or scoped to a specific entity.
 */
export async function listActivities(
  client: ProductiveClient,
  args: z.infer<typeof ListActivitiesSchema>,
): Promise<string> {
  const params = buildActivityParams(args);

  if (args.deal_id) params["filter[deal_id]"] = args.deal_id;
  if (args.task_id) params["filter[task_id]"] = args.task_id;
  if (args.project_id) params["filter[project_id]"] = args.project_id;
  if (args.company_id) params["filter[company_id]"] = args.company_id;
  if (args.person_id) params["filter[person_id]"] = args.person_id;
  if (args.creator_id) params["filter[creator_id]"] = args.creator_id;

  const response = await client.get<JSONAPIResponse>("/activities", params);

  const activities = (
    Array.isArray(response.data) ? response.data : [response.data]
  )
    .filter((item) => item !== null)
    .map((a) => formatActivity(a as Activity, response.included));

  const total = response.meta?.total_count as number | undefined;
  const totalPages = response.meta?.total_pages as number | undefined;
  const currentPage = Math.floor(args.offset / args.limit) + 1;

  const result = formatResponse(
    { activities, total, count: activities.length },
    args.response_format,
    () => {
      const body = formatActivityListMarkdown(activities, total, "Activity Feed");
      const footer = formatPaginationFooter({
        offset: args.offset,
        limit: args.limit,
        total_count: total ?? null,
        total_pages: totalPages ?? null,
        current_page: currentPage,
      });
      return footer ? `${body}\n${footer}` : body;
    },
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Get full details of a single activity by ID.
 */
export async function getActivity(
  client: ProductiveClient,
  args: z.infer<typeof GetActivitySchema>,
): Promise<string> {
  const response = await client.get<JSONAPIResponse>(
    `/activities/${args.activity_id}`,
    { include: "creator,comment,email,attachment" },
  );

  const activityData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;

  const activity: FormattedActivityDetail = formatActivityDetail(
    activityData as Activity,
    response.included,
  );

  const result = formatResponse(
    activity,
    args.response_format,
    () => formatSingleActivityMarkdown(activity),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * List the activity feed for a specific task.
 */
export async function listTaskActivities(
  client: ProductiveClient,
  args: z.infer<typeof ListTaskActivitiesSchema>,
): Promise<string> {
  const params = buildActivityParams(args);
  params["filter[task_id]"] = args.task_id;

  const response = await client.get<JSONAPIResponse>("/activities", params);

  const activities = (
    Array.isArray(response.data) ? response.data : [response.data]
  )
    .filter((item) => item !== null)
    .map((a) => formatActivity(a as Activity, response.included));

  const total = response.meta?.total_count as number | undefined;
  const totalPages = response.meta?.total_pages as number | undefined;
  const currentPage = Math.floor(args.offset / args.limit) + 1;

  const result = formatResponse(
    { activities, total, count: activities.length },
    args.response_format,
    () => {
      const body = formatActivityListMarkdown(activities, total, "Task Activity Feed");
      const footer = formatPaginationFooter({
        offset: args.offset,
        limit: args.limit,
        total_count: total ?? null,
        total_pages: totalPages ?? null,
        current_page: currentPage,
      });
      return footer ? `${body}\n${footer}` : body;
    },
  );

  return truncateResponse(result, args.response_format);
}

/**
 * List the activity feed for a specific project.
 */
export async function listProjectActivities(
  client: ProductiveClient,
  args: z.infer<typeof ListProjectActivitiesSchema>,
): Promise<string> {
  const params = buildActivityParams(args);
  params["filter[project_id]"] = args.project_id;

  const response = await client.get<JSONAPIResponse>("/activities", params);

  const activities = (
    Array.isArray(response.data) ? response.data : [response.data]
  )
    .filter((item) => item !== null)
    .map((a) => formatActivity(a as Activity, response.included));

  const total = response.meta?.total_count as number | undefined;
  const totalPages = response.meta?.total_pages as number | undefined;
  const currentPage = Math.floor(args.offset / args.limit) + 1;

  const result = formatResponse(
    { activities, total, count: activities.length },
    args.response_format,
    () => {
      const body = formatActivityListMarkdown(activities, total, "Project Activity Feed");
      const footer = formatPaginationFooter({
        offset: args.offset,
        limit: args.limit,
        total_count: total ?? null,
        total_pages: totalPages ?? null,
        current_page: currentPage,
      });
      return footer ? `${body}\n${footer}` : body;
    },
  );

  return truncateResponse(result, args.response_format);
}
