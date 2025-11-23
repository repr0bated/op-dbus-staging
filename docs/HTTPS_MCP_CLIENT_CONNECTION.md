# HTTPS MCP Client Connection Guide

## Rust HTTPS Server Configuration

The `mcp_chat` server supports HTTPS with optional authentication headers (not required).

**⚠️ Important:** HTTPS is required for HuggingFace browser client (HTTP is rejected as "unsafe").

### Connection URL Format

The server is fully configurable via environment variables (no hardcoded hostnames).

**For production domain (e.g., proxmox.ghostbridge.tech):**
```
https://proxmox.ghostbridge.tech/mcp-chat    (recommended)
https://proxmox.ghostbridge.tech/api/mcp
https://proxmox.ghostbridge.tech/mcp
```

**For localhost (development):**
```
https://localhost:8443/mcp-chat
https://localhost:8443/api/mcp
https://localhost:8443/mcp
```

**Custom host/port:**
```
https://your-host:8443/mcp-chat
https://your-host:8443/api/mcp
https://your-host:8443/mcp
```

### Optional Authentication Headers

The server accepts (but does not require) these headers:

- **X-API-Key**: API key for authentication
- **Authorization**: Bearer token (format: `Bearer YOUR_TOKEN`)
- **X-Password**: Password for authentication

**Note**: All headers are optional - the server will accept requests without authentication.

### Starting HTTPS Server

**Configuration is via environment variables (no hardcoded values):**

1. **For production domain (e.g., proxmox.ghostbridge.tech):**

```bash
export PUBLIC_HOST=proxmox.ghostbridge.tech
export BIND_HOST=0.0.0.0
export HTTPS_ENABLED=true
export HTTPS_PORT=443
export SSL_CERT_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem
mcp_chat
```

2. **For localhost with self-signed certificate:**

```bash
# Generate self-signed certificate
./generate-ssl-cert.sh

# Configure and start
export PUBLIC_HOST=localhost
export HTTPS_ENABLED=true
export HTTPS_PORT=8443
export SSL_CERT_PATH=./ssl/certificate.crt
export SSL_KEY_PATH=./ssl/private.key
mcp_chat
```

3. **Environment variables from `.bashrc`:**

Add to `~/.bashrc`:
```bash
export PUBLIC_HOST=proxmox.ghostbridge.tech
export HTTPS_ENABLED=true
export HTTPS_PORT=443
export SSL_CERT_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem
```

Then run: `mcp_chat`

### Server Endpoints

Endpoints are dynamically generated based on `PUBLIC_HOST` and port configuration.

**Example with proxmox.ghostbridge.tech:**
- `https://proxmox.ghostbridge.tech/mcp-chat` (recommended for HuggingFace)
- `https://proxmox.ghostbridge.tech/api/mcp`
- `https://proxmox.ghostbridge.tech/mcp`

**Example with localhost:**
- `https://localhost:8443/mcp-chat`
- `https://localhost:8443/api/mcp`
- `https://localhost:8443/mcp`

**Note:** HTTP endpoints are not recommended - HuggingFace browser client requires HTTPS.

### Example Rust MCP Client Connection

```rust
use reqwest::Client;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true) // For self-signed certs
        .build()?;
    
    // Optional: Add authentication headers (not required)
    let mut request = client
        .post("https://localhost:8443/mcp-chat")
        .header("Content-Type", "application/json");
    
    // Optional headers (can be omitted):
    // request = request.header("X-API-Key", "your-api-key");
    // request = request.header("Authorization", "Bearer your-token");
    // request = request.header("X-Password", "your-password");
    
    let response = request
        .json(&json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }))
        .send()
        .await?;
    
    let result: serde_json::Value = response.json().await?;
    println!("Response: {}", result);
    
    Ok(())
}
```

### Example cURL Request

```bash
# Without authentication (works fine)
curl -k https://localhost:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# With optional API key
curl -k https://localhost:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# With optional Bearer token
curl -k https://localhost:8443/mcp-chat \
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

**⚠️ HTTPS is required** - HuggingFace browser client rejects HTTP as "unsafe".

For HuggingFace browser client, use your configured domain:

**Production (proxmox.ghostbridge.tech):**
```
URL: https://proxmox.ghostbridge.tech/mcp-chat
```

**Localhost (development):**
```
URL: https://localhost:8443/mcp-chat
```

**Alternative endpoints:**
- `https://your-domain/mcp-chat` (recommended)
- `https://your-domain/api/mcp`
- `https://your-domain/mcp`

Optional headers can be configured in the HuggingFace client settings:
- API Key: `X-API-Key` header
- Bearer Token: `Authorization: Bearer` header
- Password: `X-Password` header

**All headers are optional** - the server accepts requests without authentication.

### Production Deployment

For production, replace self-signed certificates with certificates from a trusted CA:

```bash
# Using Let's Encrypt
certbot certonly --standalone -d yourdomain.com

# Then set environment variables:
export SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
export HTTPS_ENABLED=true
```

### Security Notes

- The server accepts requests **without authentication** by default
- Optional headers are logged but not validated
- For production, consider implementing authentication validation if needed
- Use trusted CA certificates for production deployments


