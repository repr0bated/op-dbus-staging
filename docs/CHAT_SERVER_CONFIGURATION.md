# Chat Server Configuration Guide

## Automatic Introspection

The chat server **automatically introspects** the system to detect:
- **Hostname/FQDN**: From `/etc/hostname`, `/etc/hosts`, or `hostname -f`
- **SSL Certificates**: Let's Encrypt certificates in `/etc/letsencrypt/live/`
- **Domain Configuration**: From system hostname and network configuration

**Environment variables are optional** - the server will use introspection by default.

## Environment Variables (Optional Override)

You can override introspected values with environment variables if needed.

### Server Configuration

```bash
# Bind address (default: 0.0.0.0 - listen on all interfaces)
export BIND_HOST=0.0.0.0

# Public hostname/domain (for URL generation in logs)
# Use your actual domain name (e.g., proxmox.ghostbridge.tech)
export PUBLIC_HOST=proxmox.ghostbridge.tech

# HTTP port (default: 8080)
export HTTP_PORT=8080

# HTTPS port (default: 8443)
export HTTPS_PORT=8443
```

### HTTPS Configuration

```bash
# Enable HTTPS (required for production)
export HTTPS_ENABLED=true

# SSL certificate paths
export SSL_CERT_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem
```

### Example: Production Setup with Domain (Auto-Detected)

**The server automatically detects:**
- Hostname/FQDN from system
- Let's Encrypt certificates for the domain
- HTTPS configuration

**Just start the server:**
```bash
mcp_chat
```

**Or override specific values if needed:**
```bash
# Override public hostname (if auto-detection fails)
export PUBLIC_HOST=proxmox.ghostbridge.tech

# Override ports (defaults: HTTP 8080, HTTPS 8443)
export HTTPS_PORT=443
export HTTP_PORT=80

# Start server
mcp_chat
```

The server will automatically:
1. Detect FQDN (e.g., `proxmox.ghostbridge.tech`)
2. Find Let's Encrypt certificates at `/etc/letsencrypt/live/proxmox.ghostbridge.tech/`
3. Enable HTTPS if certificates are found

### Example: Local Development

```bash
# Local development
export PUBLIC_HOST=localhost
export BIND_HOST=127.0.0.1
export HTTPS_ENABLED=false
export HTTP_PORT=8080

# Start server
mcp_chat
```

### Example: Self-Signed Certificate (Development)

```bash
# Generate self-signed certificate
./generate-ssl-cert.sh

# Configure
export PUBLIC_HOST=localhost
export HTTPS_ENABLED=true
export HTTPS_PORT=8443
export SSL_CERT_PATH=./ssl/certificate.crt
export SSL_KEY_PATH=./ssl/private.key

# Start server
mcp_chat
```

## MCP Endpoints

Once configured, the server will display the correct endpoints:

**HTTPS (production):**
- `https://proxmox.ghostbridge.tech:443/mcp-chat`
- `https://proxmox.ghostbridge.tech:443/api/mcp`
- `https://proxmox.ghostbridge.tech:443/mcp`

**HTTPS (custom port):**
- `https://proxmox.ghostbridge.tech:8443/mcp-chat`
- `https://proxmox.ghostbridge.tech:8443/api/mcp`
- `https://proxmox.ghostbridge.tech:8443/mcp`

## HuggingFace Browser Client

For HuggingFace browser client, use:

```
URL: https://proxmox.ghostbridge.tech/mcp-chat
```

Or with custom port:

```
URL: https://proxmox.ghostbridge.tech:8443/mcp-chat
```

## SSL Certificate Setup

**The server automatically detects certificates from Cloudflare, Let's Encrypt, or self-signed!**

### Cloudflare Certificates

The server automatically detects Cloudflare origin certificates in common locations:
- `/etc/ssl/cloudflare/` (origin.pem, cert.pem, fullchain.pem)
- `/etc/cloudflare/` (cert.pem, key.pem)
- `/etc/ssl/certs/cloudflare/`
- Domain-specific: `/etc/ssl/cloudflare/{domain}/`

**Just start the server - it will auto-detect Cloudflare certificates!**

### Let's Encrypt Certificates

If you have Let's Encrypt certificates:

```bash
# Install certbot (if not already installed)
sudo apt update
sudo apt install certbot

# Get certificate (standalone mode - stop server first)
sudo certbot certonly --standalone -d proxmox.ghostbridge.tech

# Certificates will be at:
# /etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
# /etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem

# Just start the server - it will auto-detect certificates!
mcp_chat
```

