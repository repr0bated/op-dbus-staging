# 🔌 Remote MCP Server Connection (Rust Implementation)

The chatbot now supports connecting to remote HTTPS MCP servers via the **Rust backend**. This is fully implemented in Rust - no extra Node.js servers needed!

## 🚀 Features

- ✅ **Rust-based** - All MCP client logic in Rust
- ✅ **HTTPS Support** - Connect to remote HTTPS servers
- ✅ **Optional Authentication** - Bearer tokens and API keys (both optional)
- ✅ **HuggingFace Compatible** - Uses standard MCP JSON-RPC 2.0 protocol
- ✅ **Browser Interface** - Configure via web UI

## 📋 API Endpoints

All endpoints are served by the Rust backend at `http://localhost:8080`:

### 1. Configure Remote MCP Server

```bash
POST /api/mcp/remote/configure
Content-Type: application/json

{
  "name": "my-remote-server",
  "url": "https://example.com:8443/mcp",
  "bearer_token": "optional-token",  // Optional: Authorization: Bearer
  "api_key": "optional-key"          // Optional: X-API-Key
}
```

### 2. Get All Remote Server Configurations

```bash
GET /api/mcp/remote/configs
```

### 3. Remove Remote Server

```bash
POST /api/mcp/remote/remove
Content-Type: application/json

{
  "name": "my-remote-server"
}
```

### 4. List Tools from Remote Server

```bash
GET /api/mcp/remote/tools?server=my-remote-server
```

## 🌐 Using from Browser

1. **Open the web interface**: `http://localhost:8080`
2. **Click "MCP Config" button** in the chat controls
3. **Enter server URL**: `https://example.com:8443/mcp`
4. **Optionally add authentication**:
   - Bearer Token: `Authorization: Bearer YOUR_TOKEN` (optional)
   - API Key: `X-API-Key: YOUR_KEY` (optional)
5. **Click "Save Configuration"** - The Rust backend will configure the connection
6. **Test connection** - Click "Test Connection" to verify

## 💻 Using from JavaScript Console

```javascript
// Configure remote server (via Rust backend)
await window.mcpClient.configure('https://example.com:8443/mcp', {
  name: 'my-server',
  bearerToken: 'optional-token',  // Optional
  apiKey: 'optional-key'          // Optional
});

// List tools from remote server
const tools = await window.mcpClient.listTools();

// Call a tool on remote server
const result = await window.mcpClient.callTool('tool_name', {});
```

## 🔧 Rust Implementation Details

### Remote Server Configuration

The `RemoteMcpConfig` struct in `src/mcp/mcp_client.rs`:

```rust
pub struct RemoteMcpConfig {
    pub name: String,
    pub url: String,                    // HTTPS URL with port and path
    pub bearer_token: Option<String>,    // Optional: Authorization: Bearer
    pub api_key: Option<String>,        // Optional: X-API-Key
    pub disabled: bool,
}
```

### HTTP Client

Uses `reqwest` crate for HTTP/HTTPS requests:
- Automatic HTTPS/TLS support
- Optional Bearer token authentication
- Optional API key authentication
- 30-second timeout
- Proper error handling

### Request Routing

When a request includes the `X-MCP-Server` header, the Rust backend:
1. Looks up the configured remote server
2. Makes HTTP request to the remote server with authentication headers
3. Returns the response to the browser client

## 📝 Example: Connect to HuggingFace MCP Server

```javascript
// Configure HuggingFace MCP server
await window.mcpClient.configure('https://huggingface.co/mcp', {
  name: 'huggingface',
  bearerToken: 'hf_your_token_here',  // Optional
  apiKey: null                         // Optional
});

// Use it
const tools = await window.mcpClient.listTools();
console.log('HuggingFace tools:', tools);
```

## 🔐 Authentication

Both authentication methods are **optional**:

- **Bearer Token**: `Authorization: Bearer YOUR_TOKEN`
  - Only added if token is provided
  - Compatible with HuggingFace and other OAuth2 servers

- **API Key**: `X-API-Key: YOUR_KEY`
  - Only added if key is provided
  - Compatible with custom API key authentication

## 🎯 Benefits of Rust Implementation

1. **Performance** - Native Rust HTTP client is fast
2. **Security** - Proper TLS/SSL handling
3. **Type Safety** - Compile-time guarantees
4. **No Extra Servers** - Everything in the Rust backend
5. **Memory Safe** - Rust's safety guarantees

## 📚 Related Files

- **Rust MCP Client**: `src/mcp/mcp_client.rs`
- **Rust Endpoints**: `src/mcp/chat_main.rs`
- **JavaScript Client**: `src/mcp/web/app.js`
- **Web UI**: `src/mcp/web/index.html`


