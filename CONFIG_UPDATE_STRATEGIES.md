# Config Update Mechanisms: How Clients Stay in Sync

## The Problem

If op-dbus generates the MCP config:
- ❌ New MCP servers added → Client doesn't know
- ❌ Servers disabled → Client still tries to connect
- ❌ URLs changed → Client uses stale config
- ❌ Manual re-download → Tedious

## Solution: Multiple Update Strategies

### Strategy 1: File Watching (Automatic) ✨ **RECOMMENDED**

**op-dbus watches and updates the client config file directly:**

```rust
// op-dbus monitors its own config and rewrites client configs
let client_config_paths = vec![
    "~/Library/Application Support/Claude/claude_desktop_config.json",
    "~/.config/Claude/claude_desktop_config.json",
];

// When mcp-servers.toml changes → regenerate client configs
watch_file("mcp-servers.toml", || {
    for path in client_config_paths {
        generate_and_write_config(path);
    }
});
```

**Setup:**
```bash
# One-time setup: Tell op-dbus where to write configs
op-dbus config set-client-path --claude ~/Library/Application\ Support/Claude/claude_desktop_config.json

# op-dbus now auto-updates this file when servers change
```

**Pros:**
- ✅ Fully automatic
- ✅ No client action needed
- ✅ Real-time updates

**Cons:**
- ⚠️ Requires write permission to client config
- ⚠️ Need to store client config paths

---

### Strategy 2: Pull on Demand (Client-Initiated)

**Client re-downloads config periodically:**

```bash
# Cron job or scheduled task
*/15 * * * * curl http://localhost:8080/api/mcp/_config/claude -o ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Or via systemd timer:**
```ini
# /etc/systemd/user/op-dbus-config-sync.timer
[Unit]
Description=Sync op-dbus MCP config every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/user/op-dbus-config-sync.service
[Unit]
Description=Sync op-dbus MCP config

[Service]
Type=oneshot
ExecStart=/usr/bin/curl http://localhost:8080/api/mcp/_config/claude -o %h/.config/Claude/claude_desktop_config.json
```

**Pros:**
- ✅ No permissions needed
- ✅ Works remotely
- ✅ Simple to set up

**Cons:**
- ⚠️ Delayed updates (up to 15 min)
- ⚠️ Requires cron/timer setup

---

### Strategy 3: Version-Based Refresh (Smart Client)

**Client checks config version before each use:**

```json
// op-dbus serves config with version
{
  "version": "1.2.3",
  "last_modified": "2025-11-25T14:30:00Z",
  "mcpServers": { ... }
}
```

**Client code:**
```python
# Smart MCP client
def get_config():
    local_config = load_local_config()
    remote_version = requests.get("http://localhost:8080/api/mcp/_version").json()
    
    if remote_version["version"] != local_config.get("version"):
        # Config changed, re-download
        new_config = requests.get("http://localhost:8080/api/mcp/_config").json()
        save_local_config(new_config)
        return new_config
    
    return local_config
```

**Endpoints:**
- `GET /api/mcp/_version` → `{"version": "1.2.3", "hash": "abc123"}`
- `GET /api/mcp/_config` → Full config (only if version changed)

**Pros:**
- ✅ Efficient (only downloads when changed)
- ✅ No cron needed
- ✅ Always up-to-date

**Cons:**
- ⚠️ Requires smart client
- ⚠️ Extra API call

---

### Strategy 4: SSE Config Updates (Push Notifications)

**op-dbus pushes config changes via SSE:**

```javascript
// Client listens for config updates
const configStream = new EventSource('http://localhost:8080/api/mcp/_config/events');

configStream.addEventListener('config_updated', (event) => {
    const newConfig = JSON.parse(event.data);
    saveConfig(newConfig);
    reloadMcpServers();
});
```

**Server emits:**
```rust
// When mcp-servers.toml changes
sse_broadcaster.send_event(ConfigEvent::Updated {
    new_config: generate_client_config(),
    reason: "Server 'npm' added"
});
```

**Pros:**
- ✅ Instant updates (< 1 second)
- ✅ Real-time sync
- ✅ Low overhead

**Cons:**
- ⚠️ Client must support SSE
- ⚠️ Persistent connection

---

### Strategy 5: IPC/D-Bus Notification (Linux Native)

**op-dbus broadcasts config changes via D-Bus:**

```bash
# op-dbus emits signal when config changes
dbus-send --session --type=signal \
  /org/opdbus/MCP \
  org.opdbus.MCP.ConfigUpdated \
  string:"{'version': '1.2.3'}"
