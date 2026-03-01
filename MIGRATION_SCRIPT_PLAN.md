# Migration Script: ClickUp → Productive.io

## Overview

A standalone Node.js/TypeScript CLI tool that talks directly to both APIs. No MCP server dependency. Lives in the same repo.

---

## Why Not the MCP Server

| Problem | Impact |
|---------|--------|
| Silent failure on unknown workflow statuses | Tasks appear updated but aren't |
| Batch create missing key fields (`task_list_id`, `parent_task_id`, `workflow_status`) | Forced 120+ individual calls then retrofitting |
| No workflow status management tools | Had to bypass MCP with curl |
| No delete task tool | Can't clean up mistakes |
| Config requires server restart | Stale config = silent degradation |
| Single-process-per-call overhead (~0.5s) | Bulk operations unnecessarily slow |
| `labels` not on UpdateTaskSchema | Can't tag tasks after creation |

---

## File Structure

```
scripts/migrate/
├── index.ts                     # CLI entry point
├── types.ts                     # All migration types
├── config.ts                    # Config loader + env vars
├── transaction-log.ts           # JSON Lines log (resumability)
├── clickup-client.ts            # ClickUp REST API client
├── productive-client.ts         # Thin wrapper on existing src/client.ts
├── phases/
│   ├── phase-0-preflight.ts     # Export + audit + plan
│   ├── phase-1-metadata.ts      # Statuses, people, project structure
│   ├── phase-2-tasks.ts         # Parent tasks → subtasks → checklists
│   ├── phase-3-content.ts       # Comments, attachments, pages
│   ├── phase-4-dependencies.ts  # Task dependencies
│   └── phase-5-verify.ts        # Count comparison + spot checks
├── utils/
│   ├── rate-limiter.ts          # Reused from src/utils/
│   └── formatting.ts            # Reused from src/utils/
└── migration-config.json.example
```

---

## Code Reuse from MCP Server

| Module | Reuse? | Notes |
|--------|--------|-------|
| `src/client.ts` (ProductiveClient) | **Yes** — import directly | Auth, headers, rate limiting already correct |
| `src/utils/rate-limiter.ts` | **Yes** — import directly | 100 req/10s sliding window |
| `src/utils/formatting.ts` | **Yes** — `markdownToHtml()` | Task descriptions need HTML |
| `src/types.ts` | **Partial** — import payload types | `CreateTaskPayload`, `UpdateTaskPayload`, `JSONAPIResponse` |
| `src/schemas/*.ts` | **No** | Zod strict schemas are the problem; script validates differently |
| `src/tools/*.ts` | **No** | These are MCP wrappers; script calls API directly |
| `productive.config.json` | **No** | Script manages its own config; no silent lookups |

---

## Migration Config Schema

```jsonc
// migration-config.json
{
  // Source
  "clickup_api_key": "${CLICKUP_API_KEY}",      // or hardcoded
  "clickup_space_ids": ["90165159776"],           // spaces to migrate

  // Target
  "productive_api_token": "${PRODUCTIVE_API_TOKEN}",
  "productive_org_id": "${PRODUCTIVE_ORG_ID}",
  "productive_base_url": "https://api.productive.io/api/v2",
  "productive_workflow_id": "52925",

  // Status mapping: ClickUp status name (lowercase) → Productive status name
  // Phase 1 creates these if they don't exist
  "status_map": {
    "backlog":      { "name": "Backlog",      "category": 2 },
    "to do":        { "name": "To Do",        "category": 2 },
    "doing":        { "name": "Doing",        "category": 2 },
    "needs review": { "name": "Needs Review", "category": 2 },
    "blocked":      { "name": "Blocked",      "category": 2 },
    "done":         { "name": "Done",         "category": 3 }
  },

  // Assignee mapping: ClickUp email → Productive person ID
  // Phase 0 auto-discovers what it can; user fills gaps
  "assignee_map": {
    "greg@thisisgravity.co":    "1065388",
    "alison@tika.org.nz":       "1065445",
    "eoghan@thisisgravity.co":  "1065459",
    "dan@thisisgravity.co":     "1065460",
    "charlotte@tika.org.nz":    null,
    "james@thisisgravity.co":   null,
    "zoe@tika.org.nz":          null,
    "michael@tika.org.nz":      null
  },

  // How to handle ClickUp tasks with multiple assignees
  "multi_assignee_strategy": "primary_with_note",

  // Structure mapping: ClickUp space → Productive project
  // null = create new; string = use existing ID
  "project_map": {
    "90165159776": {
      "productive_project_id": null,
      "productive_board_id": null,
      "folder_to_task_list_map": {}
    }
  },

  // What to migrate
  "include_comments": true,
  "include_attachments": true,
  "include_checklists": true,
  "include_dependencies": true,

  // Execution
  "dry_run": true,
  "resume_from_log": null
}
```

