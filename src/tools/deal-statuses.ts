/**
 * Deal Status (pipeline stage) MCP tools
 */

import { z } from "zod";
import type { ProductiveClient } from "../client.js";
import type { JSONAPIResponse, DealStatus, FormattedDealStatus } from "../types.js";
import {
  formatDealStatus,
  formatDealStatusListMarkdown,
  formatSingleDealStatusMarkdown,
  formatResponse,
  truncateResponse,
  formatPaginationFooter,
} from "../utils/formatting.js";
import {
  ListDealStatusesSchema,
  GetDealStatusSchema,
} from "../schemas/deal-status.js";

/**
 * List all deal statuses, optionally filtered by pipeline.
 */
export async function listDealStatuses(
  client: ProductiveClient,
  args: z.infer<typeof ListDealStatusesSchema>,
): Promise<string> {
  const pageNumber = Math.floor(args.offset / args.limit) + 1;

  const params: Record<string, unknown> = {
    "page[number]": pageNumber,
    "page[size]": args.limit,
    include: "pipeline",
  };

  if (args.pipeline_id) params["filter[pipeline_id]"] = args.pipeline_id;

  const response = await client.get<JSONAPIResponse>("/deal_statuses", params);

  const statuses = (
    Array.isArray(response.data) ? response.data : [response.data]
  ).map((s) => formatDealStatus(s as DealStatus, response.included));

  const total = response.meta?.total_count;
  const totalPages = response.meta?.total_pages as number | undefined;
  const currentPage = pageNumber;

  const result = formatResponse(statuses, args.response_format, () => {
    const body = formatDealStatusListMarkdown(statuses, total);
    const footer = formatPaginationFooter({
      offset: args.offset,
      limit: args.limit,
      total_count: total ?? null,
      total_pages: totalPages ?? null,
      current_page: currentPage,
    });
    return footer ? `${body}\n${footer}` : body;
  });

  return truncateResponse(result, args.response_format);
}

/**
 * Get a single deal status by ID.
 */
export async function getDealStatus(
  client: ProductiveClient,
  args: z.infer<typeof GetDealStatusSchema>,
): Promise<string> {
  const response = await client.get<JSONAPIResponse>(
    `/deal_statuses/${args.deal_status_id}`,
    { include: "pipeline" },
  );

  const statusData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const status = formatDealStatus(
    statusData as DealStatus,
    response.included,
  );

  const result = formatResponse(
    status,
    args.response_format,
    () => formatSingleDealStatusMarkdown(status),
  );

  return truncateResponse(result, args.response_format);
}
