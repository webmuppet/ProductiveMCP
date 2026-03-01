#!/bin/bash
# Productive MCP Tool Caller
# Usage: productive-call.sh <tool_name> [json_arguments]
# Environment: Set PRODUCTIVE_ENV=sandbox to use sandbox credentials
#
# Examples:
#   productive-call.sh productive_list_projects
#   productive-call.sh productive_search_tasks '{"query":"login bug","project_id":"760385"}'
#   PRODUCTIVE_ENV=sandbox productive-call.sh productive_list_deals '{"summary":true}'

TOOL_NAME="$1"
TOOL_ARGS="${2:-"{}"}"

if [ -z "$TOOL_NAME" ]; then
  echo "Usage: productive-call.sh <tool_name> [json_arguments]"
  echo "  Set PRODUCTIVE_ENV=sandbox to use sandbox credentials"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Source .env file to pick up all env vars
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# Environment selection: sandbox or production
if [ "$PRODUCTIVE_ENV" = "sandbox" ]; then
  export PRODUCTIVE_API_TOKEN="${PRODUCTIVE_SANDBOX_API_TOKEN}"
  export PRODUCTIVE_ORG_ID="${PRODUCTIVE_SANDBOX_ORG_ID}"
  export PRODUCTIVE_BASE_URL="${PRODUCTIVE_SANDBOX_BASE_URL}"

  if [ -z "$PRODUCTIVE_API_TOKEN" ] || [ -z "$PRODUCTIVE_ORG_ID" ] || [ -z "$PRODUCTIVE_BASE_URL" ]; then
    echo "ERROR: Sandbox credentials not found in .env (need PRODUCTIVE_SANDBOX_API_TOKEN, PRODUCTIVE_SANDBOX_ORG_ID, PRODUCTIVE_SANDBOX_BASE_URL)"
    exit 1
  fi
else
  # Production defaults (fall back to hardcoded sandbox if no .env — legacy compat)
  export PRODUCTIVE_API_TOKEN="${PRODUCTIVE_API_TOKEN:-070a7556-9929-45d9-bbfe-302c704dcbcd}"
  export PRODUCTIVE_ORG_ID="${PRODUCTIVE_ORG_ID:-50165}"
  export PRODUCTIVE_BASE_URL="${PRODUCTIVE_BASE_URL:-https://api.productive.io/api/v2}"
fi

export _MCP_TOOL_NAME="$TOOL_NAME"
export _MCP_TOOL_ARGS="$TOOL_ARGS"

cd "$SCRIPT_DIR" && python3 << 'PYEOF'
import subprocess, json, sys, os, time

tool_name = os.environ['_MCP_TOOL_NAME']
tool_args = json.loads(os.environ['_MCP_TOOL_ARGS'])

proc = subprocess.Popen(
    ['node', 'dist/index.js'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
    env={**os.environ}
)

def send(msg):
    proc.stdin.write((json.dumps(msg) + '\n').encode())
    proc.stdin.flush()

def read_json():
    """Read one complete JSON object from stdout, handling partial lines."""
    line = proc.stdout.readline().decode().strip()
    if not line:
        return None
    return json.loads(line)

def wait_for_id(target_id, timeout_secs=30):
    """Read lines until we get one with the target id."""
    import select
    start = time.time()
    while time.time() - start < timeout_secs:
        line = proc.stdout.readline().decode().strip()
        if not line:
            time.sleep(0.1)
            continue
        try:
            data = json.loads(line)
            if data.get('id') == target_id:
                return data
        except json.JSONDecodeError:
            continue
    return None

# Initialize handshake
send({'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2024-11-05','capabilities':{},'clientInfo':{'name':'cowork','version':'1.0.0'}}})
wait_for_id(1)

# Send initialized notification
send({'jsonrpc':'2.0','method':'notifications/initialized'})
time.sleep(0.3)

# Call the tool
send({'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':tool_name,'arguments':tool_args}})

resp = wait_for_id(2)
if not resp:
    print('ERROR: Timeout waiting for response', file=sys.stderr)
    sys.exit(1)

result = resp.get('result', {})
content = result.get('content', [])
is_error = result.get('isError', False)

if is_error or 'error' in resp:
    err = resp.get('error', {}).get('message', content[0].get('text','') if content else 'Unknown error')
    print(f'ERROR: {err}', file=sys.stderr)
    sys.exit(1)

for item in content:
    print(item.get('text', ''))

proc.stdin.close()
try:
    proc.wait(timeout=5)
except:
    proc.kill()
PYEOF
