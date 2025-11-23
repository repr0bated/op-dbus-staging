#!/bin/bash
# Isolated Chat Module Deployment Script
# 
# Deploys the chat module as the main component with external/deprecated code
# isolated in a BTRFS subvolume or overlayfs mount.
#
# This allows:
# - Chat module runs in production location
# - Old code isolated and doesn't interfere
# - New code builds around chat module cleanly
# - Easy rollback by unmounting isolated layer

set -euo pipefail

# Configuration
DEPLOY_ROOT="/opt/op-dbus"
CHAT_MODULE_ROOT="${DEPLOY_ROOT}/chat"
ISOLATION_ROOT="${DEPLOY_ROOT}/isolated"
OVERLAY_ROOT="${DEPLOY_ROOT}/overlay"

# Detect filesystem type
detect_filesystem() {
    local mount_point="$1"
    df -T "$mount_point" 2>/dev/null | tail -1 | awk '{print $2}'
}

# Check if BTRFS is available
check_btrfs() {
    command -v btrfs >/dev/null 2>&1 && \
    df -T "$(dirname "$DEPLOY_ROOT")" 2>/dev/null | grep -q btrfs
}

# Setup BTRFS subvolume for isolation
setup_btrfs_isolation() {
    echo "🌲 Setting up BTRFS subvolume isolation..."
    
    local parent_dir=$(dirname "$ISOLATION_ROOT")
    
    # Create parent directory if needed
    sudo mkdir -p "$parent_dir"
    
    # Check if subvolume already exists
    if sudo btrfs subvolume list "$parent_dir" 2>/dev/null | grep -q "$(basename "$ISOLATION_ROOT")"; then
        echo "✓ BTRFS subvolume already exists: $ISOLATION_ROOT"
        return 0
    fi
    
    # Create new subvolume
    sudo btrfs subvolume create "$ISOLATION_ROOT" 2>/dev/null || {
        echo "⚠ Failed to create BTRFS subvolume, falling back to regular directory"
        sudo mkdir -p "$ISOLATION_ROOT"
        return 1
    }
    
    echo "✓ Created BTRFS subvolume: $ISOLATION_ROOT"
    
    # Set permissions
    sudo chown -R "$(id -u):$(id -g)" "$ISOLATION_ROOT"
    
    return 0
}

# Setup overlayfs for isolation
setup_overlayfs_isolation() {
    echo "📦 Setting up overlayfs isolation..."
    
    local lower_dir="${ISOLATION_ROOT}.lower"
    local upper_dir="${ISOLATION_ROOT}.upper"
    local work_dir="${ISOLATION_ROOT}.work"
    
    # Create directories
    sudo mkdir -p "$lower_dir" "$upper_dir" "$work_dir" "$ISOLATION_ROOT"
    
    # Mount overlayfs
    sudo mount -t overlay overlay \
        -o "lowerdir=$lower_dir,upperdir=$upper_dir,workdir=$work_dir" \
        "$ISOLATION_ROOT" 2>/dev/null || {
        echo "⚠ Failed to mount overlayfs, using regular directory"
        return 1
    }
    
    # Set permissions
    sudo chown -R "$(id -u):$(id -g)" "$ISOLATION_ROOT"
    
    echo "✓ Mounted overlayfs: $ISOLATION_ROOT"
    
    # Add to /etc/fstab for persistence
    if ! grep -q "$ISOLATION_ROOT" /etc/fstab 2>/dev/null; then
        echo "overlay $ISOLATION_ROOT overlay lowerdir=$lower_dir,upperdir=$upper_dir,workdir=$work_dir 0 0" | \
            sudo tee -a /etc/fstab >/dev/null
        echo "✓ Added overlayfs to /etc/fstab"
    fi
    
    return 0
}

# Setup isolation layer
setup_isolation() {
    echo "🔒 Setting up isolation layer..."
    
    # Try BTRFS first
    if check_btrfs; then
        if setup_btrfs_isolation; then
            echo "✓ Using BTRFS subvolume for isolation"
            return 0
        fi
    fi
    
    # Fallback to overlayfs
    if setup_overlayfs_isolation; then
        echo "✓ Using overlayfs for isolation"
        return 0
    fi
    
    # Final fallback: regular directory
    echo "⚠ Using regular directory for isolation (no filesystem isolation)"
    sudo mkdir -p "$ISOLATION_ROOT"
    sudo chown -R "$(id -u):$(id -g)" "$ISOLATION_ROOT"
    
    return 0
}

