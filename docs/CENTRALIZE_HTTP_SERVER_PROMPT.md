# Agent Prompt: Centralize MCP HTTP Servers

## 🎯 Mission
Consolidate 5+ scattered HTTP servers into a single, centralized Axum HTTP server for all MCP services.

## 📊 Current Situation Analysis
- **Multiple HTTP servers:** chat_main.rs, web_bridge_improved.rs, web_bridge.rs, manager.rs, chat_orchestrator.rs
- **Problems:** Port conflicts, duplicate TLS setup, inconsistent middleware, overlapping routes
- **Routes conflict:** /api/*, /ws, static file serving
- **Current binary:** mcp_chat (running on port 8443)

## 🏗️ Target Architecture

### Create: `src/mcp/http_server.rs`
Single Axum server with unified routing:

```
/api/chat/*      -> MCP Chat endpoints (mcp_handler, remote MCP config, models)
/api/dbus/*      -> D-Bus MCP bridge endpoints  
/api/agents/*    -> Agent management & execution
/api/tools/*     -> Tool registry & execution
/api/system/*    -> System introspection
/api/discovery/* -> Service discovery
/ws/chat         -> Chat WebSocket
/ws/events       -> Event WebSocket
/ws/dbus         -> D-Bus WebSocket
/                -> Unified web UI (static files)
```

### Key Components:
- **Single HTTPS server** on port 8443
- **Unified TLS/certificate management** 
- **Consistent middleware:** CORS, auth, logging, tracing
- **Path-based routing** to different MCP services

## 🔄 Implementation Steps

### Step 1: Create Centralized HTTP Server
```bash
# Create the new central server file
touch src/mcp/http_server.rs
```

### Step 2: Extract Handler Functions
From each existing server, extract handlers into modules:

**From chat_main.rs:**
- `mcp_handler` -> `src/mcp/handlers/chat.rs`
- `configure_remote_mcp_server`, `get_remote_mcp_configs`, etc. -> `src/mcp/handlers/chat.rs`
- `get_models`, `get_provider_models`, etc. -> `src/mcp/handlers/chat.rs`
- `websocket_handler` -> `src/mcp/handlers/chat.rs`

**From web_bridge_improved.rs:**
- `api_status`, `api_list_tools`, `api_execute_tool` -> `src/mcp/handlers/agents.rs`
- `api_list_agents`, `api_spawn_agent`, etc. -> `src/mcp/handlers/agents.rs`
- `websocket_handler` -> `src/mcp/handlers/agents.rs`

**From manager.rs:**
- `list_servers`, `create_server`, etc. -> `src/mcp/handlers/manager.rs`
- `list_tools`, `execute_tool` -> `src/mcp/handlers/manager.rs`
- `get_introspection`, `run_introspection` -> `src/mcp/handlers/manager.rs`

### Step 3: Create Handler Modules
```rust
// src/mcp/handlers/mod.rs
pub mod chat;
pub mod agents;
pub mod manager;
pub mod system;
pub mod discovery;

// Re-export handlers
pub use chat::*;
pub use agents::*;
pub use manager::*;
pub use system::*;
pub use discovery::*;
```

### Step 4: Implement Central Router
```rust
// src/mcp/http_server.rs
use axum::{
    Router, routing::{get, post}, extract::State
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use std::sync::Arc;

#[derive(Clone)]
pub struct HttpServerState {
    pub chat_state: ChatState,
    pub agent_state: AgentState, 
    pub manager_state: ManagerState,
    pub system_state: SystemState,
}

pub fn create_router(state: HttpServerState) -> Router {
    Router::new()
        // Chat service routes
        .nest("/api/chat", create_chat_router(state.chat_state))
        // Agent service routes  
        .nest("/api/agents", create_agents_router(state.agent_state))
        // Manager service routes
        .nest("/api/manager", create_manager_router(state.manager_state))
        // System service routes
        .nest("/api/system", create_system_router(state.system_state))
        // WebSocket routes
        .route("/ws/chat", get(chat_websocket_handler))
        .route("/ws/events", get(events_websocket_handler))
        // Static files
        .nest_service("/", ServeDir::new("src/mcp/web"))
        // Middleware
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
```

### Step 5: Update Main Function
```rust
#[tokio::main]
async fn main() -> Result<()> {
    // Initialize all service states
    let chat_state = initialize_chat_state().await?;
    let agent_state = initialize_agent_state().await?;
    let manager_state = initialize_manager_state().await?;
    let system_state = initialize_system_state().await?;
    
    let server_state = HttpServerState {
        chat_state,
        agent_state,
        manager_state,
        system_state,
    };
    
    let app = create_router(server_state);
    
    // HTTPS server setup (same as current chat_main.rs)
    // ... certificate detection and server startup
}
```

### Step 6: Update Cargo.toml
```toml
[[bin]]
name = "mcp_http_server"
path = "src/mcp/http_server.rs"
```

### Step 7: Update Route Paths
Update all frontend code and documentation to use new paths:
- `/api/mcp` -> `/api/chat/mcp`
- `/api/tools` -> `/api/agents/tools` 
- `/api/servers` -> `/api/manager/servers`
- `/ws` -> `/ws/chat`

### Step 8: Testing
Test all endpoints work:
```bash
# Test chat endpoints
curl -k https://localhost:8443/api/chat/mcp -X POST -d '{"method":"tools/list"}'

# Test agent endpoints  
curl -k https://localhost:8443/api/agents/tools

# Test WebSocket
# ... WebSocket connection tests
```

### Step 9: Migration
1. Deploy new server
2. Update all client code
3. Remove old server binaries from Cargo.toml
4. Update documentation

## ✅ Success Criteria
- [ ] Single HTTP server running on port 8443
- [ ] All MCP services accessible via unified API
- [ ] Web UI loads correctly
- [ ] WebSocket connections work
- [ ] No port conflicts
- [ ] Consistent middleware across all routes
- [ ] All existing functionality preserved

## 🛠️ Required Dependencies
Ensure these are in Cargo.toml:
```toml
axum = { version = "0.7", features = ["ws", "macros"] }
axum-server = { version = "0.6", features = ["tls-rustls"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "fs"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## 🔧 Technical Details
- **State Management:** Each service maintains its own state
- **Error Handling:** Consistent error responses across services
- **Authentication:** Unified auth middleware at top level
- **Logging:** Centralized logging with service prefixes
- **Health Checks:** `/health` endpoint for overall system status

## 🚨 Important Notes
- **Preserve all existing functionality** - this is a refactor, not a rewrite
- **Maintain backward compatibility** where possible
- **Test thoroughly** - multiple services now depend on single server
- **Monitor resource usage** - single server may need more resources
- **Document new API paths** for client updates

Execute this plan step by step, testing at each stage before proceeding.
