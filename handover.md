# Laptop Handover — ProductiveMCP + mcp-broker Setup

**Date:** 2026-03-18
**From:** Old MacBook
**Status at handover:** Repo rebuilt, broker configured, needs one restart to activate Productive connector.

---

## 1. What exists and where

| Thing | Location |
|-------|----------|
| ProductiveMCP repo | `~/Sites/productive-mcp-server/ProductiveMCP/` |
| mcp-broker | `~/Cowork/mcp-broker/` |
| Broker credentials | `~/.mcp-broker/secrets.env` |
| Broker config | `~/Cowork/mcp-broker/config.yaml` |
| Claude Desktop config | `~/Library/Application Support/Claude/claude_desktop_config.json` |

---

## 2. What was done this session (context)

- The repo had been moved around and `dist/` was wiped. Rebuilt with `npm install && npm run build`.
- `.env` was recreated (it's gitignored — see §4 to recreate on new machine).
- `productive.config.json` (custom field mappings) was lost — needs `npm run setup` on the new machine.
- `config.yaml` for the broker was cleaned up: webflow and Make.com moved to cloud OAuth endpoints.
- Claude Desktop needed a restart to pick up the rebuilt `dist/index.js` — the broker only connects to upstream servers at startup.

---

## 3. New laptop setup — step by step

### 3a. ProductiveMCP

```bash
# Clone the repo
git clone <origin-url> ~/Sites/productive-mcp-server/ProductiveMCP
cd ~/Sites/productive-mcp-server/ProductiveMCP

# Install and build
npm install
npm run build

# Recreate .env (see §4 for values)
cp .env.example .env
# Edit .env with your credentials

# Generate productive.config.json (discovers custom fields from the live API)
npm run setup
```

### 3b. mcp-broker

```bash
# The broker lives in the Cowork folder — sync/clone it
# Then install:
cd ~/Cowork/mcp-broker
uv venv
uv sync   # or: pip install -e .
```

### 3c. Broker secrets

Create `~/.mcp-broker/secrets.env` (never committed):

```env
# Non-OAuth API keys for broker stdio servers
PRODUCTIVE_API_TOKEN=<get from password manager>
PRODUCTIVE_ORG_ID=50165
MAKE_MCP_TOKEN=<get from password manager>
```

### 3d. claude_desktop_config.json

Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "broker": {
      "command": "uv",
      "args": [
        "run",
        "/Users/<username>/Cowork/mcp-broker/mcp-broker.py"
      ],
      "env": {
        "BROKER_CONFIG": "/Users/<username>/Cowork/mcp-broker/config.yaml"
      }
    }
  }
}
```

> Note: `uv` must be on the system PATH. Install via `curl -LsSf https://astral.sh/uv/install.sh | sh` if missing.

### 3e. config.yaml — update absolute path

The productive server entry in `~/Cowork/mcp-broker/config.yaml` has a hardcoded path:

```yaml
- name: productive
  transport: stdio
  command: node
  args:
  - /Users/gregf/Sites/productive-mcp-server/ProductiveMCP/dist/index.js
```

If your username on the new machine differs, update this path.

---

## 4. .env values (gitignored — keep in password manager)

```env
# Production
PRODUCTIVE_API_TOKEN=<Productive.io API token>
PRODUCTIVE_ORG_ID=50165

# Sandbox (for integration tests)
PRODUCTIVE_SANDBOX_API_TOKEN=<sandbox token>
PRODUCTIVE_SANDBOX_ORG_ID=50165
PRODUCTIVE_SANDBOX_BASE_URL=https://api-sandbox.productive.io/api/v2
PRODUCTIVE_SANDBOX_DEAL_STATUS_ID=642325
PRODUCTIVE_SANDBOX_PERSON_ID=1065388
PRODUCTIVE_SANDBOX_COMPANY_ID=1153539
PRODUCTIVE_SANDBOX_PROJECT_ID=881766
PRODUCTIVE_SANDBOX_TASK_ID=16479932
```

---

## 5. Verification checklist

- [ ] `npm run build` completes without errors
- [ ] `npm run test:unit` — 533 tests, 531 passing, 2 skipped
- [ ] `npm run setup` — generates `productive.config.json`
- [ ] Claude Desktop restarted after setup
- [ ] Productive appears as a connector in all three tabs (Chat, Cowork, Claude Code)
- [ ] `discover_tools()` via broker lists Productive tools

---

## 6. Architecture reminder

```
Claude Desktop (all 3 tabs: Chat / Cowork / Claude Code)
  └── claude_desktop_config.json
        └── mcp-broker (uv run mcp-broker.py)
              ├── ~/.mcp-broker/secrets.env  ← API keys loaded here
              ├── figma    → HTTP localhost:3845 (Figma Desktop app)
              ├── webflow  → HTTPS OAuth
              ├── Miro     → HTTPS OAuth
              ├── Make.com → HTTPS token URL
              └── productive → node dist/index.js (stdio)
```

The broker exposes only 3 tools (`discover_tools`, `get_tool_schema`, `execute_tool`).
Full Productive tool schemas are fetched on demand and cached per session.