```

**Client listens:**
```python
import dbus
from dbus.mainloop.glib import DBusGMainLoop

DBusGMainLoop(set_as_default=True)
bus = dbus.SessionBus()

def config_updated_handler(config_info):
    print(f"Config updated: {config_info}")
    download_new_config()

bus.add_signal_receiver(
    config_updated_handler,
    signal_name="ConfigUpdated",
    dbus_interface="org.opdbus.MCP"
)
```

**Pros:**
- ✅ Native Linux IPC
- ✅ Zero HTTP overhead
- ✅ System-wide broadcast

**Cons:**
- ⚠️ Linux-only
- ⚠️ Requires D-Bus client support

---

## Implementation: Hybrid Approach (Best of All)

**Combine multiple strategies for robustness:**

```toml
# op-dbus config
[client_sync]
# Strategy 1: Auto-write to known paths
auto_write_enabled = true
client_configs = [
    "~/Library/Application Support/Claude/claude_desktop_config.json",
    "~/.config/cline/mcp_servers.json"
]

# Strategy 2: Expose pull endpoint
pull_endpoint = "/api/mcp/_config"

# Strategy 3: Version tracking
version_endpoint = "/api/mcp/_version"

# Strategy 4: SSE push
sse_push_enabled = true
sse_endpoint = "/api/mcp/_config/events"

# Strategy 5: D-Bus notification
dbus_notify = true
dbus_interface = "org.opdbus.MCP"
```

**Client can use any or all:**
```python
class SmartMCPClient:
    def __init__(self):
        # Try SSE first (fastest)
        self.listen_sse_updates()
        
        # Fallback to version check
        self.check_version_periodically()
        
        # Last resort: periodic pull
        self.schedule_config_sync()
```

---

## Recommended Setup for Each Client

### Claude Desktop (File Watching)
```bash
# One-time setup
curl http://localhost:8080/api/mcp/_config/claude \
  -o ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Enable auto-update
op-dbus config watch --client claude \
  --path ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### Cline (Version Check)
Cline checks version on startup automatically.

### Custom Clients (SSE)
```javascript
const events = new EventSource('http://localhost:8080/api/mcp/_config/events');
events.addEventListener('config_updated', handleUpdate);
```

---

## Manual Update (Always Available)

If automatic methods fail, users can always:

```bash
# Download latest config
curl http://localhost:8080/api/mcp/_config/claude > ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or use op-dbus CLI
op-dbus update-client-config --client claude
```

---

## Config Version Endpoints

| Endpoint | Purpose | When to Use |
|----------|---------|-------------|
| `/api/mcp/_version` | Get current config version | Before downloading full config |
| `/api/mcp/_config` | Get full config | When version changed or first time |
| `/api/mcp/_config/events` | SSE stream of updates | Real-time sync |
| `/api/mcp/_sync` | Trigger sync to all clients | Manual force update |

**Version Response:**
```json
{
  "version": "1.2.3",
  "hash": "sha256:abc123...",
  "last_modified": "2025-11-25T14:30:00Z",
  "servers_count": 5,
  "changed_servers": ["npm", "github"]
}
```

---

## Best Practice Workflow

### Initial Setup:
```bash
# 1. Start op-dbus
cargo run --bin chat-server

# 2. Generate config once
curl http://localhost:8080/api/mcp/_config/claude \
  -o ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 3. Enable auto-update (choose one):

# Option A: File watching (automatic)
op-dbus config watch --client claude

# Option B: Cron sync (scheduled)
crontab -e
# Add: */15 * * * * curl http://localhost:8080/api/mcp/_config/claude -o ~/.config/Claude/claude_desktop_config.json

# Option C: SSE listener (real-time)
op-dbus-config-listener --sse http://localhost:8080/api/mcp/_config/events
```

### Updates Happen Automatically:
```
You add a new MCP server in mcp-servers.toml
  ↓
op-dbus detects change
  ↓
Regenerates config
  ↓ (choose strategy)
  
Strategy 1: Rewrites Claude config file → Done ✅
Strategy 2: Waits for cron to pull → Done in 15m ✅
Strategy 3: Client checks version on next request → Done ✅
Strategy 4: Pushes SSE event → Client updates immediately ✅
```

**No manual intervention needed!**
