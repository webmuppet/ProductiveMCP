/**
 * Contract MCP tools
 */

import { z } from "zod";
import type { ProductiveClient } from "../client.js";
import type {
  JSONAPIResponse,
  Contract,
  FormattedContract,
  CreateContractPayload,
  UpdateContractPayload,
} from "../types.js";
import {
  formatContract,
  formatContractListMarkdown,
  formatSingleContractMarkdown,
  formatResponse,
  truncateResponse,
  formatPaginationFooter,
} from "../utils/formatting.js";
import {
  ListContractsSchema,
  GetContractSchema,
  CreateContractSchema,
  UpdateContractSchema,
  GenerateContractSchema,
  CONTRACT_INTERVAL_IDS,
} from "../schemas/contract.js";

/**
 * List contracts with optional filters.
 */
export async function listContracts(
  client: ProductiveClient,
  args: z.infer<typeof ListContractsSchema>,
): Promise<string> {
  const pageNumber = Math.floor(args.offset / args.limit) + 1;

  const params: Record<string, unknown> = {
    "page[number]": pageNumber,
    "page[size]": args.limit,
    include: "template",
  };

  if (args.interval) {
    params["filter[contract_interval_id]"] = CONTRACT_INTERVAL_IDS[args.interval];
  }

  const response = await client.get<JSONAPIResponse>("/contracts", params);

  const contracts = (
    Array.isArray(response.data) ? response.data : [response.data]
  ).map((c) => formatContract(c as Contract, response.included));

  const total = response.meta?.total_count;
  const totalPages = response.meta?.total_pages as number | undefined;
  const currentPage = pageNumber;

  const result = formatResponse(contracts, args.response_format, () => {
    const body = formatContractListMarkdown(contracts, total);
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
 * Get a single contract by ID.
 */
export async function getContract(
  client: ProductiveClient,
  args: z.infer<typeof GetContractSchema>,
): Promise<string> {
  const response = await client.get<JSONAPIResponse>(
    `/contracts/${args.contract_id}`,
    { include: "template" },
  );

  const contractData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const contract: FormattedContract = formatContract(
    contractData as Contract,
    response.included,
  );

  const result = formatResponse(
    contract,
    args.response_format,
    () => formatSingleContractMarkdown(contract),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Create a new recurring contract.
 */
export async function createContract(
  client: ProductiveClient,
  args: z.infer<typeof CreateContractSchema>,
): Promise<string> {
  const payload: CreateContractPayload = {
    data: {
      type: "contracts",
      attributes: {
        interval_id: CONTRACT_INTERVAL_IDS[args.interval],
        next_occurrence_on: args.next_occurrence_on,
      },
      relationships: {
        template: { data: { type: "deals", id: args.template_id } },
      },
    },
  };

  if (args.ends_on !== undefined) payload.data.attributes.ends_on = args.ends_on;
  if (args.copy_purchase_order_number !== undefined) {
    payload.data.attributes.copy_purchase_order_number = args.copy_purchase_order_number;
  }
  if (args.copy_expenses !== undefined) payload.data.attributes.copy_expenses = args.copy_expenses;
  if (args.use_rollover_hours !== undefined) {
    payload.data.attributes.use_rollover_hours = args.use_rollover_hours;
  }

  const response = await client.post<JSONAPIResponse>("/contracts", payload);

  const contractData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const contract: FormattedContract = formatContract(
    contractData as Contract,
    response.included,
  );

  const result = formatResponse(
    contract,
    args.response_format,
    () => formatSingleContractMarkdown(contract),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Update a contract's schedule or settings.
 */
export async function updateContract(
  client: ProductiveClient,
  args: z.infer<typeof UpdateContractSchema>,
): Promise<string> {
  const attributes: UpdateContractPayload["data"]["attributes"] = {};

  if (args.interval !== undefined) {
    attributes!.interval_id = CONTRACT_INTERVAL_IDS[args.interval];
  }
  if (args.next_occurrence_on !== undefined) {
    attributes!.next_occurrence_on = args.next_occurrence_on;
  }
  if (args.ends_on !== undefined) attributes!.ends_on = args.ends_on;
  if (args.copy_purchase_order_number !== undefined) {
    attributes!.copy_purchase_order_number = args.copy_purchase_order_number;
  }
  if (args.copy_expenses !== undefined) attributes!.copy_expenses = args.copy_expenses;
  if (args.use_rollover_hours !== undefined) {
    attributes!.use_rollover_hours = args.use_rollover_hours;
  }

  const payload: UpdateContractPayload = {
    data: { type: "contracts", id: args.contract_id, attributes },
  };

  const response = await client.patch<JSONAPIResponse>(
    `/contracts/${args.contract_id}`,
    payload,
  );

  const contractData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const contract: FormattedContract = formatContract(
    contractData as Contract,
    response.included,
  );

  const result = formatResponse(
    contract,
    args.response_format,
    () => formatSingleContractMarkdown(contract),
  );

  return truncateResponse(result, args.response_format);
}

/**
 * Trigger the next recurrence cycle for a contract.
 */
export async function generateContract(
  client: ProductiveClient,
  args: z.infer<typeof GenerateContractSchema>,
): Promise<string> {
  const response = await client.post<JSONAPIResponse>(
    `/contracts/${args.contract_id}/generate`,
    {},
  );

  const contractData = Array.isArray(response.data)
    ? response.data[0]
    : response.data;
  const contract: FormattedContract = formatContract(
    contractData as Contract,
    response.included,
  );

  const result = formatResponse(
    contract,
    args.response_format,
    () =>
      `# Contract Recurrence Generated\n\nNext cycle triggered for contract \`${contract.id}\`. Next occurrence: **${contract.next_occurrence_on}**.`,
  );

  return truncateResponse(result, args.response_format);
}
