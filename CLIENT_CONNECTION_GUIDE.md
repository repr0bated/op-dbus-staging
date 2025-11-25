# How Clients Connect to op-dbus as an MCP Server

## Overview

op-dbus acts as an **MCP server** that clients (Claude Desktop, AI tools, etc.) can connect to. There are multiple ways to configure this connection:

## Connection Methods

### Method 1: Auto-Generated Config (Recommended) ✨

**op-dbus generates the config file for you:**

```bash
# Start op-dbus server
cargo run --bin chat-server

# Generate Claude Desktop config
curl http://localhost:8080/api/mcp/_config/claude > ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or get the config JSON
curl http://localhost:8080/api/mcp/_config
```

**What gets generated:**
```json
{
  "mcpServers": {
    "op-dbus": {
      "command": "http",
      "url": "http://localhost:8080/api/mcp/native",
      "description": "Linux system management via D-Bus"
    },
    "op-dbus-npm": {
      "command": "http",
      "url": "http://localhost:8080/api/mcp/npm"
    },
    "op-dbus-github": {
      "command": "http",
      "url": "http://localhost:8080/api/mcp/github"
    }
  }
}
```

---

### Method 2: Manual Configuration

**You write the config file yourself:**

#### Claude Desktop
**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)  
**Location**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)  
**Location**: `~/.config/Claude/claude_desktop_config.json` (Linux)

```json
{
  "mcpServers": {
    "op-dbus": {
      "command": "http",
      "url": "http://localhost:8080/api/mcp/native"
    }
  }
}
```

#### Cline (VS Code Extension)
**Location**: VS Code settings or `.vscode/settings.json`

```json
{
  "cline.mcpServers": {
    "op-dbus": {
      "transport": "http",
      "url": "http://localhost:8080/api/mcp/native"
    }
  }
}
```

#### OpenMCP (Python)
```python
from openmcp import MCPClient

client = MCPClient("http://localhost:8080/api/mcp/native")
tools = await client.list_tools()
```

---

## Connection Architecture

```
┌─────────────────────────────────────┐
│   Claude Desktop / AI Client         │
└──────────────┬──────────────────────┘
               │ Reads config from:
               │ claude_desktop_config.json
               ▼
{
  "mcpServers": {
    "op-dbus": {
      "url": "http://localhost:8080/api/mcp/native"
    }
  }
}
               │
               ▼
┌─────────────────────────────────────┐
│   op-dbus MCP Server                 │
│   http://localhost:8080              │
│                                      │
│   Endpoints:                         │
│   /api/mcp/native   → plugins,agents │
│   /api/mcp/npm      → npm tools      │
│   /api/mcp/github   → GitHub ops     │
│   /api/mcp/_config  → Generate cfg   │
│   /api/mcp/_discover → List servers  │
└─────────────────────────────────────┘
```

---

## Generated vs Manual Config

### Auto-Generated Config (Via `/api/mcp/_config`)

**Pros:**
- ✅ Always up-to-date with available servers
- ✅ Correct URLs automatically
- ✅ Includes all enabled external servers
- ✅ No manual editing needed

**Cons:**
- ⚠️ Requires op-dbus running to generate
- ⚠️ Need to regenerate if servers change

**Usage:**
```bash
# Download config directly
curl http://localhost:8080/api/mcp/_config/claude \
  -o ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or preview it first
curl http://localhost:8080/api/mcp/_config | jq
```

### Manual Config

**Pros:**
- ✅ Works offline
- ✅ Full control over what's exposed
- ✅ Can customize per client

**Cons:**
- ⚠️ Must update manually when servers change
- ⚠️ Easy to make typos
- ⚠️ Need to know available endpoints

---

## Single Config vs Multiple Endpoints

### ❌ NOT Like This (Monolithic):
```json
{
  "mcpServers": {
    "everything": {
      "url": "http://localhost:8080/api/mcp"
    }
  }
}
```
All tools from all servers mixed together.

