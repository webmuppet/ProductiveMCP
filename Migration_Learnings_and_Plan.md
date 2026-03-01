# ClickUp → Productive.io Migration: Learnings & Production Plan

*Tika Go-Live Space · Sandbox Dry Run · 28 February 2026*

---

## Part 1: MCP Server Learnings

What we discovered about the Productive MCP server during the Tika Go-Live dry run.

### 1. Schema Strictness & Silent Failures

The MCP server uses Zod schemas with `.strict()` mode — any unrecognised field causes immediate rejection. While good for validation, it creates a rigid contract that makes iterative migration harder.

| Issue | Detail | Impact | Severity |
|-------|--------|--------|----------|
| `batch create` rejects `task_list_id` | `BatchTaskItemSchema` doesn't include `task_list_id`. Only `default_task_list_id` on wrapper. | Forced 120 individual API calls instead of ~5 batch calls | **HIGH** |
| `labels` rejected on update | `UpdateTaskSchema` doesn't include labels. Only on `CreateTaskSchema`. | Cannot retrospectively tag tasks. Must be set at creation. | WARNING |
| `workflow_status` silently ignored | If status name isn't in `productive.config.json`, server logs warning to stderr but returns success. | Tasks appeared to update but status didn't change. No error surfaced. | **CRITICAL** |
| `status` vs `workflow_status` naming | Field is `workflow_status`, not `status`. UI shows "Status". | Initial attempts used wrong field name, rejected by strict schema. | WARNING |
| `list_subtasks` param name | Tool requires `parent_task_id`, not `task_id`. | First call failed; had to check schema. | Minor |

### 2. Workflow Status Architecture

**This was the biggest learning.** The Productive.io workflow status system has three layers:

1. **Workflow** — a container (ID: 52925) that groups statuses for the org
2. **Status Categories** — fixed: `2` = Open/Active, `3` = Closed/Done
3. **Workflow Statuses** — named statuses (e.g. "To Do", "Doing") assigned to a category

The sandbox only shipped with two statuses: Open (146494) and Closed (146495). ClickUp's Tika Go-Live space uses six: backlog, to do, doing, needs review, blocked, done.

**What we had to do:**
- Created 6 new statuses via direct `POST /api/v2/workflow_statuses` (bypassing MCP — no tool exists for this)
- Manually updated `productive.config.json` with the new status IDs
- MCP server needed a restart to pick up config changes
- **Key insight:** The MCP server has no tool for creating/managing workflow statuses. This is a gap.

**Production implication:** Statuses MUST be created and config updated BEFORE any task creation begins. Otherwise you get the same retrofitting problem we hit.

### 3. Assignee Limitations

Tasks only accept a single `assignee_id`. ClickUp supports multiple assignees per task.

| ClickUp Assignee | Productive Person ID | Status |
|-------------------|---------------------|--------|
| Greg Forsyth | 1065388 | ✅ Works |
| Alison Mau | 1065445 | ✅ Works |
| Eoghan Neligan | 1065459 | ✅ Works |
| Dan Harrison | 1065460 | ✅ Works |
| Charlotte | Not in Productive | ❌ Blocker |
| James Boult | Not in Productive | ❌ Blocker |
| Zoë Lawton | Not in Productive | ❌ Blocker |
| Michael Timmins | Not in Productive | ❌ Blocker |

**Decision needed:** For multi-assignee tasks — choose primary assignee on the Productive task and note others in description, or use followers/watchers if available.

### 4. Description Format Gotchas

The MCP server converts Markdown input to HTML before sending to the API. This works, but:

- Descriptions set on create are HTML-encoded; reading them back shows HTML tags
- We embedded ClickUp metadata ("ClickUp Status: X | Assignees: Y") in descriptions as a workaround
- **For production:** Descriptions should contain only actual task content. Metadata goes in proper fields.

### 5. Batch Operations

`productive_create_tasks_batch` exists but has limitations:

- Doesn't support `task_list_id` per task (only `default_task_list_id` on wrapper)
- Doesn't support `parent_task_id`, `workflow_status`, or `labels` per task
- Only useful for flat lists of simple tasks

**For production:** Individual `productive_create_task` calls needed for full-fidelity migration. Rate limit is 100 req/10s, so 120 tasks takes ~15 seconds.

### 6. Rate Limiting & Transport

The bash helper script uses stdio transport with a Python subprocess for MCP handshake (`initialize` → `notifications/initialized` → `tools/call`). Each invocation spawns a new process (~0.5s overhead per call).

- For bulk operations, direct API calls via curl are significantly faster
- We used direct curl for workflow status creation because the MCP server has no tool for it

### 7. Config Dependency

`productive.config.json` is loaded at startup and cached. Changes to workflow statuses, task types, or priorities require:

- Updating the JSON file manually or running `npm run setup`
- Restarting the MCP server

**Risk:** If config is stale, operations silently degrade (e.g. status updates ignored).

---

### Summary: MCP Server Gaps & Recommendations

| Gap | Workaround Used | Effort to Fix | Priority |
|-----|----------------|---------------|----------|
| No workflow status management tools | Direct API calls via curl | Medium — new tool | **HIGH** |
| Silent failure on unknown status names | Manual config update + restart | Low — throw error instead of warn | **CRITICAL** |
| Batch create missing key fields | Individual creates in a loop | Medium — schema update | **HIGH** |
| Single assignee only | Primary assignee + description note | High — API limitation | Workaround |
| No config hot-reload | Manual restart after config changes | Low — file watcher | WARNING |
| No delete task tool | Direct API call | Low — new tool | WARNING |
| `labels` not on `UpdateTaskSchema` | Set on create only | Low — schema update | WARNING |

