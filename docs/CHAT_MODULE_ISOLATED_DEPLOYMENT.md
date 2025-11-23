# Chat Module Isolated Deployment Architecture

## Overview

This deployment strategy isolates the **chat module** as the main component while moving deprecated/external code to an isolated layer (BTRFS subvolume or overlayfs). This allows building new code around the chat module cleanly without interference from old code.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Production System                                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Chat Module (Main Component)                        │   │
│  │  /opt/op-dbus/chat/                                   │   │
│  │  ├─ bin/mcp-chat                                      │   │
│  │  ├─ config/                                           │   │
│  │  ├─ data/                                             │   │
│  │  └─ deployment-manifest.json                          │   │
│  │                                                        │   │
│  │  Core Components:                                     │   │
│  │  • chat_main.rs          ← Main entry point           │   │
│  │  • chat_server.rs        ← HTTP/WebSocket server      │   │
│  │  • orchestrator.rs       ← Agent orchestration        │   │
│  │  • native_introspection.rs ← Complete system view    │   │
│  │  • introspective_gadget.rs ← Universal inspector      │   │
│  │  • tool_registry.rs      ← Unified tool introspection │   │
│  │  • agent_registry.rs     ← Agent management           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Isolation Layer (Deprecated/External Code)          │   │
│  │  /opt/op-dbus/isolated/                               │   │
│  │  └─ src/                                              │   │
│  │     └─ mcp/                                           │   │
│  │        ├─ comprehensive_introspection.rs ← Old        │   │
│  │        ├─ introspection_cache.rs         ← SQLite    │   │
│  │        └─ discovery.rs                   ← Old        │   │
│  │                                                        │   │
│  │  Filesystem Isolation:                                │   │
│  │  • BTRFS Subvolume (preferred)                        │   │
│  │  • Overlayfs (fallback)                               │   │
│  │  • Regular directory (no isolation)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Strategy

### Phase 1: Isolation Layer Setup

1. **Detect Filesystem**: Check for BTRFS availability
2. **Create Isolation**: 
   - Prefer BTRFS subvolume for snapshot capability
   - Fallback to overlayfs for filesystem layering
   - Final fallback: regular directory

3. **Move Deprecated Code**: 
   - Copy deprecated modules to isolation layer
   - Comment out in main `mod.rs` to prevent compilation
   - Keep accessible for reference but not linked

### Phase 2: Chat Module Deployment

1. **Build Chat Module**: Compile with isolated modules excluded
2. **Install Binary**: Deploy to `/opt/op-dbus/chat/bin/`
3. **Create Systemd Service**: Auto-start on boot
4. **Set Permissions**: Secure file permissions

### Phase 3: New Code Integration

1. **Build Wrapper**: Script that excludes isolated modules
2. **Deployment Manifest**: Track what's deployed where
3. **New Code**: Builds cleanly around chat module

## Filesystem Isolation Methods

### Method 1: BTRFS Subvolume (Preferred)

**Advantages**:
- ✅ Snapshot capability for rollback
- ✅ Deduplication across subvolumes
- ✅ Easy cleanup (delete subvolume)
- ✅ Performance (native filesystem)

**Setup**:
```bash
# Create subvolume
sudo btrfs subvolume create /opt/op-dbus/isolated

# Mount at deployment location
# Subvolume automatically visible at mount point

# Snapshot for backup
sudo btrfs subvolume snapshot /opt/op-dbus/isolated /opt/op-dbus/isolated.backup
```

**Structure**:
```
/opt/op-dbus/
├── chat/              (regular directory)
│   └── bin/mcp-chat
└── isolated/          (BTRFS subvolume)
    └── src/
        └── mcp/
            └── old_code.rs
```

### Method 2: Overlayfs (Fallback)

**Advantages**:
- ✅ Works on any filesystem
- ✅ Layered filesystem view
- ✅ Write-through to upper layer
- ✅ Easy to unmount

**Setup**:
```bash
# Create directories
mkdir -p /opt/op-dbus/isolated.{lower,upper,work}

# Mount overlayfs
sudo mount -t overlay overlay \
    -o "lowerdir=/opt/op-dbus/isolated.lower,\
         upperdir=/opt/op-dbus/isolated.upper,\
         workdir=/opt/op-dbus/isolated.work" \
    /opt/op-dbus/isolated
```

