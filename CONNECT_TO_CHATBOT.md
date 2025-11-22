# 🔌 How to Connect to the Chatbot via Localhost

This guide shows you how to connect to the chatbot using either an **HTTPS/HTTP client** or an **MCP client**.

## 📋 Server Overview

The system runs multiple servers:

1. **Chat Server** (Port 8080) - Direct chatbot API
2. **MCP Server** (Port 8000) - MCP protocol endpoint
3. **HTTPS Server** (Port 8443) - Secure web interface (if enabled)

## 🚀 Quick Start

### Start the Servers

```bash
# Terminal 1: Start the chat server
node chat-server.js

# Terminal 2: Start the MCP server (optional, for MCP clients)
node mcp-server-http.js
```

## 🌐 Method 1: HTTPS/HTTP Client Connection

### Available Endpoints

#### Chat Server (Port 8080)

- **Base URL**: `http://localhost:8080`
- **WebSocket**: `ws://localhost:8080/ws`

#### MCP Server (Port 8000)

- **Base URL**: `http://localhost:8000`
- **HTTPS**: `https://localhost:8443` (if enabled)
- **WebSocket**: `ws://localhost:8000/mcp-ws`
- **Secure WebSocket**: `wss://localhost:8443/mcp-ws` (if HTTPS enabled)

### 1. Send Chat Messages (HTTP POST)

```bash
# Using curl
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how can you help me?"
  }'
```

```javascript
// Using fetch (JavaScript)
const response = await fetch('http://localhost:8080/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello, how can you help me?'
  })
});

const data = await response.json();
console.log(data.message); // AI response
```

```python
# Using requests (Python)
import requests

response = requests.post(
    'http://localhost:8080/api/chat',
    json={'message': 'Hello, how can you help me?'}
)

print(response.json()['message'])
```

### 2. WebSocket Connection (Real-time Chat)

```javascript
// JavaScript WebSocket client
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  console.log('Connected to chatbot');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'chat',
    message: 'Hello!',
    timestamp: Date.now()
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('AI Response:', data.content);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from chatbot');
};
```

```python
# Python WebSocket client
import asyncio
import websockets
import json

async def chat_client():
    uri = "ws://localhost:8080/ws"
    async with websockets.connect(uri) as websocket:
        # Send message
        message = {
            "type": "chat",
            "message": "Hello!",
            "timestamp": int(time.time() * 1000)
        }
        await websocket.send(json.dumps(message))
        
        # Receive response
        response = await websocket.recv()
        data = json.loads(response)
        print("AI Response:", data['content'])

asyncio.run(chat_client())
```

### 3. Get Available Tools

```bash
curl http://localhost:8080/api/tools
```

```javascript
const response = await fetch('http://localhost:8080/api/tools');
const data = await response.json();
console.log('Available tools:', data.tools);
```

### 4. Execute a Tool

```bash
curl -X POST http://localhost:8080/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "network_interfaces",
    "arguments": {}
  }'
```

### 5. Get Models and Switch Provider

```bash
# Get available models
curl http://localhost:8080/api/models

# Switch provider
curl -X POST http://localhost:8080/api/provider/select \
  -H "Content-Type: application/json" \
  -d '{"provider": "huggingface"}'

# Switch model
curl -X POST http://localhost:8080/api/models/select \
  -H "Content-Type: application/json" \
  -d '{"modelId": "Qwen/Qwen2.5-72B-Instruct"}'
```

### 6. Health Check

```bash
curl http://localhost:8080/api/health
```

## 🔌 Method 2: MCP Client Connection

The MCP (Model Context Protocol) server provides a standardized protocol for AI assistants.

### MCP Endpoints

- **HTTP MCP**: `http://localhost:8000/mcp`
- **HTTPS MCP**: `https://localhost:8443/mcp` (if enabled)
- **WebSocket MCP**: `ws://localhost:8000/mcp-ws`
- **Secure WebSocket MCP**: `wss://localhost:8443/mcp-ws` (if enabled)

### 1. MCP HTTP POST Client

```bash
# Initialize MCP connection
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "my-client",
        "version": "1.0.0"
      }
    }
  }'
```

```javascript
// JavaScript MCP HTTP client
async function mcpRequest(method, params = {}) {
  const response = await fetch('http://localhost:8000/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'your-api-key' // If API key auth is enabled
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    })
  });
  
  return await response.json();
}

// List available tools
const tools = await mcpRequest('tools/list');
console.log('MCP Tools:', tools);

// Call a tool
const result = await mcpRequest('tools/call', {
  name: 'network_interfaces',
  arguments: {}
});
console.log('Tool Result:', result);
```

