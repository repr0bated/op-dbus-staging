# Current MCP Architecture: How Tools, Agents & Services are Exposed to Clients

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (chat-ui / curl)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP/JSON-RPC 2.0
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│           RUST BACKEND (MCP Chat Server)                         │
│                                                                  │
│  📍 Endpoints:                                                   │
│  ┌──────────────────────────────────────────────────┐          │
│  │ POST /api/chat/mcp       → MCP Handler           │          │
│  │ GET  /api/chat/models    → Models List           │          │
│  │ GET  /api/chat/status    → Server Status         │          │
│  │ GET  /api/chat/health    → Health Check          │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  🧠 ChatState Contains:                                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │ • tool_introspection (Unified Tools JSON)        │          │
│  │ • plugin_registry (NetworkPlugin, SystemdPlugin) │          │
│  │ • orchestrator (Agent Management)                │          │
│  │ • available_models (HuggingFace, Ollama)         │          │
│  └──────────────────────────────────────────────────┘          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    [TOOLS]      [AGENTS]    [EXTERNAL MCP]
```

---

## 1. TOOLS - How They're Served

### A. Tool Discovery & Registration

```rust
// At startup (server.rs:145-169)
build_unified_tool_introspection(&plugin_registry).await
  ↓
Creates unified JSON with ALL tools:
├── Plugin-derived tools (3 per plugin)
│   ├── plugin_network_query
│   ├── plugin_network_diff  
│   └── plugin_network_apply
├── Plugin-derived tools (3 per plugin)
│   ├── plugin_systemd_query
│   ├── plugin_systemd_diff
│   └── plugin_systemd_apply
└── Workflows (from WorkflowPluginIntrospection)
    ├── Network Configuration
    ├── Service Management
    └── Package Installation
```

### B. Tool Execution by Clients

**Client Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "plugin_network_query",
    "arguments": {}
  },
  "id": 1
}
```

**Server Flow** (`mcp_handler` → `execute_tool_with_orchestration`):
```rust
1. Receive JSON-RPC request
2. Parse method: "tools/call"
3. Extract tool name: "plugin_network_query"
4. Route to appropriate handler:
   
   IF tool.starts_with("plugin_"):
     execute_plugin_tool() →
       Parse plugin name & operation →
       Get plugin from registry →
       Call plugin.query/diff/apply()
   
   ELSE IF tool == "orchestrate_system_task":
     orchestrate_system_task() →
       Use orchestrator for multi-system tasks
   
   ELSE:
     execute_regular_tool() →
       AI-powered generic tool execution
```

### C. Tool Introspection Endpoint

**Request**: `GET /api/chat/status`

**Response**:
```json
{
  "service": "mcp-chat",
  "status": "active",
  "tool_count": 18,  // Auto-counted from plugins
  "ollama_available": true,
  "uptime_seconds": 3600
}
```

---

## 2. AGENTS - How They're Served

### A. Agent Registry Structure

```rust
// Orchestrator contains AgentRegistry (orchestrator.rs:56-78)
Orchestrator::new()
  ↓
AgentRegistry::new()
  ↓
load_default_specs()  // Loads 6 default agents
  ├── executor (Command Execution)
  ├── python-pro (Python Environment)
  ├── npm (NPM Package Manager)
  ├── rust (Rust Toolchain)
  ├── network (Network Config)
  └── firewall (Firewall Management)
```

### B. Agent Spawning via MCP

**Client Request** (via MCP JSON-RPC):
```json
{
  "jsonrpc": "2.0",
  "method": "agent/spawn",
  "params": {
    "agent_type": "python-pro",
    "config": {"env": {"PYTHON_VERSION": "3.11"}}
  },
  "id": 2
}
```

**Server Flow** (not yet fully exposed in mcp_handler, but available via Orchestrator):
```rust
orchestrator.spawn_agent(agent_type, config)
  ↓
AgentRegistry::spawn_agent()
  ↓
1. Validate agent type exists
2. Check max_instances limit
3. Create process via ProcessAgentFactory
4. Register instance
5. Return agent_id
```

### C. Agent Status

Agents are managed internally but can be queried:
```rust
// Via orchestrator D-Bus interface or REST API (to be added)
orchestrator.list_agents()
orchestrator.get_agent_status(agent_id)
orchestrator.kill_agent(agent_id)
```

---

## 3. EXTERNAL MCP SERVERS - Current Status

