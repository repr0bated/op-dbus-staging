# MCP Server Setup for Remote Connections

The MCP (Model Context Protocol) server is now set up to accept remote connections on port 8000.

## Quick Start

### Start the MCP Server

```bash
cd /home/jeremy/op-dbus-staging
npm run mcp
```

Or use the startup script:
```bash
./start-mcp-server.sh
```

Or directly:
```bash
node mcp-server-http.js
```

## Endpoints

### HTTP POST Endpoint
- **URL**: `http://your-server-ip:8000/mcp`
- **Method**: POST
- **Content-Type**: application/json
- **Body**: MCP JSON-RPC request

Example:
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'
```

### WebSocket Endpoint
- **URL**: `ws://your-server-ip:8000/mcp-ws`
- **Protocol**: WebSocket
- **Format**: JSON-RPC messages

### Health Check
- **URL**: `http://your-server-ip:8000/health`
- **Method**: GET

## Configuration

Environment variables:
- `MCP_PORT`: Port to listen on (default: 8000)
- `BIND_IP`: IP address to bind to (default: 0.0.0.0 for all interfaces)

Example:
```bash
MCP_PORT=8000 BIND_IP=0.0.0.0 node mcp-server-http.js
```

## Connecting Remotely

### From Another Machine

1. Make sure the server is accessible (firewall allows port 8000)
2. Connect via HTTP POST or WebSocket
3. Use the server's IP address instead of localhost

### Example MCP Client Connection

```javascript
// HTTP POST example
const response = await fetch('http://your-server-ip:8000/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  })
});

// WebSocket example
const ws = new WebSocket('ws://your-server-ip:8000/mcp-ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  }));
};
```

## Dependencies

The MCP server connects to the chat-server on port 8080 to fetch and execute tools. Make sure the chat-server is running:

```bash
npm start  # Starts chat-server on port 8080
```

## Troubleshooting

1. **Port already in use**: Change `MCP_PORT` environment variable
2. **Can't connect remotely**: Check firewall rules for port 8000
3. **Tools not available**: Ensure chat-server is running on port 8080
4. **Connection refused**: Verify `BIND_IP` is set to `0.0.0.0` (not `127.0.0.1`)

## Security Notes

- The server listens on all interfaces (0.0.0.0) by default
- Consider adding authentication/authorization for production use
- Use a reverse proxy (nginx, Caddy) with TLS for secure connections