# Identify deprecated/external modules to isolate
identify_deprecated_modules() {
    cat <<'EOF'
# Deprecated modules to isolate
src/mcp/comprehensive_introspection.rs
src/mcp/introspection_cache.rs  # SQLite cache (deprecated in web context)
src/mcp/discovery.rs  # Old discovery (if superseded)
src/state/auto_plugin.rs  # If superseded by new introspection
EOF
}

# Move deprecated code to isolation layer
isolate_deprecated_code() {
    echo "📦 Moving deprecated code to isolation layer..."
    
    local deprecated_modules=(
        "src/mcp/comprehensive_introspection.rs"
        "src/mcp/introspection_cache.rs"
    )
    
    local isolated_src="${ISOLATION_ROOT}/src"
    mkdir -p "$isolated_src/mcp"
    
    for module in "${deprecated_modules[@]}"; do
        if [ -f "$module" ]; then
            echo "  → Isolating: $module"
            cp -r "$module" "$isolated_src/mcp/" 2>/dev/null || true
            
            # Comment out in main mod.rs to prevent compilation
            if grep -q "$(basename "$module" .rs)" src/mcp/mod.rs 2>/dev/null; then
                echo "  → Commenting out in mod.rs"
                sed -i "s|^pub mod $(basename "$module" .rs);|// pub mod $(basename "$module" .rs); // Isolated|" src/mcp/mod.rs || true
            fi
        fi
    done
    
    echo "✓ Deprecated code isolated"
}

# Deploy chat module as main component
deploy_chat_module() {
    echo "🚀 Deploying chat module as main component..."
    
    # Create deployment directory structure
    sudo mkdir -p "$CHAT_MODULE_ROOT"/{bin,lib,config,data}
    
    # Build chat module binary (try mcp-chat first, fallback to mcp_chat)
    echo "  → Building chat module..."
    if cargo build --release --bin mcp-chat 2>/dev/null; then
        BINARY_NAME="mcp-chat"
    elif cargo build --release --bin mcp_chat 2>/dev/null; then
        BINARY_NAME="mcp_chat"
    else
        echo "⚠️  Build failed, checking for existing binary..."
        if [ -f "target/release/mcp_chat" ]; then
            BINARY_NAME="mcp_chat"
            echo "  → Using existing binary: $BINARY_NAME"
        else
            echo "❌ Failed to build chat module and no existing binary found"
            return 1
        fi
    fi
    
    # Install binary
    sudo cp "target/release/$BINARY_NAME" "$CHAT_MODULE_ROOT/bin/mcp-chat"
    sudo chmod +x "$CHAT_MODULE_ROOT/bin/mcp-chat"
    
    # Install configuration
    if [ -f "example-state.json" ]; then
        sudo cp example-state.json "$CHAT_MODULE_ROOT/config/"
    fi
    
    # Create systemd service
    create_systemd_service
    
    # Set permissions
    sudo chown -R "$(id -u):$(id -g)" "$CHAT_MODULE_ROOT"
    
    echo "✓ Chat module deployed to: $CHAT_MODULE_ROOT"
}

# Create systemd service for chat module
create_systemd_service() {
    echo "⚙️  Creating systemd service..."
    
    local service_file="/etc/systemd/system/op-dbus-chat.service"
    
    sudo tee "$service_file" >/dev/null <<EOF
[Unit]
Description=op-dbus Chat Module - Unified Introspection System
After=network.target dbus.service
Wants=dbus.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$CHAT_MODULE_ROOT
ExecStart=$CHAT_MODULE_ROOT/bin/mcp-chat
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

# Environment
Environment=RUST_LOG=op_dbus=info
Environment=OLLAMA_API_KEY=\${OLLAMA_API_KEY}

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$CHAT_MODULE_ROOT/data

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    echo "✓ Created systemd service: op-dbus-chat.service"
}