---

## Phase Design

### Phase 0: Pre-Flight

**In:** ClickUp API key, space IDs
**Out:** `clickup-export.json`, `migration-plan.json`, console report

1. Connect to ClickUp API, export full hierarchy for each space
   - Spaces → Folders → Lists → Tasks (with subtasks)
   - For each task: comments, attachments, checklists, custom fields
2. Connect to Productive API, list all people
3. Auto-match ClickUp assignees → Productive people by email
4. Audit all ClickUp statuses, flag any not in `status_map`
5. Save export to `clickup-export.json` (decouples read from write)
6. Generate migration plan:
   - Task counts, comment counts, attachment counts
   - Estimated API calls and duration
   - **Blockers** (unmapped statuses, missing required people)
   - **Warnings** (multi-assignee tasks, tasks with no assignee)
7. Print plan to console, require user confirmation before Phase 1

**Key design choice:** ClickUp export is saved locally. All subsequent phases read from this file, not from the ClickUp API. This means:
- You can review/edit the export before migrating
- Re-runs don't hit ClickUp again
- ClickUp and Productive operations are fully decoupled

### Phase 1: Metadata

**In:** `clickup-export.json`, config
**Out:** Status IDs, project/board/task list IDs in transaction log

1. **Workflow statuses** — for each entry in `status_map`:
   - Check if already exists in Productive (GET /workflow_statuses)
   - If not, create it (POST /workflow_statuses) with correct category
   - **Fail loudly** if create fails — do not continue
2. **People** — verify each `assignee_map` entry with non-null ID exists
   - Flag null entries as warnings (tasks will be created without assignee)
3. **Project structure** — create project, board, task lists as needed
   - Map ClickUp Folder → Productive Task List
4. Write all created IDs to transaction log

### Phase 2: Tasks

**In:** Export, metadata IDs from Phase 1
**Out:** ClickUp ID → Productive ID mapping in transaction log

1. **Parent tasks first** — create with ALL fields at once:
   - `title`, `description` (HTML via markdownToHtml), `project_id`, `task_list_id`
   - `assignee_id` (from assignee_map), `workflow_status` (from status IDs)
   - `due_date`, `start_date`, `labels`, `priority`