```python
# Python MCP HTTP client
import requests

def mcp_request(method, params=None):
    url = 'http://localhost:8000/mcp'
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key'  # If API key auth is enabled
    }
    payload = {
        'jsonrpc': '2.0',
        'id': 1,
        'method': method,
        'params': params or {}
    }
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# List tools
tools = mcp_request('tools/list')
print('MCP Tools:', tools)

# Call a tool
result = mcp_request('tools/call', {
    'name': 'network_interfaces',
    'arguments': {}
})
print('Tool Result:', result)
```

### 2. MCP WebSocket Client

```javascript
// JavaScript MCP WebSocket client
const ws = new WebSocket('ws://localhost:8000/mcp-ws');

ws.onopen = () => {
  console.log('Connected to MCP server');
  
  // Initialize
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'my-client',
        version: '1.0.0'
      }
    }
  }));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('MCP Response:', response);
  
  // Handle different response types
  if (response.method === 'server/ready') {
    console.log('MCP Server is ready!');
    
    // List tools
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }));
  } else if (response.result) {
    console.log('Result:', response.result);
  }
};

ws.onerror = (error) => {
  console.error('MCP WebSocket error:', error);
};
```

```python
# Python MCP WebSocket client
import asyncio
import websockets
import json

async def mcp_websocket_client():
    uri = "ws://localhost:8000/mcp-ws"
    async with websockets.connect(uri) as websocket:
        # Initialize
        init_message = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "python-client",
                    "version": "1.0.0"
                }
            }
        }
        await websocket.send(json.dumps(init_message))
        
        # Listen for responses
        while True:
            response = await websocket.recv()
            data = json.loads(response)
            print("MCP Response:", data)
            
            if data.get('method') == 'server/ready':
                # List tools
                tools_request = {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/list",
                    "params": {}
                }
                await websocket.send(json.dumps(tools_request))

asyncio.run(mcp_websocket_client())
```

### 3. MCP Methods Available

- `initialize` - Initialize MCP connection
- `tools/list` - List all available tools
- `tools/call` - Execute a tool
- `ping` - Health check

## 🔐 Authentication

### API Key Authentication (MCP Server)

If API key authentication is enabled, include the API key in headers:

```bash
curl -X POST http://localhost:8000/mcp \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '...'
```

Set API keys via environment variable:
```bash
export MCP_API_KEYS="key1,key2,key3"
```

## 📝 Complete Example: Simple Chat Client

```javascript
// complete-chat-client.js
class ChatbotClient {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }

  async sendMessage(message) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return await response.json();
  }

  async getTools() {
    const response = await fetch(`${this.baseUrl}/api/tools`);
    return await response.json();
  }

  async executeTool(toolName, arguments_ = {}) {
    const response = await fetch(`${this.baseUrl}/api/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: toolName,
        arguments: arguments_
      })
    });
    return await response.json();
  }
}

// Usage
const client = new ChatbotClient();

// Send a message
const chatResponse = await client.sendMessage('What tools do you have?');
console.log('AI:', chatResponse.message);

// Get available tools
const tools = await client.getTools();
console.log('Tools:', tools.tools.map(t => t.name));

// Execute a tool
const result = await client.executeTool('network_interfaces');
console.log('Network Interfaces:', result);
```

## 🌐 Web Interface

You can also use the web interface:

- **HTTP**: http://localhost:8000
- **HTTPS**: https://localhost:8443 (if enabled)

The web interface provides a full chat UI with:
- Provider and model selection
- Real-time chat
- Tool execution
- System discovery
- Agent management

## 🔍 Troubleshooting

### Connection Refused

```bash
# Check if servers are running
ps aux | grep -E "chat-server|mcp-server"

# Check if ports are in use
netstat -tuln | grep -E "8080|8000|8443"

# Start servers if not running
node chat-server.js &
node mcp-server-http.js &
```

### CORS Issues

If connecting from a browser, ensure CORS is enabled in the server configuration.

### API Key Required

If you get authentication errors, check if API key authentication is enabled:
```bash
# Disable API key auth (for development)
export MCP_API_ENABLED=false

# Or set valid API keys
export MCP_API_KEYS="your-key-here"
```

## 📚 Additional Resources

- **MCP Protocol**: See `MCP_SERVER_SETUP.md`
- **API Documentation**: See server logs on startup for all endpoints
- **Web Interface**: See `WEB-INTERFACE-README.md`