### ✅ Like This (Individual):
```json
{
  "mcpServers": {
    "op-dbus-native": {
      "url": "http://localhost:8080/api/mcp/native",
      "description": "System tools, plugins, agents"
    },
    "op-dbus-npm": {
      "url": "http://localhost:8080/api/mcp/npm",
      "description": "NPM package management"
    },
    "op-dbus-github": {
      "url": "http://localhost:8080/api/mcp/github",
      "description": "GitHub operations"
    }
  }
}
```
Each server isolated, client can choose which to use.

---

## Discovery Flow

### 1. Client Discovers Available Servers
```bash
curl http://localhost:8080/api/mcp/_discover
```

Response:
```json
{
  "servers": [
    {
      "name": "native",
      "endpoint": "/api/mcp/native",
      "protocol": "MCP JSON-RPC 2.0",
      "sse_endpoint": "/api/mcp/native/events",
      "tools_count": 24
    },
    {
      "name": "npm",
      "endpoint": "/api/mcp/npm",
      "sse_endpoint": "/api/mcp/npm/events",
      "tools_count": 12
    }
  ]
}
```

### 2. Client Generates Config
```bash
curl http://localhost:8080/api/mcp/_config
```

### 3. Client Connects to Desired Servers
Based on config, client connects to:
- `/api/mcp/native` for system tools
- `/api/mcp/npm` for package management
- etc.

---

## Environment-Specific Configs

### Development (Local)
```json
{
  "mcpServers": {
    "op-dbus": {
      "url": "http://localhost:8080/api/mcp/native"
    }
  }
}
```

### Production (Remote Server)
```json
{
  "mcpServers": {
    "op-dbus": {
      "url": "https://your-server.com:8443/api/mcp/native",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

### Via ngrok (Tunnel)
```json
{
  "mcpServers": {
    "op-dbus": {
      "url": "https://abc123.ngrok.io/api/mcp/native"
    }
  }
}
```

---

## Stdio Wrapper (Alternative Transport)

Some clients only support stdio. Use the wrapper:

```bash
# Install wrapper
curl http://localhost:8080/api/mcp/_wrapper > /usr/local/bin/op-dbus-mcp
chmod +x /usr/local/bin/op-dbus-mcp

# Configure client for stdio
{
  "mcpServers": {
    "op-dbus": {
      "command": "/usr/local/bin/op-dbus-mcp"
    }
  }
}
```

The wrapper converts stdio ↔ HTTP requests.

---

## Configuration Endpoints

| Endpoint | Purpose | Output |
|----------|---------|--------|
| `/api/mcp/_config` | Raw config JSON | Generic MCP config |
| `/api/mcp/_config/claude` | Claude Desktop | Formatted for Claude |
| `/api/mcp/_config/cline` | Cline VS Code | Formatted for Cline |
| `/api/mcp/_discover` | Server list | Available MCP servers |
| `/api/mcp/_wrapper` | Stdio script | Bash wrapper for stdio |

---

## Quick Setup (Copy-Paste)

### For Claude Desktop:
```bash
# 1. Start op-dbus
cargo run --bin chat-server

# 2. Generate & install config
curl http://localhost:8080/api/mcp/_config/claude \
  -o ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 3. Restart Claude Desktop

# 4. Ask Claude: "List available MCP tools"
```

### For Custom Client:
```bash
# 1. Discover servers
curl http://localhost:8080/api/mcp/_discover

# 2. Get config template
curl http://localhost:8080/api/mcp/_config

# 3. Customize and use
```

---

## Answer to Your Question

**Q: Is the JSON generated or does one config point to op-dbus as MCP server?**

**A: Both!**

1. **Auto-Generated** (Recommended):
   - op-dbus generates the JSON config file
   - Endpoint: `GET /api/mcp/_config`
   - Always correct and up-to-date
   - Example: `curl http://localhost:8080/api/mcp/_config/claude`

2. **Manual Config**:
   - You write the config file yourself
   - Points to op-dbus endpoint
   - More control, but must maintain manually
   - Example: Add `{"url": "http://localhost:8080/api/mcp/native"}` to Claude config

**Best Practice**: Use auto-generated config, regenerate when servers change.