2. **Subtasks second** — same fields plus `parent_task_id` from step 1
3. **Checklists** — `POST /todos` for each checklist item
4. Rate limit: batch 50 at a time, respect 100 req/10s
5. On error: log the failed task, continue with next (don't abort)

### Phase 3: Rich Content

**In:** Task ID mapping from Phase 2
**Out:** Comment and attachment IDs in transaction log

1. **Comments** — for each task with comments:
   - `POST /comments` with body as HTML
   - Preserve chronological order
2. **Attachments** — for each task with attachments:
   - Download from ClickUp URL
   - Upload to Productive via multipart form
3. **Pages** — if ClickUp Docs exist:
   - Create via `POST /pages` with ProseMirror JSON body

### Phase 4: Dependencies

**In:** Task ID mapping from Phase 2
**Out:** Dependency IDs in transaction log

- Map ClickUp dependency → Productive dependency type
- Both task IDs must exist in mapping (skip if either missing)

### Phase 5: Verification

**In:** Everything from Phases 1-4
**Out:** Verification report

1. Count comparison (ClickUp total vs Productive total)
2. Spot-check 10% of tasks: title, status, assignee, parent/child
3. Verify subtask nesting
4. Sample check comments and attachments
5. Print pass/fail report

---

## Dry-Run Mode

When `dry_run: true`:
- Phase 0 runs normally (read-only)
- Phases 1-4 build payloads but **do not POST**
- Every would-be API call is logged with the full payload
- Transaction log gets `DRY_RUN_` prefixed IDs
- Console shows exactly what would happen

This means you can review the entire migration plan and every payload before flipping `dry_run: false`.

---

## Resumability

**Transaction log** is a JSON Lines file (`migration-log.jsonl`):

```jsonc
{"ts":"2026-03-01T10:00:00Z","phase":1,"op":"status_created","productive_id":"163116","meta":{"name":"Backlog"}}
{"ts":"2026-03-01T10:00:01Z","phase":2,"op":"task_created","clickup_id":"86d0b0ftk","productive_id":"16338940","meta":{"title":"Ensure Brand Website ready for Launch"}}
{"ts":"2026-03-01T10:00:02Z","phase":2,"op":"task_created","clickup_id":"86d0auut7","productive_id":"16338941","meta":{"title":"Implement GTM/GA"}}
{"ts":"2026-03-01T10:00:03Z","phase":2,"op":"task_error","clickup_id":"86d0b0fqt","error":"assignee not mapped","meta":{"title":"Privacy Impact Assessment"}}
```

**On re-run:**
- Script reads the log, builds a set of already-completed operations
- Skips any operation already logged as `success`
- Retries anything logged as `error`
- This means you can kill the script mid-run and pick up where you left off

---

## Error Handling Philosophy

| Phase | On Error |
|-------|----------|
| 0 (Pre-flight) | **Abort** — user must fix config before proceeding |
| 1 (Metadata) | **Abort** — metadata must be complete before tasks |
| 2 (Tasks) | **Log + continue** — create as many as possible, report failures |
| 3 (Content) | **Log + continue** — comments/attachments are supplementary |
| 4 (Dependencies) | **Log + continue** — skip if either task missing |
| 5 (Verify) | **Report only** — no writes, just audit |

**Key difference from MCP server:** No silent failures. Every operation either succeeds (logged) or fails (logged with error + full context).

---

## CLI Interface

```bash
# First run: export + audit (always safe)
npx tsx scripts/migrate/index.ts --config migration-config.json

# Review output, fix config, then:
npx tsx scripts/migrate/index.ts --config migration-config.json --execute

# Resume after interruption:
npx tsx scripts/migrate/index.ts --config migration-config.json --execute --resume migration-log.jsonl

# Run specific phase only:
npx tsx scripts/migrate/index.ts --config migration-config.json --execute --phase 2
```

---

## Estimated Performance

For Tika Go-Live (~62 parent tasks, ~58 subtasks, ~23 comments):

| Phase | API Calls | Time @ 100 req/10s |
|-------|-----------|-------------------|
| 0: Export from ClickUp | ~70 | ~7s |
| 1: Create statuses + structure | ~15 | ~2s |
| 2: Create 120 tasks | ~120 | ~12s |
| 3: Comments + attachments | ~30 | ~3s |
| 4: Dependencies | ~5 | ~1s |
| 5: Verify (10% sample) | ~12 | ~2s |
| **Total** | **~252** | **~27s** |

---

## What This Gives Us vs MCP Approach

| Aspect | MCP Server | Migration Script |
|--------|-----------|-----------------|
| Error handling | Silent failures | Fail loudly, log everything |
| Workflow statuses | No management tool | Creates them directly |
| Batch efficiency | 1 process per call | Persistent connection, batched |
| Metadata timing | Retrofitting required | Metadata first, tasks second |
| Multi-assignee | Single only | Primary + note in description |
| Resumability | None | Transaction log |
| Dry run | None | Full payload preview |
| Config | Requires server restart | Read at runtime, no cache |
| Dependencies | npm + MCP SDK + stdio | npm + axios only |
