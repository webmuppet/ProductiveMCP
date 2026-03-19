# Claude Session Memory — ProductiveMCP

> Read this at the start of any new session working on this repo.

---

## What this project is

An MCP server exposing 50+ tools for the Productive.io API. It runs as a stdio subprocess managed by `mcp-broker`. Claude Desktop (the native Mac app with Chat/Cowork/Claude Code tabs) loads the broker via `claude_desktop_config.json`. The broker in turn spawns this server and proxies tool calls to it.

**Repo:** `~/Sites/productive-mcp-server/ProductiveMCP/`
**Branch:** `dev` (main working branch)
**Origin:** private remote at `/Users/gregf/Cowork/productive-mcp`

---

## Current development state

**Phase 4 complete.** All planned tool domains implemented:

| Domain | Tools | File |
|--------|-------|------|
| Tasks | list, get, create, update, batch create, search, subtasks, dependencies | `src/tools/tasks.ts` |
| Comments | list, get, create, update, delete | `src/tools/comments.ts` |
| Pages | list, search, get, create, update, delete | `src/tools/pages.ts` |
| Budgets | list, get, create, update, close, deliver | `src/tools/budgets.ts` |
| Deals | list, get, create, update, close, copy, comments, pipeline | `src/tools/deals.ts` |
| Companies | list, get, create, update, archive | `src/tools/companies.ts` |
| Contracts | list, get, create, update, generate | `src/tools/contracts.ts` |
| Activities | list, get, task activities, project activities | `src/tools/activities.ts` |
| Deal statuses | list, get | `src/tools/deal-statuses.ts` |
| Pipelines | list, get | `src/tools/pipelines.ts` |
| Lost reasons | list | `src/tools/lost-reasons.ts` |
| Services | list, get, create, update | `src/tools/services.ts` |
| Service types | list, get, create, update, archive | `src/tools/service-types.ts` |
| Revenue distributions | list, get, create, update, delete, extend | `src/tools/revenue-distributions.ts` |
| Todos | list, get, create, update, delete | `src/tools/todos.ts` |

**Test count:** 533 total — 531 passing, 2 intentionally skipped (schema edge cases).

---

## Architecture patterns (internals)

- **Entry point:** `src/index.ts` (~2700 lines, monolithic) — ListTools + CallTool handlers
- **Tool functions:** `async (client, args) => Promise<string>` in `src/tools/*.ts`
- **Schemas:** Zod `.strict()` in `src/schemas/*.ts`
- **Formatting:** all in `src/utils/formatting.ts` — tools stay lean
- **Response cap:** 25,000 chars (`CHARACTER_LIMIT` in `src/constants.ts`), pagination footer appended
- **ESM:** `.js` extensions on all internal imports (even for `.ts` source)
- **Logging:** all to stderr (stdout is MCP stdio transport — never write to it)

---

## Files that don't exist in git (recreate on new machine)

| File | How to recreate |
|------|----------------|
| `dist/` | `npm run build` |
| `.env` | `cp .env.example .env` + fill credentials |
| `productive.config.json` | `npm run setup` (needs `.env` with production credentials) |
| `~/.mcp-broker/secrets.env` | Create manually with `PRODUCTIVE_API_TOKEN`, `PRODUCTIVE_ORG_ID`, `MAKE_MCP_TOKEN` |

---

## mcp-broker integration

The broker (`~/Cowork/mcp-broker/`) manages all MCP server connections.
Secrets loaded from `~/.mcp-broker/secrets.env` (not from `claude_desktop_config.json`).
The productive entry in `config.yaml` uses stdio transport with hardcoded path to `dist/index.js`.

**Key operational fact:** The broker connects to all upstream servers at startup only. If `dist/index.js` is missing when Claude Desktop launches, the productive server silently fails and won't appear until next restart.

---

## Sandbox env vars (for integration tests)

All in `.env`. Key IDs for sandbox:
- Person: `1065388`
- Company: `1153539`
- Project: `881766` (MCP Testing Project)
- Task: `16479932` (Default Test Task)
- Deal status: `642325`

---

## Versioning

CHANGELOG.md + package.json bumped per release. Tag with `git tag vX.Y.Z` after commit.
Current version: see `package.json`.

---

## Handover doc

See `handover.md` in this repo for full new-machine setup instructions.
