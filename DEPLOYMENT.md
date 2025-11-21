# Deployment Guide - op-dbus with Unified Introspection

## Overview

This guide explains how to deploy the latest op-dbus with:
- ✅ Unified introspection (single query point for all capabilities)
- ✅ Rust-based MCP chat server (replaced Node.js)
- ✅ Plugin-derived tools (systemd, network, lxc, keyring, etc.)
- ✅ Workflow integration (code_review, test_generation, deployment)

## What's Changed

**REMOVED:**
- ❌ Node.js chat-server.js
- ❌ JavaScript-based chat

**ADDED:**
- ✅ Rust MCP chat server (mcp-chat binary)
- ✅ Unified ToolRegistry.get_introspection() endpoint
- ✅ 21+ plugin-derived tools in single introspection

## Quick Deploy

```bash
cd /home/jeremy/op-dbus-staging
./deploy.sh
```

## Manual Installation

```bash
# Build release binaries
cargo build --release

# Copy to ~/.cargo/bin
cp target/release/op-dbus ~/.cargo/bin/
cp target/release/mcp-chat ~/.cargo/bin/

# Install systemd service
sudo cp systemd/mcp-chat-server.service /etc/systemd/system/
sudo systemctl daemon-reload
```

## Running

### Direct Execution
```bash
mcp-chat
# Opens http://localhost:8080
```

### Via Systemd
```bash
sudo systemctl start mcp-chat-server
sudo systemctl status mcp-chat-server
journalctl -u mcp-chat-server -f
```

## Configuration

### Enable AI (Optional)
```bash
export OLLAMA_API_KEY=your-api-key
export OLLAMA_DEFAULT_MODEL=mistral
```

## Verification

```bash
# Check binaries installed
which op-dbus
which mcp-chat

# Test server
curl http://localhost:8080
```

## Access

- **Local**: http://localhost:8080
- **Network**: http://100.104.70.1:8080 (Netmaker)

## Troubleshooting

```bash
# Check if port is in use
ss -tlnp | grep 8080

# View full logs
journalctl -u mcp-chat-server -n 100

# Restart service
sudo systemctl restart mcp-chat-server
```

## Architecture

All system capabilities are now accessible via single unified introspection:
- Native tools
- Plugin-derived tools (systemd, network, lxc, etc.)
- Workflows (code_review, test_generation, deployment)

See `INTROSPECTION_CONSOLIDATION.md` for full architecture details.
