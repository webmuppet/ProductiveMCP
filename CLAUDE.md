# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that exposes 50+ tools for interacting with the Productive.io API. It runs over stdio transport and is consumed by Claude Desktop, Claude Code, and other MCP-compatible clients.

## Safety Rules

**Do No Harm:** Never modify, repurpose, or write data to existing production resources as a workaround for a missing tool. If a required tool does not exist, stop and tell the user. Do not improvise by using a different resource, project, or entity as a substitute. Ask the user how they want to proceed.

**Sandbox First:** When testing or experimenting, always use the sandbox environment. Never create test data in production.

**Confirm Before Creating:** Before creating any resource (project, task, budget, etc.), confirm the target location with the user. Never assume which project, list, or pipeline to use.

### Tool Guardrails by Risk Category

Every tool that writes data must include a guardrail statement in its MCP tool description. The guardrail is determined by the tool's risk category:

**Create tools** — confirm target location before executing. Never repurpose an existing resource as a workaround for a missing create tool.
Applies to: `create_project`, `create_task`, `create_tasks_batch`, `create_task_list`, `create_budget`, `create_deal`, `create_comment`, `create_deal_comment`, `create_page`, `create_service`, `create_service_type`, `create_contract`, `create_todo`, `create_task_dependency`, `create_revenue_distribution`, `generate_budget_from_deal`, `generate_contract`, `copy_deal`, `copy_task_list`

Append to description: *"⚠️ Always confirm the target project/location with the user before creating. Never repurpose an existing resource as a workaround."*

**Destructive status tools** — confirm with user before executing. State what will change and that it may not be easily reversible.
Applies to: `close_deal`, `close_budget`, `mark_budget_delivered`, `archive_project`, `archive_company`, `archive_task_list`, `archive_service_type`, `mark_as_duplicate`

Append to description: *"⚠️ Confirm with the user before executing — this changes the resource's status and may not be easily reversible."*

**Delete tools** — confirm with user before executing. State that deletion is permanent.
Applies to: `delete_page`, `delete_comment`, `delete_todo`, `delete_task_list`, `delete_task_dependency`, `delete_revenue_distribution`

Append to description: *"⚠️ Confirm with the user before deleting — this action is permanent and cannot be undone."*

**Update tools** — verify the correct resource is targeted before modifying.
Applies to: `update_task`, `update_deal`, `update_budget`, `update_project`, `update_company`, `update_contract`, `update_page`, `update_comment`, `update_service`, `update_service_type`, `update_todo`, `update_task_dependency`, `update_revenue_distribution`, `update_task_list`, `reposition_task_list`, `move_task_list`, `extend_revenue_distribution`

Append to description: *"⚠️ Verify the correct resource is targeted before modifying."*

**Batch tools** — extra caution. Confirm count and target before executing.
Applies to: `create_tasks_batch`

Append to description (in addition to Create guardrail): *"⚠️ BATCH OPERATION — confirm the number of items and target location before executing. Errors are multiplied."*

**Read tools** — no guardrail needed.
Applies to: all `list_*`, `get_*`, `search_*`, `audit_*`, `report_*` tools, and `switch_environment`, `get_environment`

## Commands

```bash
npm run build            # TypeScript compilation (tsc) → dist/
npm run dev              # Watch mode with tsx auto-reload
npm start                # Run compiled server (dist/index.js)
npm run setup            # Auto-discover Productive.io custom fields → productive.config.json
npm run clean            # Remove dist/
npm test                 # Run all tests (unit + schema + integration)
npm run test:unit        # Schema + unit tests only (fast, no sandbox needed)
npm run test:integration # Integration tests against sandbox API
npm run test:coverage    # Full suite with v8 coverage report
npm run test:watch       # Vitest interactive watch mode
```

## Testing

Three-tier Vitest test pattern:

1. **Schema tests** (`tests/schemas/`) — pure Zod validation, no network, no client
2. **Unit tests** (`tests/unit/`) — mocked `ProductiveClient` via `tests/helpers/mock-client.ts`
3. **Integration tests** (`tests/integration/`) — real Productive sandbox API; auto-skipped via `describe.skipIf(!HAS_SANDBOX)` when sandbox env vars are absent

`vitest.config.ts` sets `testTimeout: 5000` globally and overrides to `30000` for `tests/integration/**` via the `projects` array (real API calls can be slow).

### Sandbox environment variables

Copy `.env.example` → `.env` and populate all of these to run integration tests:

