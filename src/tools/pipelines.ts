/**
 * Pipeline MCP tools
 */

import { z } from "zod";
import type { ProductiveClient } from "../client.js";
import type {
  JSONAPIResponse,
  Pipeline,
  DealStatus,
  FormattedPipeline,
} from "../types.js";
import {
  formatPipeline,
  formatDealStatus,
  formatPipelineListMarkdown,
  formatSinglePipelineMarkdown,
  formatResponse,
  truncateResponse,
} from "../utils/formatting.js";
import { ListPipelinesSchema, GetPipelineSchema } from "../schemas/pipeline.js";

const PIPELINE_TYPE_IDS: Record<string, number> = {
  sales: 1,
  production: 2,
};

/**
 * List all pipelines.
 */
export async function listPipelines(
  client: ProductiveClient,
  args: z.infer<typeof ListPipelinesSchema>,
): Promise<string> {
  const params: Record<string, unknown> = {};

  if (args.pipeline_type) {
    params["filter[pipeline_type_id]"] =
      PIPELINE_TYPE_IDS[args.pipeline_type] ?? 1;
  }

  const response = await client.get<JSONAPIResponse>("/pipelines", params);

  const pipelines = (
    Array.isArray(response.data) ? response.data : [response.data]
  ).map((p) => formatPipeline(p as Pipeline));

  const result = formatResponse(pipelines, args.response_format, () =>
    formatPipelineListMarkdown(pipelines),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Get a single pipeline by ID, optionally including its deal statuses.
 */
export async function getPipeline(
  client: ProductiveClient,
  args: z.infer<typeof GetPipelineSchema>,
): Promise<string> {
  const response = await client.get<JSONAPIResponse>(
    `/pipelines/${args.pipeline_id}`,
  );

  const pipelineData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const pipeline: FormattedPipeline = formatPipeline(
    pipelineData as Pipeline,
  );

  // Fetch stages unless explicitly disabled
  const includeStatuses = args.include_statuses !== false;
  if (includeStatuses) {
    try {
      const statusResponse = await client.get<JSONAPIResponse>(
        "/deal_statuses",
        {
          "filter[pipeline_id]": args.pipeline_id,
          "page[size]": 100,
          include: "pipeline",
        },
      );

      pipeline.statuses = (
        Array.isArray(statusResponse.data)
          ? statusResponse.data
          : [statusResponse.data]
      ).map((s) =>
        formatDealStatus(s as DealStatus, statusResponse.included),
      );
    } catch {
      // Stages are optional — don't fail if unavailable
      pipeline.statuses = [];
    }
  }

  const result = formatResponse(
    pipeline,
    args.response_format,
    () => formatSinglePipelineMarkdown(pipeline),
  );

  return truncateResponse(result, args.response_format);
}