### ⚠️ NOT YET IMPLEMENTED

External MCP server integration is planned but not yet exposed. Here's how it should work:

### A. Proposed Architecture

```
op-dbus MCP Server
  ↓
  Connects to External MCP Servers:
  ├── file:///home/user/.npmclient-mcp (npm operations)
  ├── npx @modelcontextprotocol/server-github (GitHub)
  ├── docker://mcp-server-postgres (Database)
  └── Custom servers via stdio/http
```

### B. Required Implementation

```rust
// Need to add MCP client in ChatState
struct ChatState {
    // ... existing fields
    external_mcp_clients: Arc<RwLock<HashMap<String, McpClient>>>,
}

// MCP client initialization
async fn connect_external_mcp_servers() {
    // Read from config
    let mcp_servers = read_mcp_config("mcp-configs/");
    
    for server_config in mcp_servers {
        let client = McpClient::connect(server_config).await?;
        register_external_mcp(client);
    }
}
```

### C. Tool Aggregation

```rust
// Merge tools from external MCP servers
async fn build_unified_tool_introspection() {
    let mut all_tools = vec![];
    
    // 1. Plugin-derived tools (current)
    all_tools.extend(plugin_tools);
    
    // 2. Workflow tools (current)
    all_tools.extend(workflow_tools);
    
    // 3. External MCP server tools (TO ADD)
    for (name, client) in external_mcp_clients {
        let external_tools = client.list_tools().await?;
        all_tools.extend(external_tools);
    }
    
    return unified_introspection;
}
```

---

## 4. MCP JSON-RPC 2.0 Protocol

### Supported Methods (Current)

```
tools/list          → Returns all available tools
tools/call          → Execute a tool
initialize          → Initialize MCP session
ping                → Health check
```

### Tool Execution Flow

```
Client sends:
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "plugin_systemd_query",
    "arguments": {}
  },
  "id": 1
}

↓ MCP Handler (server.rs:240-360)

↓ Routing Logic:
  - Check if plugin tool
  - Get plugin from registry
  - Call plugin method
  -Execute & return result

↓ Server responds:
{
  "jsonrpc": "2.0", 
  "result": {
    "plugin": "systemd",
    "state": {...}
  },
  "id": 1
}
```

---

## 5. Current Capabilities Summary

### ✅ IMPLEMENTED

1. **Plugin Tools**
   - Auto-generated from PluginRegistry
   - 3 operations per plugin (query, diff, apply)
   - Executed via `execute_plugin_tool()`

2. **Workflow Tools**
   - Defined in `WorkflowPluginIntrospection`
   - Accessible via unified introspection

3. **System Orchestration Tools**
   - `orchestrate_system_task` - Multi-system tasks
   - `system_introspect` - System discovery
   - `workflow_orchestrate` - Workflow execution

4. **Agent Management** (via Orchestrator)
   - 6 default agent types
   - Spawn/kill/list operations
   - Health checks

5. **Model Selection**
   - HuggingFace models (primary)
   - Ollama models (backup)
   - `/api/chat/models` endpoint

### ⏳ TO BE IMPLEMENTED

1. **External MCP Server Integration**
   - MCP client connection manager
   - Tool aggregation from external servers
   - Stdio/HTTP/SSE transports

2. **Agent Tools via MCP**
   - Expose agent operations as MCP tools
   - `agent/spawn`, `agent/kill`, `agent/status` methods

3. **D-Bus Tools**
   - Direct D-Bus method calls as tools
   - Dynamic D-Bus service discovery as tools

---

## 6. How to Access Everything

### Via HTTP API:
```bash
# List all tools (includes plugins + workflows)
curl http://localhost:8080/api/chat/status

# List available models
curl http://localhost:8080/api/chat/models

# Call a tool (MCP JSON-RPC)
curl -X POST http://localhost:8080/api/chat/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "plugin_network_query",
      "arguments": {}
    },
    "id": 1
  }'
```

### Via chat-ui:
1. Open http://localhost:5173
2. Select model from dropdown
3. Chat naturally - AI auto-calls tools
4. View tool results in conversation

---

## Next Steps for Full MCP Integration

1. **Add MCP Client**: Connect to external MCP servers
2. **Expose Agents**: Make agent operations available as MCP tools
3. **Tool Discovery**: Auto-discover and register external tools
4. **Streaming**: Add SSE support for long-running tools
5. **Authentication**: Add auth for external MCP connections