**Structure**:
```
/opt/op-dbus/
├── chat/                    (regular directory)
└── isolated.lower/          (read-only base)
└── isolated.upper/          (writable changes)
└── isolated.work/           (overlayfs work dir)
└── isolated/                (merged view)
```

### Method 3: Regular Directory (Final Fallback)

**Advantages**:
- ✅ Works everywhere
- ✅ No special filesystem required
- ✅ Simple and straightforward

**Disadvantages**:
- ❌ No isolation benefits
- ❌ No snapshot capability
- ❌ Manual cleanup required

## Deployment Script Usage

### Basic Deployment

```bash
# Deploy chat module with isolation
./scripts/deployment/deploy-chat-module-isolated.sh
```

**What it does**:
1. Detects filesystem type (BTRFS/overlayfs/regular)
2. Creates isolation layer
3. Deploys chat module to `/opt/op-dbus/chat/`
4. Creates systemd service
5. Generates deployment manifest

### With Deprecated Code Isolation

```bash
# Deploy and move deprecated code to isolation
./scripts/deployment/deploy-chat-module-isolated.sh

# When prompted:
# Move deprecated code to isolation layer? [y/N] y
```

**What happens**:
1. Deprecated modules copied to isolation layer
2. Modules commented out in `src/mcp/mod.rs`
3. Build process excludes isolated modules

### Build Around Chat Module

```bash
# Use build wrapper that respects isolation
/opt/op-dbus/chat/build-isolated.sh

# Or manual build excluding isolated modules
cargo build --release --bin mcp-chat \
    --exclude comprehensive_introspection \
    --exclude introspection_cache
```

## Module Classification

### Main Components (Chat Module)

These stay in production and are actively used:

| Module | Purpose | Status |
|--------|---------|--------|
| `chat_main.rs` | Main entry point | ✅ Active |
| `chat_server.rs` | HTTP/WebSocket server | ✅ Active |
| `orchestrator.rs` | Agent orchestration | ✅ Active |
| `native_introspection.rs` | Complete system introspection | ✅ Active |
| `introspective_gadget.rs` | Universal object inspector | ✅ Active |
| `tool_registry.rs` | Unified tool introspection | ✅ Active |
| `agent_registry.rs` | Agent management | ✅ Active |
| `workflow_plugin_introspection.rs` | Workflow metadata | ✅ Active |

### Isolated Components (Deprecated/External)

These are moved to isolation layer:

| Module | Reason for Isolation | Status |
|--------|---------------------|--------|
| `comprehensive_introspection.rs` | Superseded by `native_introspection.rs` | 🔒 Isolated |
| `introspection_cache.rs` | SQLite cache (Send+Sync issues in web) | 🔒 Isolated |
| `discovery.rs` | Old discovery (if superseded) | 🔒 Isolated |

## Systemd Service

### Service File

Located at: `/etc/systemd/system/op-dbus-chat.service`

```ini
[Unit]
Description=op-dbus Chat Module - Unified Introspection System
After=network.target dbus.service
Wants=dbus.service

[Service]
Type=simple
User=op-dbus
WorkingDirectory=/opt/op-dbus/chat
ExecStart=/opt/op-dbus/chat/bin/mcp-chat
Restart=on-failure
RestartSec=5

Environment=RUST_LOG=op_dbus=info
Environment=OLLAMA_API_KEY=${OLLAMA_API_KEY}

[Install]
WantedBy=multi-user.target
```

### Service Management

```bash
# Start service
sudo systemctl start op-dbus-chat

# Enable on boot
sudo systemctl enable op-dbus-chat

# Check status
sudo systemctl status op-dbus-chat

# View logs
sudo journalctl -u op-dbus-chat -f

# Restart after code changes
sudo systemctl restart op-dbus-chat
```

## Build Strategy

### Build Wrapper Script

Location: `/opt/op-dbus/chat/build-isolated.sh`

**What it does**:
1. Checks for isolation layer
2. Comments out isolated modules in `mod.rs`
3. Builds chat module binary
4. (Optional) Restores `mod.rs` after build

**Usage**:
```bash
cd /opt/op-dbus/chat
./build-isolated.sh
```

### Manual Build (Excluding Isolated Modules)

```rust
// In src/mcp/mod.rs - automatically commented by build wrapper

// pub mod comprehensive_introspection;  // Isolated
pub mod native_introspection;            // Active
// pub mod introspection_cache;          // Isolated
pub mod tool_registry;                   // Active
```