## Rust HTTPS Server Configuration

The `mcp_chat` server supports HTTPS with optional authentication headers (not required).

**⚠️ Important:** HTTPS is required for HuggingFace browser client (HTTP is rejected as "unsafe").

### Connection URL Format

The server is fully configurable via environment variables (no hardcoded hostnames).

**For production domain (e.g., proxmox.ghostbridge.tech):**
```
https://proxmox.ghostbridge.tech/mcp-chat    (recommended)
https://proxmox.ghostbridge.tech/api/mcp
https://proxmox.ghostbridge.tech/mcp
```

**For localhost (development):**
```
https://localhost:8443/mcp-chat
https://localhost:8443/api/mcp
https://localhost:8443/mcp
```

**Custom host/port:**
```
https://your-host:8443/mcp-chat
https://your-host:8443/api/mcp
https://your-host:8443/mcp
```

### Optional Authentication Headers

The server accepts (but does not require) these headers:

- **X-API-Key**: API key for authentication
- **Authorization**: Bearer token (format: `Bearer YOUR_TOKEN`)
- **X-Password**: Password for authentication

**Note**: All headers are optional - the server will accept requests without authentication.

### Starting HTTPS Server

**Configuration is via environment variables (no hardcoded values):**

1. **For production domain (e.g., proxmox.ghostbridge.tech):**

```bash
export PUBLIC_HOST=proxmox.ghostbridge.tech
export BIND_HOST=0.0.0.0
export HTTPS_ENABLED=true
export HTTPS_PORT=443
export SSL_CERT_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem
mcp_chat
```

2. **For localhost with self-signed certificate:**

```bash
# Generate self-signed certificate
./generate-ssl-cert.sh

# Configure and start
export PUBLIC_HOST=localhost
export HTTPS_ENABLED=true
export HTTPS_PORT=8443
export SSL_CERT_PATH=./ssl/certificate.crt
export SSL_KEY_PATH=./ssl/private.key
mcp_chat
```

3. **Environment variables from `.bashrc`:**

Add to `~/.bashrc`:
```bash
export PUBLIC_HOST=proxmox.ghostbridge.tech
export HTTPS_ENABLED=true
export HTTPS_PORT=443
export SSL_CERT_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem
```

Then run: `mcp_chat`

### Server Endpoints

Endpoints are dynamically generated based on `PUBLIC_HOST` and port configuration.

**Example with proxmox.ghostbridge.tech:**
- `https://proxmox.ghostbridge.tech/mcp-chat` (recommended for HuggingFace)
- `https://proxmox.ghostbridge.tech/api/mcp`
- `https://proxmox.ghostbridge.tech/mcp`

**Example with localhost:**
- `https://localhost:8443/mcp-chat`
- `https://localhost:8443/api/mcp`
- `https://localhost:8443/mcp`

**Note:** HTTP endpoints are not recommended - HuggingFace browser client requires HTTPS.

### Example Rust MCP Client Connection

```rust
use reqwest::Client;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::builder()
        .danger_accept_invalid_certs(true) // For self-signed certs
        .build()?;
    
    // Optional: Add authentication headers (not required)
    let mut request = client
        .post("https://localhost:8443/mcp-chat")
        .header("Content-Type", "application/json");
    
    // Optional headers (can be omitted):
    // request = request.header("X-API-Key", "your-api-key");
    // request = request.header("Authorization", "Bearer your-token");
    // request = request.header("X-Password", "your-password");
    
    let response = request
        .json(&json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }))
        .send()
        .await?;
    
    let result: serde_json::Value = response.json().await?;
    println!("Response: {}", result);
    
    Ok(())
}
```

### Example cURL Request

```bash
# Without authentication (works fine)
curl -k https://localhost:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# With optional API key
curl -k https://localhost:8443/mcp-chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# With optional Bearer token
curl -k https://localhost:8443/mcp-chat \
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

**⚠️ HTTPS is required** - HuggingFace browser client rejects HTTP as "unsafe".

For HuggingFace browser client, use your configured domain:

**Production (proxmox.ghostbridge.tech):**
```
URL: https://proxmox.ghostbridge.tech/mcp-chat
```

**Localhost (development):**
```
URL: https://localhost:8443/mcp-chat
```

**Alternative endpoints:**
- `https://your-domain/mcp-chat` (recommended)
- `https://your-domain/api/mcp`
- `https://your-domain/mcp`

Optional headers can be configured in the HuggingFace client settings:
- API Key: `X-API-Key` header
- Bearer Token: `Authorization: Bearer` header
- Password: `X-Password` header

**All headers are optional** - the server accepts requests without authentication.

### Production Deployment

For production, replace self-signed certificates with certificates from a trusted CA:

```bash
# Using Let's Encrypt
certbot certonly --standalone -d yourdomain.com

# Then set environment variables:
export SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
export HTTPS_ENABLED=true
```

### Security Notes

- The server accepts requests **without authentication** by default
- Optional headers are logged but not validated
- For production, consider implementing authentication validation if needed
- Use trusted CA certificates for production deployments

