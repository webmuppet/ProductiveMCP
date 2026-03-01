/**
 * Deal (sales pipeline) MCP tools
 * Deals use the /deals endpoint with filter[type]=1
 */

import { z } from "zod";
import type { ProductiveClient } from "../client.js";
import type {
  JSONAPIResponse,
  Deal,
  FormattedDeal,
  Activity,
  FormattedActivity,
  CreateDealPayload,
  UpdateDealPayload,
  FormattedBudget,
  Budget,
  Comment,
  CommentAttributes,
  FormattedComment,
  PipelineStageSummary,
  PipelineSummary,
} from "../types.js";
import {
  formatDeal,
  formatDealListMarkdown,
  formatSingleDealMarkdown,
  formatPipelineSummaryMarkdown,
  formatActivity,
  formatActivityListMarkdown,
  formatBudget,
  formatSingleBudgetMarkdown,
  formatResponse,
  truncateResponse,
  markdownToHtml,
  formatPaginationFooter,
} from "../utils/formatting.js";
import {
  ListDealsSchema,
  GetDealSchema,
  CreateDealSchema,
  UpdateDealSchema,
  CloseDealSchema,
  CopyDealSchema,
  GenerateBudgetFromDealSchema,
  ListDealCommentsSchema,
  CreateDealCommentSchema,
  ListDealActivitiesSchema,
} from "../schemas/deal.js";

// ─── Comment formatting (mirrors comments.ts, local to deals context) ─────────

function formatDealComment(
  comment: Comment,
  includedData?: unknown[],
): FormattedComment {
  const attrs = comment.attributes as CommentAttributes;

  let authorId: string | null = null;
  let authorName: string | null = null;

  if (
    comment.relationships?.creator?.data &&
    "id" in comment.relationships.creator.data
  ) {
    authorId = comment.relationships.creator.data.id;

    if (includedData) {
      const person = includedData.find(
        (
          item,
        ): item is {
          type: string;
          id: string;
          attributes?: { first_name?: string; last_name?: string };
        } =>
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          (item as { type: unknown }).type === "people" &&
          "id" in item &&
          (item as { id: unknown }).id === authorId,
      );
      if (person?.attributes) {
        const first = person.attributes.first_name ?? "";
        const last = person.attributes.last_name ?? "";
        authorName = `${first} ${last}`.trim() || null;
      }
    }
  }

  let dealId: string | null = null;
  if (
    comment.relationships?.deal?.data &&
    "id" in comment.relationships.deal.data
  ) {
    dealId = comment.relationships.deal.data.id;
  }

  return {
    id: comment.id ?? "",
    body: attrs.body ?? "",
    created_at: attrs.created_at,
    updated_at: attrs.updated_at,
    pinned: attrs.pinned ?? false,
    author_id: authorId,
    author_name: authorName,
    task_id: dealId, // reuse task_id field to store deal_id for display
  };
}

function formatDealCommentMarkdown(comment: FormattedComment): string {
  const pinnedBadge = comment.pinned ? " 📌" : "";
  const author =
    comment.author_name ||
    (comment.author_id ? `User ${comment.author_id}` : "Unknown");
  const date = new Date(comment.created_at).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    `# Comment${pinnedBadge}`,
    "",
    `**Author**: ${author}`,
    `**Date**: ${date}`,
    `**ID**: ${comment.id}`,
    "",
    "---",
    "",
    comment.body,
  ].join("\n");
}

