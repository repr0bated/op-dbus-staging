# 🌐 MCP Browser Client

The chatbot web interface now includes a built-in MCP (Model Context Protocol) client that you can use directly from your browser!

## 🚀 Quick Start

1. **Start the chatbot server:**
   ```bash
   cargo run --bin mcp_chat
   # Or if using Node.js version:
   node chat-server.js
   ```

2. **Open the web interface:**
   ```
   http://localhost:8080
   ```

3. **Open browser console** (F12 or right-click → Inspect → Console)

4. **Test the MCP client:**
   ```javascript
   // Initialize and test connection
   await testMCPClient()
   
   // List all available tools
   const tools = await window.mcpClient.listTools()
   console.log(tools)
   
   // Call a tool
   const result = await window.mcpClient.callTool('network_interfaces', {})
   console.log(result)
   ```

## 📚 MCP Client API

The MCP client is available as `window.mcpClient` in the browser console.

### Methods

#### `initialize()`
Initialize the MCP connection (automatically called on page load).

```javascript
await window.mcpClient.initialize()
```

#### `listTools()`
Get all available MCP tools.

```javascript
const tools = await window.mcpClient.listTools()
// Returns: Array of tool objects with name, description, input_schema, etc.
```

#### `callTool(name, arguments)`
Execute an MCP tool.

```javascript
// Example: List network interfaces
const result = await window.mcpClient.callTool('network_interfaces', {})

// Example: Call a tool with parameters
const result = await window.mcpClient.callTool('network_ping', {
  target: 'google.com',
  count: 4
})
```

#### `ping()`
Test the MCP connection.

```javascript
await window.mcpClient.ping()
```

## 🔧 Implementation Details

### Rust Backend

The MCP handler in `src/mcp/chat_main.rs` supports:
- **JSON-RPC 2.0 MCP Protocol** - Standard MCP protocol
- **Legacy action-based format** - Backward compatibility

**Endpoint:** `POST /api/mcp`

**Supported Methods:**
- `initialize` - Initialize MCP connection
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `ping` - Health check

### JavaScript Frontend

The MCP client class in `src/mcp/web/app.js` provides:
- Automatic initialization on page load
- JSON-RPC 2.0 protocol support
- Error handling
- Promise-based async API

## 📝 Example Usage

### Example 1: List All Tools

```javascript
// Get all available tools
const tools = await window.mcpClient.listTools()

// Display in console
tools.forEach(tool => {
  console.log(`${tool.name}: ${tool.description}`)
})
```

### Example 2: Execute a Tool

```javascript
// Call network_interfaces tool
try {
  const result = await window.mcpClient.callTool('network_interfaces', {})
  console.log('Network interfaces:', result)
} catch (error) {
  console.error('Error:', error.message)
}
```

### Example 3: Interactive Tool Explorer

```javascript
// Create an interactive tool explorer
async function exploreTools() {
  const tools = await window.mcpClient.listTools()
  
  console.log(`Found ${tools.length} tools:\n`)
  
  for (const tool of tools) {
    console.log(`\n📦 ${tool.name}`)
    console.log(`   Description: ${tool.description}`)
    
    if (tool.input_schema?.properties) {
      console.log(`   Parameters:`)
      Object.entries(tool.input_schema.properties).forEach(([key, schema]) => {
        console.log(`     - ${key}: ${schema.type || 'any'}`)
      })
    }
  }
}

// Run it
await exploreTools()
```

## 🎯 Integration with Chat

You can also use MCP tools through the chat interface:

```
User: "List network interfaces"
AI: [Uses MCP client to call network_interfaces tool and returns results]
```

## 🔍 Troubleshooting

### "MCP Client initialization failed"

- Make sure the chatbot server is running
- Check that `/api/mcp` endpoint is accessible
- Open browser DevTools → Network tab to see request/response

### "Method not found"

- Ensure you're using the correct method names: `tools/list`, `tools/call`, `initialize`
- Check the server logs for detailed error messages

### CORS Issues

- The MCP endpoint is served from the same origin, so CORS shouldn't be an issue
- If accessing from a different origin, ensure CORS is configured in the server

## 🚀 Advanced Usage

### Custom MCP Client Instance

```javascript
// Create a custom MCP client with different base URL
const customClient = new MCPClient('http://localhost:8080')
await customClient.initialize()
```

### Error Handling

```javascript
try {
  const result = await window.mcpClient.callTool('some_tool', {})
  console.log('Success:', result)
} catch (error) {
  if (error.message.includes('Method not found')) {
    console.error('Tool does not exist')
  } else if (error.message.includes('Missing')) {
    console.error('Required parameters missing')
  } else {
    console.error('Unknown error:', error)
  }
}
```

## 📚 Related Documentation

- **MCP Protocol**: See `MCP_SERVER_SETUP.md`
- **Chatbot API**: See `CONNECT_TO_CHATBOT.md`
- **Rust Implementation**: See `src/mcp/chat_main.rs`