**The server will automatically:**
- Detect the domain from hostname/FQDN
- Find certificates at `/etc/letsencrypt/live/{domain}/`
- Enable HTTPS if certificates are found
- Use the correct certificate paths

**No environment variables needed!**

## How Introspection Works

1. **Hostname Detection:**
   - Reads `/etc/hostname` for FQDN
   - Checks `/etc/hosts` for domain entries
   - Falls back to `hostname -f` command
   - Uses system hostname as last resort

2. **SSL Certificate Detection:**
   - **Cloudflare certificates** (checked first):
     - `/etc/ssl/cloudflare/` (origin.pem, cert.pem, fullchain.pem)
     - `/etc/cloudflare/` (cert.pem, key.pem)
     - `/etc/ssl/certs/cloudflare/`
     - Domain-specific paths: `/etc/ssl/cloudflare/{domain}/`
   - **Let's Encrypt certificates**:
     - `/etc/letsencrypt/live/{domain}/` (fullchain.pem, privkey.pem)
     - Tries both full FQDN and main domain (e.g., `proxmox.ghostbridge.tech` and `ghostbridge.tech`)
   - **Self-signed certificates**:
     - `./ssl/certificate.crt` and `./ssl/private.key`
   - Automatically enables HTTPS if valid certificates are found

3. **Environment Variable Override:**
   - All introspected values can be overridden with environment variables
   - Environment variables take precedence over introspection

## Security Notes

