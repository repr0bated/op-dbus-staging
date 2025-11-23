# Quick Deployment Guide - Chat Module Isolated

## One-Command Deployment

```bash
# Deploy chat module with isolation
sudo ./scripts/deployment/deploy-chat-module-isolated.sh
```

## What Gets Deployed

### ✅ Main Components (Chat Module)
- `/opt/op-dbus/chat/bin/mcp-chat` - Main binary
- `/opt/op-dbus/chat/config/` - Configuration files
- `/opt/op-dbus/chat/data/` - Data directory
- Systemd service: `op-dbus-chat.service`

### 🔒 Isolated Components (Deprecated Code)
- `/opt/op-dbus/isolated/src/mcp/` - Old introspection code
- Filesystem isolation: BTRFS subvolume or overlayfs

## Post-Deployment Commands

```bash
# Start the service
sudo systemctl start op-dbus-chat

# Enable on boot
sudo systemctl enable op-dbus-chat

# Check status
sudo systemctl status op-dbus-chat

# View logs
sudo journalctl -u op-dbus-chat -f

# Rebuild around chat module
/opt/op-dbus/chat/build-isolated.sh
```

## Module Status

### ✅ Active (Chat Module)
- `chat_main.rs`
- `chat_server.rs`
- `native_introspection.rs`
- `introspective_gadget.rs`
- `tool_registry.rs`
- `agent_registry.rs`
- `orchestrator.rs`

### 🔒 Isolated (Old Code)
- `comprehensive_introspection.rs`
- `introspection_cache.rs`
- `discovery.rs`

## Quick Rollback

```bash
# Stop service
sudo systemctl stop op-dbus-chat

# Disable service
sudo systemctl disable op-dbus-chat

# Remove deployment
sudo rm -rf /opt/op-dbus/chat
sudo systemctl daemon-reload
```

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u op-dbus-chat -n 50

# Check binary exists
ls -la /opt/op-dbus/chat/bin/mcp-chat

# Check permissions
sudo chown -R op-dbus:op-dbus /opt/op-dbus/chat
```

### Build fails
```bash
# Use build wrapper
cd /opt/op-dbus/chat
./build-isolated.sh

# Or rebuild from source
cd /home/jeremy/op-dbus-staging
cargo build --release --bin mcp-chat
```

## Filesystem Isolation

### BTRFS (Preferred)
- ✅ Snapshot capability
- ✅ Easy rollback
- ✅ Better performance

### Overlayfs (Fallback)
- ✅ Works on any filesystem
- ✅ Layered filesystem
- ✅ Easy unmount

### Regular Directory (Final Fallback)
- ✅ Works everywhere
- ❌ No isolation benefits

