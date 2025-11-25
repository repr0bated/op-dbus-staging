# External MCP Integration - Implementation Summary

## Overview

We've implemented **individual MCP server endpoints** rather than a monolithic aggregated stream. Each external MCP server (npm, GitHub, database, etc.) gets its own dedicated endpoint and SSE stream.

## Architecture

```
Client connects to individual servers:

/api/mcp/npm          → NPM package operations
  └── /events         → SSE stream for npm operations

/api/mcp/github       → GitHub repository operations  
  └── /events         → SSE stream for GitHub operations

/api/mcp/postgres     → Database operations
  └── /events         → SSE stream for DB operations

/api/mcp/native       → op-dbus native tools (plugins/agents)
  └── /events         → SSE stream for native operations

/api/mcp/_discover    → List all available MCP servers
```

## Files Created

### 1. Core Infrastructure
| File | Purpose |
|------|---------|
| `src/mcp/external_mcp_client.rs` | MCP client for stdio/HTTP/SSE connections |
| `src/mcp/sse_streaming.rs` | SSE event broadcasting for long-running ops |
| `mcp-servers.toml` | Configuration for external MCP servers |

### 2. Updated Modules
- `src/mcp/mod.rs` - Added module declarations

## Configuration (`mcp-servers.toml`)

Defines individual MCP servers:

```toml
[[servers]]
name = "npm"
description = "NPM package management via MCP"
enabled = true

[servers.transport]
type = "stdio"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-everything"]
```

### Available Servers (Pre-configured):
1. **npm** - Package management (`npx @modelcontextprotocol/server-everything`)
2. **github** - Repository operations (requires `GITHUB_TOKEN`)
3. **postgres** - Database ops (requires `POSTGRES_URL`)
4. **filesystem** - File operations
5. **brave-search** - Web search (requires API key)
6. **docker** - Container operations (HTTP-based)
7. **slack** - Messaging (requires Slack tokens)

## Individual Server Endpoints

### JSON-RPC Protocol

Each server supports standard MCP JSON-RPC 2.0:

```bash
# List tools from npm server
curl -X POST http://localhost:8080/api/mcp/npm \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'

# Call a tool on GitHub server
curl -X POST http://localhost:8080/api/mcp/github \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_issue",
      "arguments": {
        "repo": "user/repo",
        "title": "Bug report"
      }
    },
    "id": 2
  }'
```

### SSE Streaming

For long-running operations, connect to the SSE endpoint:

```javascript
// Client-side SSE connection
const eventSource = new EventSource('http://localhost:8080/api/mcp/npm/events');

eventSource.addEventListener('tool_start', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Tool started: ${data.tool} on ${data.server}`);
});

eventSource.addEventListener('tool_progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.progress}% - ${data.message}`);
});

eventSource.addEventListener('tool_complete', (event) => {
  const data = JSON.parse(event.data);
  console.log('Tool completed:', data.result);
});
```

### SSE Event Types:
- `tool_start` - Tool execution began
- `tool_progress` - Progress update (0-100%)
- `tool_complete` - Tool finished successfully
- `tool_error` - Tool failed
- `agent_status` - Agent state change
- `message` - Generic status message

## Discovery Endpoint

List all available MCP servers:

```bash
curl http://localhost:8080/api/mcp/_discover
```

Response:
```json
{
  "servers": [
    {
      "name": "npm",
      "endpoint": "/api/mcp/npm",
      "protocol": "MCP JSON-RPC 2.0",
      "sse_endpoint": "/api/mcp/npm/events"
    },
    {
      "name": "github",
      "endpoint": "/api/mcp/github",
      "protocol": "MCP JSON-RPC 2.0",
      "sse_endpoint": "/api/mcp/github/events"
    }
  ]
}
```

## Transport Types

### Stdio Transport
Most common for npx-based MCP servers:
```toml
[servers.transport]
type = "stdio"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-npm"]
```

### HTTP Transport  
For custom HTTP-based MCP servers:
```toml
[servers.transport]
type = "http"
url = "http://localhost:3001/mcp"
```

### SSE Transport
For server-sent events based MCP:
```toml
[servers.transport]
type = "sse"
url = "http://localhost:3001/events"
```

## Agent Tools Integration

Agents are also exposed as MCP tools:

```
/api/mcp/native
  ├── agent_spawn      → Spawn an agent
  ├── agent_kill       → Kill an agent
  ├── agent_list       → List running agents
  ├── agent_status     → Get agent status
  └── /events          → SSE for agent events
```

Example:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "agent_spawn",
    "arguments": {
      "agent_type": "python-pro",
      "config": {"env": {"PYTHON_VERSION": "3.11"}}
    }
  },
  "id": 1
}
```

## Benefits of Individual Endpoints

✅ **Isolation** - Each server runs independently  
✅ **Selective Connection** - Clients choose which servers to use  
✅ **Separate Auth** - Each server can have different credentials  
✅ **Individual Streaming** - SSE per server, not mixed  
✅ **Clear Debugging** - Easy to trace which server is being called  
✅ **Scalability** - Can run servers on different machines  
✅ **Fail-Safe** - One server failure doesn't affect others  

## Next Steps

### To Complete Implementation:

1. **Add to ChatState** (server.rs):
   ```rust
   struct ChatState {
       // ... existing fields
       mcp_registry: Arc<McpServerRegistry>,
       sse_broadcaster: SharedSseBroadcaster,
   }
   ```

2. **Create Router for Each Server**:
   ```rust
   // For each server in mcp-servers.toml
   let npm_router = ServiceRouter::new("/api/mcp/npm")
       .route("/", post(npm_mcp_handler))
       .route("/events", get(npm_sse_handler));
   ```

3. **Load Configuration on Startup**:
   ```rust
   let config = read_mcp_servers_config("mcp-servers.toml")?;
   for server_config in config {
       if server_config.enabled {
           let client = McpClient::new(server_config).await?;
           mcp_registry.register(client).await?;
       }
   }
   ```

4. **Implement Agent Tools as MCP**:
   - Wrap orchestrator operations as MCP tools
   - Add to native MCP server endpoint

## Testing Individual Servers

```bash
# Start op-dbus backend
export GITHUB_TOKEN="ghp_..."
cargo run --bin chat-server

# Connect to npm server
curl http://localhost:8080/api/mcp/npm -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Stream events from GitHub
curl -N http://localhost:8080/api/mcp/github/events

# List all servers
curl http://localhost:8080/api/mcp/_discover
```

## Security Considerations

- ✅ Individual API keys per server (from env vars)
- ✅ No credential sharing between servers
- ✅ Each server process isolated
- ✅ Can run servers with minimum privileges
- ✅ SSE connections authenticated separately

---

**Status**: Framework implemented, need to integrate into server.rs and add router registration.