function formatDealCommentsMarkdown(
  comments: FormattedComment[],
  total?: number,
): string {
  if (comments.length === 0) {
    return "No comments found for this deal.";
  }

  const lines = ["# Deal Comments", ""];

  if (total !== undefined) {
    lines.push(`**Total**: ${total} comments`, "");
  }

  for (const comment of comments) {
    const pinnedBadge = comment.pinned ? " 📌" : "";
    const author =
      comment.author_name ||
      (comment.author_id ? `User ${comment.author_id}` : "Unknown");
    const date = new Date(comment.created_at).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    lines.push(`## ${author}${pinnedBadge}`);
    lines.push(`*${date}*`);
    lines.push("");
    lines.push(comment.body);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Tool handlers ────────────────────────────────────────────────────────────

/**
 * List deals, optionally as a pipeline summary grouped by stage.
 */
export async function listDeals(
  client: ProductiveClient,
  args: z.infer<typeof ListDealsSchema>,
): Promise<string> {
  // Pipeline summary mode: paginate all open deals and group by stage
  if (args.summary) {
    let allDeals: FormattedDeal[] = [];
    let currentPage = 1;
    let totalPages = 1;

    const baseParams: Record<string, unknown> = {
      "filter[type]": 1,
      "page[size]": 50,
      include: "company,responsible,deal_status,pipeline",
    };

    do {
      const params = { ...baseParams, "page[number]": currentPage };
      const response = await client.get<JSONAPIResponse>("/deals", params);

      const pageDeals = (
        Array.isArray(response.data) ? response.data : [response.data]
      ).map((deal) =>
        formatDeal(deal as Deal, client.getOrgId(), response.included),
      );

      allDeals = allDeals.concat(pageDeals);

      if (response.meta?.total_pages) {
        totalPages = response.meta.total_pages as number;
      }

      currentPage++;
    } while (currentPage <= totalPages);

    // Filter to open deals only (API does not support filter[stage_status])
    allDeals = allDeals.filter((d) => d.closed_at === null);

    // Group by stage
    const stageMap = new Map<string, PipelineStageSummary>();

    for (const deal of allDeals) {
      const stageName = deal.deal_status_name ?? "Unknown Stage";

      if (!stageMap.has(stageName)) {
        stageMap.set(stageName, {
          stage_name: stageName,
          deal_count: 0,
          total_revenue: 0,
          deals: [],
        });
      }

      const stage = stageMap.get(stageName)!;
      stage.deal_count++;

      const rev = parseFloat(deal.revenue ?? "0") || 0;
      stage.total_revenue += rev;

      stage.deals.push({
        id: deal.id,
        name: deal.name,
        company: deal.company_name,
        revenue: deal.revenue,
        probability: deal.probability,
      });
    }

    const stages = Array.from(stageMap.values());
    const totalRevenue = stages.reduce((sum, s) => sum + s.total_revenue, 0);
    const weightedRevenue = allDeals.reduce((sum, d) => {
      const rev = parseFloat(d.revenue ?? "0") || 0;
      const prob = (d.probability ?? 0) / 100;
      return sum + rev * prob;
    }, 0);

    const summary: PipelineSummary = {
      total_deals: allDeals.length,
      total_revenue: totalRevenue,
      weighted_revenue: weightedRevenue,
      stages,
    };

    const result = formatResponse(summary, args.response_format, () =>
      formatPipelineSummaryMarkdown(summary),
    );

    return truncateResponse(result, args.response_format);
  }

  // Standard paginated flat list
  const pageNumber = Math.floor(args.offset / args.limit) + 1;

  const params: Record<string, unknown> = {
    "filter[type]": 1,
    "page[number]": pageNumber,
    "page[size]": args.limit,
    include: "company,responsible,deal_status,pipeline",
  };

  if (args.company_id) params["filter[company_id]"] = args.company_id;
  if (args.responsible_id)
    params["filter[responsible_id]"] = args.responsible_id;
  if (args.pipeline_id) params["filter[pipeline_id]"] = args.pipeline_id;
  if (args.deal_status_id)
    params["filter[deal_status_id]"] = args.deal_status_id;
  if (args.query) params["filter[name]"] = args.query;

  if (args.sort_by) {
    const order = args.sort_order ?? "desc";
    params["sort"] = order === "desc" ? `-${args.sort_by}` : args.sort_by;
  }

  const response = await client.get<JSONAPIResponse>("/deals", params);

  const deals = (
    Array.isArray(response.data) ? response.data : [response.data]
  ).map((deal) =>
    formatDeal(deal as Deal, client.getOrgId(), response.included),
  );

  const total = response.meta?.total_count;
  const totalPages = response.meta?.total_pages as number | undefined;
  const currentPage = pageNumber;

  const result = formatResponse(deals, args.response_format, () => {
    const body = formatDealListMarkdown(deals, total);
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
 * Get a single deal with full details and the 5 most recent activities.
 */
export async function getDeal(
  client: ProductiveClient,
  args: z.infer<typeof GetDealSchema>,
): Promise<string> {
  // Fetch deal with full includes
  const dealResponse = await client.get<JSONAPIResponse>(
    `/deals/${args.deal_id}`,
    { include: "company,responsible,deal_status,pipeline,project" },
  );

  const dealData = Array.isArray(dealResponse.data)
    ? dealResponse.data[0]
    : dealResponse.data;
  const deal = formatDeal(
    dealData as Deal,
    client.getOrgId(),
    dealResponse.included,
  );

  // Fetch the 5 most recent activities for this deal
  let activities: FormattedActivity[] = [];
  try {
    const activityResponse = await client.get<JSONAPIResponse>("/activities", {
      "filter[deal_id]": args.deal_id,
      "page[size]": 5,
      "page[number]": 1,
      include: "creator",
    });

    activities = (
      Array.isArray(activityResponse.data)
        ? activityResponse.data
        : [activityResponse.data]
    )
      .filter((item) => item !== null)
      .map((activity) =>
        formatActivity(activity as Activity, activityResponse.included),
      );
  } catch {
    // Activities are optional — don't fail the whole request if unavailable
  }

  const result = formatResponse(
    { deal, activities },
    args.response_format,
    () => formatSingleDealMarkdown(deal, activities),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Create a new deal.
 */
export async function createDeal(
  client: ProductiveClient,
  args: z.infer<typeof CreateDealSchema>,
): Promise<string> {
  const payload: CreateDealPayload = {
    data: {
      type: "deals",
      attributes: {
        name: args.name,
        date: args.date,
        budget: false, // marks this as a deal, not a budget
        deal_type_id: 2, // 2 = client deal
      },
    },
  };

  if (args.probability !== undefined) {
    payload.data.attributes.probability = args.probability;
  }
  if (args.currency) {
    payload.data.attributes.currency = args.currency;
  }
  if (args.end_date !== undefined) {
    payload.data.attributes.end_date = args.end_date;
  }
  if (args.purchase_order_number) {
    payload.data.attributes.purchase_order_number = args.purchase_order_number;
  }

  // Relationships
  payload.data.relationships = {};

  payload.data.relationships.deal_status = {
    data: { type: "deal_statuses", id: args.deal_status_id },
  };

  if (args.company_id) {
    payload.data.relationships.company = {
      data: { type: "companies", id: args.company_id },
    };
  }
  if (args.responsible_id) {
    payload.data.relationships.responsible = {
      data: { type: "people", id: args.responsible_id },
    };
  }
  if (args.pipeline_id) {
    payload.data.relationships.pipeline = {
      data: { type: "pipelines", id: args.pipeline_id },
    };
  }

  const response = await client.post<JSONAPIResponse>("/deals", payload, {
    include: "company,responsible,deal_status,pipeline",
  });

  const dealData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const deal = formatDeal(
    dealData as Deal,
    client.getOrgId(),
    response.included,
  );

  const result = formatResponse(
    deal,
    args.response_format,
    () => `Deal created successfully:\n\n${formatSingleDealMarkdown(deal)}`,
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Update a deal's attributes or move it to a different pipeline stage.
 */
export async function updateDeal(
  client: ProductiveClient,
  args: z.infer<typeof UpdateDealSchema>,
): Promise<string> {
  const payload: UpdateDealPayload = {
    data: {
      type: "deals",
      id: args.deal_id,
    },
  };

  // Build attributes
  const attributes: UpdateDealPayload["data"]["attributes"] = {};

  if (args.name !== undefined) attributes.name = args.name;
  if (args.date !== undefined) attributes.date = args.date;
  if (args.end_date !== undefined) attributes.end_date = args.end_date;
  if (args.probability !== undefined)
    attributes.probability = args.probability;
  if (args.purchase_order_number !== undefined)
    attributes.purchase_order_number = args.purchase_order_number;

  if (Object.keys(attributes).length > 0) {
    payload.data.attributes = attributes;
  }

  // Build relationships
  const relationships: UpdateDealPayload["data"]["relationships"] = {};

  if (args.deal_status_id) {
    relationships.deal_status = {
      data: { type: "deal_statuses", id: args.deal_status_id },
    };
  }
  if (args.company_id) {
    relationships.company = {
      data: { type: "companies", id: args.company_id },
    };
  }
  if (args.responsible_id) {
    relationships.responsible = {
      data: { type: "people", id: args.responsible_id },
    };
  }

  if (Object.keys(relationships).length > 0) {
    payload.data.relationships = relationships;
  }

  await client.patch<JSONAPIResponse>(`/deals/${args.deal_id}`, payload);

  // Fetch updated deal with includes
  const getResponse = await client.get<JSONAPIResponse>(
    `/deals/${args.deal_id}`,
    { include: "company,responsible,deal_status,pipeline" },
  );

  const dealData = Array.isArray(getResponse.data)
    ? getResponse.data[0]
    : getResponse.data;
  const deal = formatDeal(
    dealData as Deal,
    client.getOrgId(),
    getResponse.included,
  );

  const result = formatResponse(
    deal,
    args.response_format,
    () => `Deal updated successfully:\n\n${formatSingleDealMarkdown(deal)}`,
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Close a deal as won or lost.
 */
export async function closeDeal(
  client: ProductiveClient,
  args: z.infer<typeof CloseDealSchema>,
): Promise<string> {
  const payload: UpdateDealPayload = {
    data: {
      type: "deals",
      id: args.deal_id,
      relationships: {
        deal_status: {
          data: { type: "deal_statuses", id: args.deal_status_id },
        },
      },
    },
  };

  if (args.lost_reason_id) {
    payload.data.relationships = payload.data.relationships ?? {};
    payload.data.relationships.lost_reason = {
      data: { type: "lost_reasons", id: args.lost_reason_id },
    };
  }

  await client.patch<JSONAPIResponse>(`/deals/${args.deal_id}`, payload);

  // Fetch the closed deal
  const getResponse = await client.get<JSONAPIResponse>(
    `/deals/${args.deal_id}`,
    { include: "company,responsible,deal_status,pipeline" },
  );

  const dealData = Array.isArray(getResponse.data)
    ? getResponse.data[0]
    : getResponse.data;
  const deal = formatDeal(
    dealData as Deal,
    client.getOrgId(),
    getResponse.included,
  );

  const outcomeLabel = args.outcome === "won" ? "Won 🎉" : "Lost";
  const result = formatResponse(
    deal,
    args.response_format,
    () =>
      `Deal closed as **${outcomeLabel}**:\n\n${formatSingleDealMarkdown(deal)}`,
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Generate a budget from a won deal.
 */
export async function generateBudgetFromDeal(
  client: ProductiveClient,
  args: z.infer<typeof GenerateBudgetFromDealSchema>,
): Promise<string> {
  const response = await client.post<JSONAPIResponse>(
    `/deals/${args.deal_id}/budget`,
    {},
    { include: "project,company,responsible" },
  );

  const budgetData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const budget = formatBudget(
    budgetData as Budget,
    client.getOrgId(),
    response.included,
  );

  const result = formatResponse(
    budget,
    args.response_format,
    () =>
      `Budget generated successfully from deal ${args.deal_id}:\n\n${formatSingleBudgetMarkdown(budget)}`,
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Copy a deal.
 */
export async function copyDeal(
  client: ProductiveClient,
  args: z.infer<typeof CopyDealSchema>,
): Promise<string> {
  const response = await client.post<JSONAPIResponse>(
    `/deals/${args.deal_id}/copy`,
    {},
    { include: "company,responsible,deal_status,pipeline" },
  );

  const dealData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const deal = formatDeal(
    dealData as Deal,
    client.getOrgId(),
    response.included,
  );

  const result = formatResponse(
    deal,
    args.response_format,
    () => `Deal copied successfully:\n\n${formatSingleDealMarkdown(deal)}`,
  );

  return truncateResponse(result, args.response_format);
}

/**
 * List comments on a deal.
 */
export async function listDealComments(
  client: ProductiveClient,
  args: z.infer<typeof ListDealCommentsSchema>,
): Promise<string> {
  const pageNumber = Math.floor(args.offset / args.limit) + 1;

  // The /comments endpoint does not support filter[deal_id].
  // Step 1: Fetch comment-type activities to discover the comment IDs for this deal.
  const activityResponse = await client.get<JSONAPIResponse>("/activities", {
    "filter[deal_id]": args.deal_id,
    "filter[item_type]": "comment",
    "page[number]": pageNumber,
    "page[size]": args.limit,
  });

  const activities = Array.isArray(activityResponse.data)
    ? activityResponse.data
    : activityResponse.data
      ? [activityResponse.data]
      : [];

  const commentIds: string[] = activities
    .filter((a): a is { attributes: { item_id: number } } & typeof a => {
      const attrs = (a as { attributes?: { item_id?: unknown } }).attributes;
      return !!attrs?.item_id;
    })
    .map((a) => String(a.attributes.item_id));

  const total = activityResponse.meta?.total_count;
  const totalPages = activityResponse.meta?.total_pages as number | undefined;
  const currentPage = pageNumber;

  if (commentIds.length === 0) {
    const result = formatResponse(
      { comments: [], total: 0, count: 0 },
      args.response_format,
      () => "No comments found for this deal.",
    );
    return truncateResponse(result, args.response_format);
  }

  // Step 2: Bulk-fetch those comments by ID (filter[id] supports comma-separated values)
  const response = await client.get<JSONAPIResponse>("/comments", {
    "filter[id]": commentIds.join(","),
    include: "creator",
  });

  const comments = (
    Array.isArray(response.data) ? response.data : [response.data]
  )
    .filter((item) => item !== null)
    .map((comment) =>
      formatDealComment(comment as Comment, response.included),
    );

  const result = formatResponse(
    { comments, total, count: comments.length },
    args.response_format,
    () => {
      const body = formatDealCommentsMarkdown(comments, total);
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
 * Create a comment on a deal.
 */
export async function createDealComment(
  client: ProductiveClient,
  args: z.infer<typeof CreateDealCommentSchema>,
): Promise<string> {
  const htmlBody = markdownToHtml(args.body);

  const payload = {
    data: {
      type: "comments",
      attributes: {
        body: htmlBody,
      },
      relationships: {
        deal: {
          data: {
            type: "deals",
            id: args.deal_id,
          },
        },
      },
    },
  };

  const response = await client.post<JSONAPIResponse>("/comments", payload);
  const commentData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const comment = formatDealComment(
    commentData as Comment,
    response.included,
  );

  const result = formatResponse(
    comment,
    args.response_format,
    () =>
      `Comment added to deal successfully:\n\n${formatDealCommentMarkdown(comment)}`,
  );

  return truncateResponse(result, args.response_format);
}

/**
 * List activities for a deal.
 */
export async function listDealActivities(
  client: ProductiveClient,
  args: z.infer<typeof ListDealActivitiesSchema>,
): Promise<string> {
  const pageNumber = Math.floor(args.offset / args.limit) + 1;

  const response = await client.get<JSONAPIResponse>("/activities", {
    "filter[deal_id]": args.deal_id,
    "page[number]": pageNumber,
    "page[size]": args.limit,
    include: "creator",
  });

  const activities = (
    Array.isArray(response.data) ? response.data : [response.data]
  )
    .filter((item) => item !== null)
    .map((activity) =>
      formatActivity(activity as Activity, response.included),
    );

  const total = response.meta?.total_count;
  const totalPages = response.meta?.total_pages as number | undefined;
  const currentPage = pageNumber;

  const result = formatResponse(
    { activities, total, count: activities.length },
    args.response_format,
    () => {
      const body = formatActivityListMarkdown(activities, total, "Deal Activity Feed");
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