## Deployment Manifest

Location: `/opt/op-dbus/chat/deployment-manifest.json`

**Purpose**: Track what's deployed where

**Example**:
```json
{
    "deployment": {
        "version": "1.0.0",
        "timestamp": "2025-01-15T10:30:00Z",
        "chat_module": {
            "root": "/opt/op-dbus/chat",
            "binary": "/opt/op-dbus/chat/bin/mcp-chat",
            "config": "/opt/op-dbus/chat/config",
            "data": "/opt/op-dbus/chat/data"
        },
        "isolation": {
            "type": "active",
            "root": "/opt/op-dbus/isolated",
            "filesystem": "btrfs"
        },
        "components": {
            "main": [
                "chat_main.rs",
                "chat_server.rs",
                "native_introspection.rs",
                "tool_registry.rs"
            ],
            "isolated": [
                "comprehensive_introspection.rs",
                "introspection_cache.rs"
            ]
        }
    }
}
```

## Rollback Strategy

### Quick Rollback (Stop Service)

```bash
# Stop chat module
sudo systemctl stop op-dbus-chat

# Service automatically disabled if systemd configured
```

### Filesystem Rollback (BTRFS)

```bash
# Snapshot current deployment
sudo btrfs subvolume snapshot /opt/op-dbus/chat /opt/op-dbus/chat.backup

# Rollback to previous version
sudo btrfs subvolume delete /opt/op-dbus/chat
sudo btrfs subvolume snapshot /opt/op-dbus/chat.backup /opt/op-dbus/chat
```

### Isolation Layer Cleanup

```bash
# Unmount overlayfs (if used)
sudo umount /opt/op-dbus/isolated

# Delete BTRFS subvolume (if used)
sudo btrfs subvolume delete /opt/op-dbus/isolated

# Remove regular directory (if used)
sudo rm -rf /opt/op-dbus/isolated
```

## Integration with New Code

### Building New Components Around Chat Module

1. **Reference Chat Module**: Import from deployed location
   ```rust
   use op_dbus::mcp::chat_main::ChatServer;
   use op_dbus::mcp::native_introspection::NativeIntrospector;
   ```

2. **Exclude Isolated Modules**: Build wrapper automatically excludes them

3. **Test Integration**: New code links against chat module cleanly

### Adding New Features to Chat Module

1. **Develop in Source**: Add to `src/mcp/` directory
2. **Build Isolated**: Use build wrapper
3. **Deploy**: Script handles deployment
4. **Service Restart**: Systemd automatically restarts

## Security Considerations

### File Permissions

```bash
# Chat module: owned by service user
sudo chown -R op-dbus:op-dbus /opt/op-dbus/chat

# Isolation layer: read-only for service user
sudo chown -R root:root /opt/op-dbus/isolated
sudo chmod -R 755 /opt/op-dbus/isolated
```

### Systemd Security

```ini
[Service]
# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/op-dbus/chat/data
```

## Troubleshooting

### Isolation Layer Not Created

**Issue**: Script falls back to regular directory

**Solution**:
```bash
# Check BTRFS availability
df -T /opt | grep btrfs

# Check overlayfs support
cat /proc/filesystems | grep overlay

# Manual BTRFS subvolume creation
sudo btrfs subvolume create /opt/op-dbus/isolated
```

### Deprecated Code Still Compiling

**Issue**: Modules not properly excluded

**Solution**:
```bash
# Check mod.rs for commented modules
grep "// pub mod" src/mcp/mod.rs

# Manually comment out if needed
sed -i 's/^pub mod comprehensive_introspection;/\/\/ pub mod comprehensive_introspection; \/\/ Isolated/' src/mcp/mod.rs
```

### Build Fails

**Issue**: Dependencies on isolated modules

**Solution**:
```bash
# Check for imports of isolated modules
grep -r "comprehensive_introspection" src/mcp/

# Replace with native_introspection
sed -i 's/comprehensive_introspection/native_introspection/g' src/mcp/*.rs
```

## Next Steps

1. **Deploy**: Run deployment script
2. **Verify**: Check systemd service status
3. **Test**: Verify chat module functionality
4. **Build New Code**: Use build wrapper
5. **Monitor**: Check logs for issues

---

**Deployment Complete!** 🚀

The chat module is now isolated from deprecated code, allowing clean development of new features around it.

