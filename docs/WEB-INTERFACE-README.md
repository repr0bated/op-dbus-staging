# System Brain - Secure Web Interface

A HuggingChat-inspired web interface for the MCP-enhanced System Brain AI assistant, providing secure external access to orchestration and introspection capabilities.

## 🌟 Features

- **🔒 HTTPS/TLS Security** - End-to-end encrypted connections
- **🤖 Intelligent AI Assistant** - MCP-enhanced chatbot with orchestration capabilities
- **🎨 HuggingChat-inspired UI** - Modern, responsive chat interface
- **🛡️ Security Headers** - Comprehensive security protections
- **🌐 CORS Support** - Cross-origin resource sharing for external integrations
- **📊 Real-time Connection Status** - Live connection monitoring
- **⚙️ Configurable Settings** - API keys, models, and preferences

## 🚀 Quick Start

### 1. Generate SSL Certificates

```bash
# Generate self-signed certificates for HTTPS
./generate-ssl-cert.sh

# Or use Let's Encrypt for production:
# certbot certonly --standalone -d yourdomain.com
```

### 2. Start the System

```bash
# Start the enhanced chatbot (brain)
OLLAMA_API_KEY=your-key ./target/debug/mcp-chat &

# Start the MCP proxy server with HTTPS
HTTPS_ENABLED=true node mcp-server-http.js &
```

### 3. Access the Web Interface

- **HTTP**: http://localhost:8000
- **HTTPS**: https://localhost:8443
- **Production**: https://yourdomain.com:8443

## 🔐 Security Features

### HTTPS/TLS Encryption
- Automatic HTTPS server creation when certificates are available
- SSL/TLS 1.2+ support with secure cipher suites
- HSTS (HTTP Strict Transport Security) headers

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Authentication & Authorization
- API key authentication for MCP endpoints
- Configurable CORS origins for external access
- Rate limiting and request validation

### CORS Configuration
```javascript
// Default allowed origins
[
  'https://huggingface.co',
  'https://hf.co',
  'https://huggingchat.vercel.app',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://localhost:8443'
]
```

## 🎯 Usage

### Web Chat Interface

1. **Connect**: The interface automatically detects and connects to the MCP server
2. **Authenticate**: Enter your API key in settings if required
3. **Chat**: Start conversing with the System Brain AI assistant

### Available Commands

The System Brain can help with:

- **System Orchestration**: `orchestrate_system_task`
- **D-Bus Discovery**: `dbus_discovery`
- **System Introspection**: `system_introspect`
- **Workflow Orchestration**: `workflow_orchestrate`

### Example Conversations

```
You: Show me all D-Bus services
System Brain: [Discovers and lists all available D-Bus services]

You: Orchestrate a deployment task for web servers
System Brain: [Orchestrates deployment workflow across target systems]

You: What system resources are available?
System Brain: [Provides comprehensive system introspection]
```

## ⚙️ Configuration

### Environment Variables

```bash
# Server Configuration
HTTP_PORT=8000
HTTPS_PORT=8443
BIND_IP=0.0.0.0

# HTTPS Configuration
HTTPS_ENABLED=true
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt

# Security
API_KEYS=key1,key2,key3
CORS_ORIGINS=https://huggingface.co,https://yourapp.com

# Features
METRICS_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
```

### SSL Certificate Management

#### Self-Signed (Development)
```bash
./generate-ssl-cert.sh
```

#### Let's Encrypt (Production)
```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Configure paths
export SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
export SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.key
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │───▶│  MCP Proxy      │───▶│ Enhanced        │
│                 │    │  Server (HTTPS) │    │ Chatbot (Brain) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ HuggingChat UI  │    │ Security        │    │ Orchestrator    │
│                 │    │ Middleware      │    │ & Introspection │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

- **Web Interface**: React-inspired chat UI served over HTTPS
- **MCP Proxy Server**: Node.js/Express server with security middleware
- **Enhanced Chatbot**: Rust-based AI assistant with orchestration capabilities
- **Security Layer**: HTTPS, authentication, rate limiting, CORS

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Generate dev certificates
./generate-ssl-cert.sh

# Start in development mode
npm run dev

# Access at https://localhost:8443
```

### Production Deployment

```bash
# Build optimized version
npm run build

# Start production server
HTTPS_ENABLED=true SSL_CERT_PATH=/path/to/cert SSL_KEY_PATH=/path/to/key node mcp-server-http.js
```

## 📊 Monitoring

### Health Endpoints

- `GET /health` - Service health and status
- `GET /status` - Detailed server statistics
- `GET /metrics` - Prometheus metrics (if enabled)

### Connection Status

The web interface shows real-time connection status:
- 🟢 Connected: MCP server is reachable
- 🔴 Disconnected: Connection issues

## 🔍 Troubleshooting

### Certificate Issues
```bash
# Check certificate validity
openssl x509 -in ssl/certificate.crt -text -noout

# Test HTTPS connection
curl -k https://localhost:8443/health
```

### Connection Problems
```bash
# Check if servers are running
ps aux | grep mcp-chat
ps aux | grep node

# Test MCP endpoint
curl -H "x-api-key: your-key" http://localhost:8000/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### CORS Issues
```bash
# Add allowed origin
export CORS_ORIGINS=https://yourapp.com,https://anotherapp.com
```

## 🤝 Contributing

The web interface is designed to be:
- **Secure by default** - HTTPS everywhere, secure headers
- **User-friendly** - Intuitive chat interface
- **Extensible** - Easy to add new features and integrations
- **Production-ready** - Comprehensive error handling and monitoring

## 📄 License

This web interface is part of the System Brain MCP ecosystem.
