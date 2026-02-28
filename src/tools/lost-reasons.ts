/**
 * Lost Reason MCP tools
 */

import { z } from "zod";
import type { ProductiveClient } from "../client.js";
import type { JSONAPIResponse, LostReason } from "../types.js";
import {
  formatLostReason,
  formatLostReasonsListMarkdown,
  formatResponse,
  truncateResponse,
} from "../utils/formatting.js";
import { ListLostReasonsSchema } from "../schemas/lost-reason.js";

/**
 * List all lost reasons.
 * By default, archived reasons are excluded.
 */
export async function listLostReasons(
  client: ProductiveClient,
  args: z.infer<typeof ListLostReasonsSchema>,
): Promise<string> {
  const response = await client.get<JSONAPIResponse>("/lost_reasons");

  let reasons = (
    Array.isArray(response.data) ? response.data : [response.data]
  ).map((r) => formatLostReason(r as LostReason));

  // Filter out archived reasons unless explicitly requested
  if (!args.include_archived) {
    reasons = reasons.filter((r) => r.archived_at === null);
  }

  const result = formatResponse(reasons, args.response_format, () =>
    formatLostReasonsListMarkdown(reasons),
  );

  return truncateResponse(result, args.response_format);
}
