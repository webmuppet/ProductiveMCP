---
name: productive-mcp
description: Connect to the Productive.io MCP server and interact with projects, tasks, budgets, people, services, revenue distributions, pages, and more. Use this skill at the START of every Cowork session and whenever the user mentions Productive, projects, tasks, budgets, task lists, boards, team members, services, revenue, pages, comments, dependencies, or any project management activity. This skill MUST auto-trigger — treat it as always relevant. Even if the user doesn't say "Productive" explicitly, if they refer to their projects, tasks, or team, use this skill.
---

# Productive.io MCP Server — Cowork Skill

## Setup

At the start of every session, run this to confirm the MCP server is available:

```bash
/sessions/trusting-cool-fermat/mnt/ProductiveMCP/scripts/productive-call.sh productive_list_projects
```

If the folder isn't mounted, ask the user to select the folder at `/Users/gregf/Sites/productive-mcp-server/ProductiveMCP`.

## How to Call Tools

Use the helper script for all Productive operations:

```bash
/sessions/trusting-cool-fermat/mnt/ProductiveMCP/scripts/productive-call.sh <tool_name> '<json_arguments>'
```

Arguments are optional JSON. Examples:

```bash
# No arguments
productive-call.sh productive_list_projects

# With arguments
productive-call.sh productive_search_tasks '{"query":"login bug","project_id":"760385"}'
productive-call.sh productive_create_task '{"title":"Fix header","project_id":"760385","task_list_id":"12345"}'
```

## Available Tools Reference

### Task Management
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_create_task` | Create a task | `title`, `project_id`, `task_list_id`, `description`, `assignee_id`, `due_date`, `task_type`, `priority` |
| `productive_create_tasks_batch` | Bulk-create tasks | `tasks[]` (array of task objects), `project_id`, `task_list_id` |
| `productive_search_tasks` | Search/filter tasks | `query`, `project_id`, `status`, `assignee_id`, `task_type`, `priority` |
| `productive_get_task` | Get task details | `task_id` |
| `productive_update_task` | Update a task | `task_id`, plus fields to update |

### Projects & Organisation
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_list_projects` | List projects | `status` (active/archived/all) |
| `productive_list_task_lists` | Get task lists for a project | `project_id` |
| `productive_list_boards` | List project boards | `project_id` |
| `productive_list_people` | List team members | (none) |

### Task Lists (full CRUD)
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_get_task_list` | Get task list details | `task_list_id` |
| `productive_create_task_list` | Create a task list | `name`, `board_id` |
| `productive_update_task_list` | Rename a task list | `task_list_id`, `name` |
| `productive_archive_task_list` | Archive a task list | `task_list_id` |
| `productive_restore_task_list` | Restore archived list | `task_list_id` |
| `productive_delete_task_list` | Permanently delete | `task_list_id` |
| `productive_reposition_task_list` | Reorder lists | `task_list_id`, `position` |
| `productive_move_task_list` | Move to another board | `task_list_id`, `board_id` |
| `productive_copy_task_list` | Duplicate a list | `task_list_id`, `board_id` |

### Budgets
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_list_budgets` | List budgets | `project_id`, `status` |
| `productive_get_budget` | Get budget details | `budget_id` |
| `productive_update_budget` | Update budget | `budget_id`, fields to update |
| `productive_mark_budget_delivered` | Mark as delivered | `budget_id` |
| `productive_close_budget` | Close a budget | `budget_id` |
| `productive_audit_project_budgets` | Audit for issues | `project_id` |

### Revenue Distributions
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_list_revenue_distributions` | List distributions | `budget_id` |
| `productive_get_revenue_distribution` | Get details | `distribution_id` |
| `productive_create_revenue_distribution` | Create distribution | `budget_id`, `amount`, `date` |
| `productive_update_revenue_distribution` | Update distribution | `distribution_id` |
| `productive_delete_revenue_distribution` | Delete distribution | `distribution_id` |
| `productive_extend_revenue_distribution` | Extend period | `distribution_id` |
| `productive_report_overdue_distributions` | Find overdue | (none) |

### Services
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_list_services` | List services | `budget_id` |
| `productive_get_service` | Get service details | `service_id` |
| `productive_create_service` | Create a service | `budget_id`, `service_type_id`, `name` |
| `productive_update_service` | Update a service | `service_id` |
| `productive_list_service_types` | List service types | (none) |
| `productive_get_service_type` | Get type details | `service_type_id` |
| `productive_create_service_type` | Create a type | `name` |
| `productive_update_service_type` | Update a type | `service_type_id` |
| `productive_archive_service_type` | Archive a type | `service_type_id` |

### Dependencies
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_create_task_dependency` | Create dependency | `source_task_id`, `target_task_id`, `type` |
| `productive_list_task_dependencies` | List dependencies | `task_id` |
| `productive_get_task_dependency` | Get details | `dependency_id` |
| `productive_update_task_dependency` | Change type | `dependency_id`, `type` |
| `productive_delete_task_dependency` | Remove dependency | `dependency_id` |
| `productive_mark_as_blocked_by` | Mark as blocked | `task_id`, `blocked_by_task_id` |
| `productive_mark_as_duplicate` | Mark as duplicate | `task_id`, `duplicate_of_task_id` |

### Pages, Comments & Attachments
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_list_pages` | List pages | `project_id` |
| `productive_search_pages` | Search pages | `query` |
| `productive_get_page` | Get page content | `page_id` |
| `productive_create_page` | Create a page | `title`, `body`, `project_id` |
| `productive_update_page` | Update a page | `page_id`, `title`, `body` |
| `productive_delete_page` | Delete a page | `page_id` |
| `productive_list_comments` | List task comments | `task_id` |
| `productive_list_attachments` | List attachments | `task_id` |
| `productive_upload_attachment` | Upload a file | `task_id`, `file_path` |

### Checklists
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_create_todo` | Create checklist item | `task_id`, `title` |
| `productive_list_todos` | List checklist items | `task_id` |
| `productive_update_todo` | Update item | `todo_id`, `completed` |
| `productive_delete_todo` | Delete item | `todo_id` |

### Subtasks
| Tool | Description | Key Args |
|------|-------------|----------|
| `productive_list_subtasks` | List child tasks | `task_id` |

## Account Context (Sandbox)

These are the known entities in this Productive sandbox account:

### Projects
- **Brand & Marketing** — ID: `760385`, Client: Gravity
- **Tika Product Development** — ID: `760491`, Client: Tika
- **WIMW 2.0 - Wallets for everyone** — ID: `760252`, Client: One NZ

### Key People
- **Greg Forsyth** — ID: `1065388`, Email: greg@thisisgravity.co

## Important Notes

- Always look up `project_id` and `task_list_id` before creating tasks
- Use `productive_list_task_lists` to find valid task list IDs
- Descriptions support Markdown (auto-converted to HTML for tasks/comments)
- Pages use Productive's ProseMirror format (handled automatically)
- Responses are capped at 25,000 characters with pagination hints