- **HTTPS is required** for HuggingFace browser client (rejects HTTP as "unsafe")
- Use Let's Encrypt certificates for production domains
- Server automatically detects and uses Let's Encrypt certificates
- `BIND_HOST` controls which interface to listen on (0.0.0.0 = all interfaces)
- `PUBLIC_HOST` is only for URL display in logs (doesn't affect binding)

## Troubleshooting

**"Unsafe - only HTTPS is supported" error:**
- Enable HTTPS: `export HTTPS_ENABLED=true`
- Ensure valid SSL certificates are configured
- Use port 443 for standard HTTPS (or specify custom port in URL)

**Certificate errors:**
- Check certificate paths are correct
- Ensure certificates are readable by the process
- For Let's Encrypt, ensure certificates are not expired

**Connection refused:**
- Check `BIND_HOST` is correct (0.0.0.0 for all interfaces)
- Verify firewall allows the port
- Check if another process is using the port


## Automatic Introspection

The chat server **automatically introspects** the system to detect:
- **Hostname/FQDN**: From `/etc/hostname`, `/etc/hosts`, or `hostname -f`
- **SSL Certificates**: Let's Encrypt certificates in `/etc/letsencrypt/live/`
- **Domain Configuration**: From system hostname and network configuration

**Environment variables are optional** - the server will use introspection by default.

## Environment Variables (Optional Override)

You can override introspected values with environment variables if needed.

### Server Configuration

```bash
# Bind address (default: 0.0.0.0 - listen on all interfaces)
export BIND_HOST=0.0.0.0

# Public hostname/domain (for URL generation in logs)
# Use your actual domain name (e.g., proxmox.ghostbridge.tech)
export PUBLIC_HOST=proxmox.ghostbridge.tech

# HTTP port (default: 8080)
export HTTP_PORT=8080

# HTTPS port (default: 8443)
export HTTPS_PORT=8443
```

### HTTPS Configuration

```bash
# Enable HTTPS (required for production)
export HTTPS_ENABLED=true

# SSL certificate paths
export SSL_CERT_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem
```

### Example: Production Setup with Domain (Auto-Detected)

**The server automatically detects:**
- Hostname/FQDN from system
- Let's Encrypt certificates for the domain
- HTTPS configuration

**Just start the server:**
```bash
mcp_chat
```

**Or override specific values if needed:**
```bash
# Override public hostname (if auto-detection fails)
export PUBLIC_HOST=proxmox.ghostbridge.tech

# Override ports (defaults: HTTP 8080, HTTPS 8443)
export HTTPS_PORT=443
export HTTP_PORT=80

# Start server
mcp_chat
```

The server will automatically:
1. Detect FQDN (e.g., `proxmox.ghostbridge.tech`)
2. Find Let's Encrypt certificates at `/etc/letsencrypt/live/proxmox.ghostbridge.tech/`
3. Enable HTTPS if certificates are found

### Example: Local Development

```bash
# Local development
export PUBLIC_HOST=localhost
export BIND_HOST=127.0.0.1
export HTTPS_ENABLED=false
export HTTP_PORT=8080

# Start server
mcp_chat
```

### Example: Self-Signed Certificate (Development)

```bash
# Generate self-signed certificate
./generate-ssl-cert.sh

# Configure
export PUBLIC_HOST=localhost
export HTTPS_ENABLED=true
export HTTPS_PORT=8443
export SSL_CERT_PATH=./ssl/certificate.crt
export SSL_KEY_PATH=./ssl/private.key

# Start server
mcp_chat
```

## MCP Endpoints

Once configured, the server will display the correct endpoints:

**HTTPS (production):**
- `https://proxmox.ghostbridge.tech:443/mcp-chat`
- `https://proxmox.ghostbridge.tech:443/api/mcp`
- `https://proxmox.ghostbridge.tech:443/mcp`

**HTTPS (custom port):**
- `https://proxmox.ghostbridge.tech:8443/mcp-chat`
- `https://proxmox.ghostbridge.tech:8443/api/mcp`
- `https://proxmox.ghostbridge.tech:8443/mcp`

## HuggingFace Browser Client

For HuggingFace browser client, use:

```
URL: https://proxmox.ghostbridge.tech/mcp-chat
```

Or with custom port:

```
URL: https://proxmox.ghostbridge.tech:8443/mcp-chat
```

## SSL Certificate Setup

**The server automatically detects certificates from Cloudflare, Let's Encrypt, or self-signed!**

### Cloudflare Certificates

The server automatically detects Cloudflare origin certificates in common locations:
- `/etc/ssl/cloudflare/` (origin.pem, cert.pem, fullchain.pem)
- `/etc/cloudflare/` (cert.pem, key.pem)
- `/etc/ssl/certs/cloudflare/`
- Domain-specific: `/etc/ssl/cloudflare/{domain}/`

**Just start the server - it will auto-detect Cloudflare certificates!**

### Let's Encrypt Certificates

If you have Let's Encrypt certificates:

```bash
# Install certbot (if not already installed)
sudo apt update
sudo apt install certbot

# Get certificate (standalone mode - stop server first)
sudo certbot certonly --standalone -d proxmox.ghostbridge.tech

# Certificates will be at:
# /etc/letsencrypt/live/proxmox.ghostbridge.tech/fullchain.pem
# /etc/letsencrypt/live/proxmox.ghostbridge.tech/privkey.pem

# Just start the server - it will auto-detect certificates!
mcp_chat
```

**The server will automatically:**
- Detect the domain from hostname/FQDN
- Find certificates at `/etc/letsencrypt/live/{domain}/`
- Enable HTTPS if certificates are found
- Use the correct certificate paths

**No environment variables needed!**

## How Introspection Works

1. **Hostname Detection:**
   - Reads `/etc/hostname` for FQDN
   - Checks `/etc/hosts` for domain entries
   - Falls back to `hostname -f` command
   - Uses system hostname as last resort

2. **SSL Certificate Detection:**
   - **Cloudflare certificates** (checked first):
     - `/etc/ssl/cloudflare/` (origin.pem, cert.pem, fullchain.pem)
     - `/etc/cloudflare/` (cert.pem, key.pem)
     - `/etc/ssl/certs/cloudflare/`
     - Domain-specific paths: `/etc/ssl/cloudflare/{domain}/`
   - **Let's Encrypt certificates**:
     - `/etc/letsencrypt/live/{domain}/` (fullchain.pem, privkey.pem)
     - Tries both full FQDN and main domain (e.g., `proxmox.ghostbridge.tech` and `ghostbridge.tech`)
   - **Self-signed certificates**:
     - `./ssl/certificate.crt` and `./ssl/private.key`
   - Automatically enables HTTPS if valid certificates are found

3. **Environment Variable Override:**
   - All introspected values can be overridden with environment variables
   - Environment variables take precedence over introspection

## Security Notes

- **HTTPS is required** for HuggingFace browser client (rejects HTTP as "unsafe")
- Use Let's Encrypt certificates for production domains
- Server automatically detects and uses Let's Encrypt certificates
- `BIND_HOST` controls which interface to listen on (0.0.0.0 = all interfaces)
- `PUBLIC_HOST` is only for URL display in logs (doesn't affect binding)

## Troubleshooting

**"Unsafe - only HTTPS is supported" error:**
- Enable HTTPS: `export HTTPS_ENABLED=true`
- Ensure valid SSL certificates are configured
- Use port 443 for standard HTTPS (or specify custom port in URL)

**Certificate errors:**
- Check certificate paths are correct
- Ensure certificates are readable by the process
- For Let's Encrypt, ensure certificates are not expired

**Connection refused:**
- Check `BIND_HOST` is correct (0.0.0.0 for all interfaces)
- Verify firewall allows the port
- Check if another process is using the port