# Create deployment manifest
create_deployment_manifest() {
    echo "📋 Creating deployment manifest..."
    
    local manifest_file="${CHAT_MODULE_ROOT}/deployment-manifest.json"
    
    cat > "$manifest_file" <<EOF
{
    "deployment": {
        "version": "1.0.0",
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "chat_module": {
            "root": "$CHAT_MODULE_ROOT",
            "binary": "$CHAT_MODULE_ROOT/bin/mcp-chat",
            "config": "$CHAT_MODULE_ROOT/config",
            "data": "$CHAT_MODULE_ROOT/data"
        },
        "isolation": {
            "type": "$([ -d "$ISOLATION_ROOT" ] && echo "active" || echo "none")",
            "root": "$ISOLATION_ROOT",
            "filesystem": "$(check_btrfs && echo "btrfs" || echo "overlayfs")"
        },
        "components": {
            "main": [
                "chat_main.rs",
                "chat_server.rs",
                "orchestrator.rs",
                "native_introspection.rs",
                "introspective_gadget.rs",
                "tool_registry.rs",
                "agent_registry.rs"
            ],
            "isolated": [
                "comprehensive_introspection.rs",
                "introspection_cache.rs"
            ]
        }
    }
}
EOF
    
    echo "✓ Created deployment manifest: $manifest_file"
}

# Create build wrapper that respects isolation
create_build_wrapper() {
    echo "🔧 Creating build wrapper..."
    
    local build_script="${CHAT_MODULE_ROOT}/build-isolated.sh"
    
    cat > "$build_script" <<'EOF'
#!/bin/bash
# Build wrapper that respects isolation layer

set -euo pipefail

ISOLATION_ROOT="${ISOLATION_ROOT:-/opt/op-dbus/isolated}"

# Check if we should build with isolated modules
if [ -d "$ISOLATION_ROOT/src" ]; then
    echo "🔒 Building with isolated modules excluded..."
    
    # Temporarily move isolated modules
    if [ -d "$ISOLATION_ROOT/src/mcp" ]; then
        for module in "$ISOLATION_ROOT/src/mcp"/*.rs; do
            mod_name=$(basename "$module" .rs)
            if grep -q "^pub mod $mod_name" src/mcp/mod.rs 2>/dev/null; then
                echo "  → Excluding isolated module: $mod_name"
                sed -i "s|^pub mod $mod_name;|// pub mod $mod_name; // Isolated|" src/mcp/mod.rs
            fi
        done
    fi
fi

# Build
cargo build --release --bin mcp-chat

# Restore mod.rs (optional, if you want to keep it isolated)
# Uncomment to restore after build
# git checkout src/mcp/mod.rs

echo "✓ Build complete"
EOF
    
    chmod +x "$build_script"
    echo "✓ Created build wrapper: $build_script"
}

# Main deployment function
main() {
    echo "🚀 Starting Isolated Chat Module Deployment"
    echo "=========================================="
    echo ""
    
    # Check if running as root or with sudo
    if [ "$EUID" -eq 0 ]; then
        echo "⚠️  Running as root - consider running as regular user with sudo"
    fi
    
    # Setup isolation layer
    setup_isolation
    
    # Deploy chat module
    deploy_chat_module
    
    # Isolate deprecated code (optional)
    read -p "Move deprecated code to isolation layer? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        isolate_deprecated_code
    fi
    
    # Create build wrapper
    create_build_wrapper
    
    # Create deployment manifest
    create_deployment_manifest
    
    echo ""
    echo "✅ Deployment Complete!"
    echo "======================"
    echo ""
    echo "Chat Module:     $CHAT_MODULE_ROOT"
    echo "Isolation Layer: $ISOLATION_ROOT"
    echo ""
    echo "Next steps:"
    echo "  1. Start service: sudo systemctl start op-dbus-chat"
    echo "  2. Enable service: sudo systemctl enable op-dbus-chat"
    echo "  3. Check logs: sudo journalctl -u op-dbus-chat -f"
    echo ""
    echo "To rebuild around chat module:"
    echo "  $CHAT_MODULE_ROOT/build-isolated.sh"
    echo ""
}

# Run main function
main "$@"