```
PRODUCTIVE_SANDBOX_API_TOKEN     # API token for the sandbox org
PRODUCTIVE_SANDBOX_ORG_ID        # Organisation ID
PRODUCTIVE_SANDBOX_BASE_URL      # e.g. https://api-sandbox.productive.io/api/v2
PRODUCTIVE_SANDBOX_DEAL_STATUS_ID  # A valid deal status ID in the sandbox
PRODUCTIVE_SANDBOX_PERSON_ID     # A valid person ID (used as deal responsible)
PRODUCTIVE_SANDBOX_COMPANY_ID    # A valid company ID
PRODUCTIVE_SANDBOX_PROJECT_ID    # A valid project ID (e.g. "MCP Testing Project")
PRODUCTIVE_SANDBOX_TASK_ID       # A valid task ID (e.g. "Default Test Task")
```

## Architecture

### Entry Point & Server Setup

`src/index.ts` is the monolithic entry point (~2700 lines). It creates an MCP `Server` instance with stdio transport and registers two request handlers:

1. **ListToolsRequestSchema** — returns all tool definitions (name, description, inputSchema)
2. **CallToolRequestSchema** — routes tool calls to handler functions, validates args with Zod, formats responses

### Tool Pattern

Each tool follows this flow:

```
User request → Zod schema validation → tool handler function → ProductiveClient API call → response formatting → Markdown/JSON output
```

Tool implementations live in `src/tools/` (one file per domain). Each exports async functions with signature:

```typescript
async function toolName(
  client: ProductiveClient,
  args: ValidatedArgs,
): Promise<string>;
```

Schemas live in `src/schemas/` (one file per domain, plus `common.ts` for shared validators). All schemas use `.strict()` mode.

### API Client

`src/client.ts` — `ProductiveClient` wraps axios with:

- JSON:API headers (`application/vnd.api+json`)
- Auth via `X-Auth-Token` and `X-Organization-Id`
- Built-in rate limiting (100 requests/10s sliding window via `src/utils/rate-limiter.ts`)
- All logging goes to stderr (to avoid corrupting stdio MCP transport)

### Runtime Configuration

`src/constants.ts` loads `productive.config.json` (generated by `npm run setup`) at startup for org-specific custom field IDs, task type/priority option mappings, and workflow status names. The server works without this file but custom fields won't be available.

### Key Utilities

- `src/utils/formatting.ts` — response formatting (Markdown/JSON), Markdown→HTML conversion (for task descriptions), Markdown→Productive document format (for pages)
- `src/utils/errors.ts` — `ProductiveAPIError` class, HTTP status-specific error messages, env var validation
- `src/types.ts` — JSON:API response types and "Formatted" variants (e.g. `Task` → `FormattedTask` with resolved relationships)

### Body Format Gotchas

Different Productive API endpoints expect different formats for rich text body content:

| Endpoint     | Input accepted   | Sent to API as                                | Function                          |
| ------------ | ---------------- | --------------------------------------------- | --------------------------------- |
| **Tasks**    | Markdown or HTML | HTML string                                   | `markdownToHtml()`                |
| **Comments** | Markdown or HTML | HTML string                                   | `markdownToHtml()`                |
| **Pages**    | Markdown         | Stringified JSON (`"{\"type\":\"doc\",...}"`) | `markdownToProductiveDocString()` |

Pages use Productive's ProseMirror document format. The body attribute must be a **string** containing JSON — not a raw JSON object. The `ProductiveDoc` type in `src/types.ts` defines the structure.

### Response Constraints

All tool responses are capped at 25,000 characters (`CHARACTER_LIMIT` in constants.ts) with pagination hints when truncated.

## Adding a New Tool

1. Create/extend a Zod schema in `src/schemas/`
2. Create/extend a handler function in `src/tools/`
3. Register the tool definition in the `ListToolsRequestSchema` handler in `src/index.ts`
4. Add the routing case in the `CallToolRequestSchema` handler in `src/index.ts`

## Environment

Requires `PRODUCTIVE_API_TOKEN` and `PRODUCTIVE_ORG_ID` environment variables. Copy `.env.example` to `.env` for local development. The setup script reads `.env` directly.

## Versioning

We follow [Semantic Versioning](https://semver.org/). For each release:

1. Add an entry to `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com) format
2. Bump the `version` in `package.json`
3. Commit the version bump, then tag with `git tag vX.Y.Z`

## ES Modules

This is an ESM project (`"type": "module"` in package.json). All internal imports must use `.js` extensions (e.g. `import { foo } from "./bar.js"`), even though source files are `.ts`.
