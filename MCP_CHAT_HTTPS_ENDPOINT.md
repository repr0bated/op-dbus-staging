# MCP Chat HTTPS Endpoint

## HTTPS Endpoints for proxmox.ghostbridge.tech

The MCP chat server provides multiple HTTPS endpoints (all equivalent):

### Primary Endpoints

1. **Recommended for HuggingFace browser client:**
   ```
   https://proxmox.ghostbridge.tech:8443/mcp-chat
   ```

2. **Alternative endpoints:**
   ```
   https://proxmox.ghostbridge.tech:8443/api/mcp
   https://proxmox.ghostbridge.tech:8443/mcp
   ```

### Web Interface

```
https://proxmox.ghostbridge.tech:8443
```

## Usage Examples

### cURL Request

```bash
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### With Optional Authentication Headers

```bash
# With API Key (optional)
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# With Bearer Token (optional)
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### HuggingFace Browser Client Configuration

```
URL: https://proxmox.ghostbridge.tech:8443/mcp-chat
```

Optional headers (not required):
- `X-API-Key: your-key`
- `Authorization: Bearer your-token`
- `X-Password: your-password`

## Certificate Information

- **Certificate Type**: Cloudflare Origin Certificate (served via reverse proxy)
- **Valid Until**: November 18, 2040
- **Local Certificates**: `/etc/ssl/certs/proxmox-ghostbridge.crt` and `/etc/ssl/private/proxmox-ghostbridge.key`
- **Auto-detected**: Server automatically detects certificates via introspection

## Starting the Server

The server automatically detects configuration:

```bash
# Just start - auto-detects everything
mcp_chat
```

Or with explicit configuration:

```bash
export PUBLIC_HOST=proxmox.ghostbridge.tech
export HTTPS_ENABLED=true
export HTTPS_PORT=8443
mcp_chat
```

## Verification

Test the endpoint:

```bash
# Test MCP endpoint
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test web interface
curl -k https://proxmox.ghostbridge.tech:8443/
```

## Notes

- All authentication headers are **optional** - server accepts requests without authentication
- Use `-k` flag with curl to skip certificate verification (for self-signed or Cloudflare Origin certificates)
- Port 8443 is the default HTTPS port for the chat server
- Port 443 may be used by nginx/reverse proxy




## HTTPS Endpoints for proxmox.ghostbridge.tech

The MCP chat server provides multiple HTTPS endpoints (all equivalent):

### Primary Endpoints

1. **Recommended for HuggingFace browser client:**
   ```
   https://proxmox.ghostbridge.tech:8443/mcp-chat
   ```

2. **Alternative endpoints:**
   ```
   https://proxmox.ghostbridge.tech:8443/api/mcp
   https://proxmox.ghostbridge.tech:8443/mcp
   ```

### Web Interface

```
https://proxmox.ghostbridge.tech:8443
```

## Usage Examples

### cURL Request

```bash
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### With Optional Authentication Headers

```bash
# With API Key (optional)
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# With Bearer Token (optional)
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### HuggingFace Browser Client Configuration

```
URL: https://proxmox.ghostbridge.tech:8443/mcp-chat
```

Optional headers (not required):
- `X-API-Key: your-key`
- `Authorization: Bearer your-token`
- `X-Password: your-password`

## Certificate Information

- **Certificate Type**: Cloudflare Origin Certificate (served via reverse proxy)
- **Valid Until**: November 18, 2040
- **Local Certificates**: `/etc/ssl/certs/proxmox-ghostbridge.crt` and `/etc/ssl/private/proxmox-ghostbridge.key`
- **Auto-detected**: Server automatically detects certificates via introspection

## Starting the Server

The server automatically detects configuration:

```bash
# Just start - auto-detects everything
mcp_chat
```

Or with explicit configuration:

```bash
export PUBLIC_HOST=proxmox.ghostbridge.tech
export HTTPS_ENABLED=true
export HTTPS_PORT=8443
mcp_chat
```

## Verification

Test the endpoint:

```bash
# Test MCP endpoint
curl -k https://proxmox.ghostbridge.tech:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test web interface
curl -k https://proxmox.ghostbridge.tech:8443/
```

## Notes

- All authentication headers are **optional** - server accepts requests without authentication
- Use `-k` flag with curl to skip certificate verification (for self-signed or Cloudflare Origin certificates)
- Port 8443 is the default HTTPS port for the chat server
- Port 443 may be used by nginx/reverse proxy