---

## Part 2: Production Migration Sequence

*The optimal order of operations to one-shot the production Productive.io instance.*

The dry run taught us that metadata must be established before task data flows. The sequence below ensures every task is created with full fidelity on the first pass — no retrofitting.

### Phase 0: Pre-Flight Checks

**Goal:** Validate source data and target environment before touching anything.

1. Export full ClickUp workspace hierarchy (all spaces, folders, lists, tasks, subtasks, comments, attachments)
2. Verify Productive.io project structure exists (projects, boards, task lists)
3. Run `productive_list_people` and map all ClickUp assignees → Productive person IDs
4. Identify missing people — decide whether to create them or map to alternatives
5. Audit ClickUp statuses across all spaces and build the master status map
6. Document any ClickUp custom fields that need Productive equivalents

### Phase 1: Metadata Layer

**Goal:** All reference data in place so tasks can reference it at creation time.

#### 1a. Workflow Statuses
- Create all required statuses via API (`POST /api/v2/workflow_statuses`)
- Map each ClickUp status → Productive status with correct category (Open=2, Closed=3)
- Update `productive.config.json` with new status IDs
- Restart MCP server and verify with a test status update

#### 1b. People / Assignees
- Ensure all assignees exist in Productive (create/invite if needed)
- Build the ClickUp username/email → Productive `person_id` lookup table
- Decide multi-assignee strategy: primary assignee + description note, or primary + followers

#### 1c. Project Structure
- Create any missing projects, boards, and task lists
- Map ClickUp Space → Project, Folder → Board/Task List grouping
- Capture all task list IDs for the creation script

#### 1d. Labels & Custom Fields
- Define any labels needed (these CAN be set on create)
- Map ClickUp custom fields → Productive custom fields or `task_type`/`priority`
- Update `productive.config.json` if new task types or priorities are needed

### Phase 2: Task Creation

**Goal:** All tasks created with full metadata in a single pass.

#### 2a. Parent Tasks First
Create all parent (top-level) tasks with: `title`, `description` (clean — no metadata workarounds), `project_id`, `task_list_id`, `assignee_id`, `workflow_status`, `due_date`, `start_date`, `labels`, `priority`, `task_type`.

Capture each returned Productive task ID, keyed by ClickUp task ID.

#### 2b. Subtasks Second
Create subtasks with `parent_task_id` referencing IDs from 2a. Same fields plus parent relationship.

#### 2c. Checklists / Todos
If ClickUp tasks have checklists, create via `productive_create_todo` after the task exists.

### Phase 3: Rich Content

**Goal:** Comments, attachments, and linked documents.

#### 3a. Comments
- For each task with ClickUp comments, create via Productive API
- **Note:** The MCP server doesn't currently have a `create_comment` tool — check if added or use direct API

#### 3b. Attachments
- Download from ClickUp, upload via `productive_upload_attachment`
- Rate limit consideration: large files may need throttling

#### 3c. Pages / Docs
- If ClickUp Docs exist, recreate via `productive_create_page`
- Body format: Markdown input, converted to Productive's ProseMirror JSON internally

### Phase 4: Relationships & Dependencies

**Goal:** Task dependencies and cross-references.

- Map ClickUp dependencies → Productive via `productive_create_task_dependency`
- Types supported: `blocks`, `is_blocked_by`, `relates_to`, `duplicates`
- Requires both source and target task IDs in Productive (from Phase 2 mapping)

### Phase 5: Verification

**Goal:** Confirm migration fidelity before declaring success.

1. Count tasks in Productive vs ClickUp per space/project
2. Spot-check 10% of tasks for correct status, assignee, description, parent/child relationships
3. Verify all subtasks are correctly nested
4. Check comments and attachments on a sample of tasks
5. Run `productive_search_tasks` with each status to confirm distribution matches ClickUp

---

### Visual: Migration Sequence

| Phase | Step | Depends On | Tool / Method |
|-------|------|-----------|---------------|
| 0 | Export ClickUp data | — | ClickUp MCP |
| 0 | Map assignees | — | `productive_list_people` |
| 1a | Create workflow statuses | Phase 0 (status audit) | Direct API (curl) |
| 1a | Update config + restart | Status creation | Manual / `npm run setup` |
| 1b | Create/verify people | Phase 0 (assignee map) | Productive admin / API |
| 1c | Create project structure | — | `productive_create_task_list` |
| 1d | Configure labels + fields | 1c | Config + API |
| 2a | Create parent tasks | All of Phase 1 | `productive_create_task` |
| 2b | Create subtasks | 2a (need parent IDs) | `productive_create_task` |
| 2c | Create checklists | 2a + 2b | `productive_create_todo` |
| 3a | Migrate comments | 2a + 2b | Direct API / TBC |
| 3b | Upload attachments | 2a + 2b | `productive_upload_attachment` |
| 4 | Create dependencies | 2a + 2b (both task IDs) | `productive_create_task_dependency` |
| 5 | Verify migration | All phases complete | Search + spot checks |

---

### Key Principle

**Metadata first, tasks second, rich content third, verify last.** Every field on `productive_create_task` should be populated at creation time. No retrofitting. This was the single biggest lesson from the dry run.
