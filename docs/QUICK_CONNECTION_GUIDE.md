# ⚡ Quick Connection Guide

## 🚀 Start Servers

```bash
# Terminal 1: Chat Server
node chat-server.js

# Terminal 2: MCP Server (optional)
node mcp-server-http.js
```

## 📍 Connection URLs

| Service | HTTP | HTTPS | WebSocket |
|---------|------|-------|-----------|
| **Chat Server** | `http://localhost:8080` | - | `ws://localhost:8080/ws` |
| **MCP Server** | `http://localhost:8000` | `https://localhost:8443` | `ws://localhost:8000/mcp-ws` |
| **Web UI** | `http://localhost:8000` | `https://localhost:8443` | - |

## 🔌 Quick Examples

### 1. HTTP Chat (Simple)

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### 2. MCP Client (HTTP)

```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### 3. Test with Example Client

```bash
# HTTP chat
node example-chat-client.js "Hello!"

# MCP client
node example-chat-client.js --mcp

# WebSocket
node example-chat-client.js --websocket "Hello!"
```

## 📚 Full Documentation

See `CONNECT_TO_CHATBOT.md` for complete examples in:
- JavaScript
- Python
- Bash/curl
- WebSocket clients


