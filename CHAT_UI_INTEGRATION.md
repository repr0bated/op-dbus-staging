# Chat-UI Integration Plan
## Integrating HuggingFace chat-ui as Frontend for op-dbus MCP Chat

### Architecture Overview

```
┌─────────────────────────────────────────┐
│  HuggingFace chat-ui (Frontend)         │
│  - SvelteKit + TypeScript                │
│  - Port: 5173 (dev) / 3000 (prod)        │
└──────────────┬──────────────────────────┘
               │ HTTP/WebSocket
               │ /api/chat/*
               ▼
┌─────────────────────────────────────────┐
│  Rust Backend (op-dbus)                  │
│  - Axum HTTP Server                      │
│  - MCP Chat Server                       │
│  - Port: 8080 (HTTP) / 8443 (HTTPS)      │
└─────────────────────────────────────────┘
```

### Current Setup
- **Backend**: Rust Axum server at `/api/chat`
- **Frontend**: Currently serving from `src/mcp/web`
- **New Frontend**: HuggingFace chat-ui in `chat-ui/` submodule

### Integration Steps

#### 1. Configure chat-ui to Connect to Rust Backend

**File: `chat-ui/.env.local`** (create this)
```bash
# Backend API endpoint
PUBLIC_ORIGIN=http://localhost:8080
PUBLIC_API_BASE=/api/chat

# Model Configuration (use your Ollama setup)
MODELS='[
  {
    "name": "mistral",
    "displayName": "Mistral",
    "description": "op-dbus native AI",
    "endpoints": [{
      "type": "custom",
      "url": "http://localhost:8080/api/chat/mcp"
    }]
  }
]'

# MongoDB (optional - can use in-memory for dev)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=chat-ui

# Disable features not needed for op-dbus
ENABLE_ASSISTANTS=false
EXPOSE_API=false
```

#### 2. Update Rust Backend for chat-ui Compatibility

The chat-ui expects certain API endpoints. We need to adapt our MCP handler to match the chat-ui API format.

**Required Endpoints:**
- `POST /api/chat/mcp` - Main chat endpoint (already exists)
- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations` - Create conversation
- `DELETE /api/chat/conversations/:id` - Delete conversation
- `POST /api/chat/conversations/:id/messages` - Send message
- `GET /api/chat/models` - List available models

#### 3. Proxy Configuration

**Option A: Development** - Run both servers separately
- chat-ui dev server: `http://localhost:5173`
- Rust backend: `http://localhost:8080`
- Use CORS + proxy in `chat-ui/vite.config.ts`

**Option B: Production** - Serve chat-ui from Rust
- Build chat-ui: `npm run build` → `chat-ui/build/`
- Serve from Rust: `.static_dir("/", "chat-ui/build")`

### Files to Create/Modify

#### 1. `chat-ui/.env.local` (New)
Backend connection configuration (see above)

#### 2. `chat-ui/vite.config.ts` (Modify)
Add proxy for development:
```typescript
export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

#### 3. `src/mcp/chat/server.rs` (Modify)
Add chat-ui compatible endpoints:
- Conversation management
- Model listing
- Message formatting

#### 4. `chat-ui/src/lib/server/endpoints/custom/index.ts` (New)
Custom endpoint adapter for op-dbus

### Development Workflow

```bash
# Terminal 1: Run Rust backend
cd /home/jeremy/git/op-dbus-staging
cargo run --bin chat-server

# Terminal 2: Run chat-ui dev server
cd chat-ui
npm install
npm run dev

# Access at: http://localhost:5173
```

### Production Build

```bash
# Build chat-ui
cd chat-ui
npm run build

# Update Rust to serve from chat-ui/build
# (modify server.rs line 194)

# Run Rust backend
cargo run --release --bin chat-server
```

### Benefits of This Integration

1. **Modern UI**: Beautiful, responsive chat interface from HuggingFace
2. **Native Backend**: All AI/plugin/agent logic stays in Rust
3. **MCP Integration**: Leverage MCP protocol for tool/agent calls
4. **Flexibility**: Can easily swap frontends or add multiple UIs

### Next Steps

Would you like me to:
1. Create the `.env.local` configuration file?
2. Add chat-ui compatible endpoints to the Rust backend?
3. Update the vite config for proxy?
4. Create a custom endpoint adapter?
5. All of the above?
