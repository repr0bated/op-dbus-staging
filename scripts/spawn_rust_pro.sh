#!/bin/bash
# Spawn rust-pro agent via orchestrator

set -euo pipefail

ORCHESTRATOR_BIN="${ORCHESTRATOR_BIN:-./target/release/dbus-orchestrator}"
AGENT_TYPE="${1:-rust-pro}"

echo "Spawning ${AGENT_TYPE} agent..."

# Check if orchestrator is running
if ! busctl --system list | grep -q "org.dbusmcp.Orchestrator"; then
    echo "Starting orchestrator..."
    sudo "$ORCHESTRATOR_BIN" > /tmp/orchestrator.log 2>&1 &
    ORCHESTRATOR_PID=$!
    sleep 2
    echo "Orchestrator started (PID: $ORCHESTRATOR_PID)"
else
    echo "Orchestrator already running"
fi

# Spawn the agent
echo "Calling SpawnAgent for ${AGENT_TYPE}..."
AGENT_ID=$(busctl --system call org.dbusmcp.Orchestrator \
    /org/dbusmcp/Orchestrator \
    org.dbusmcp.Orchestrator \
    SpawnAgent \
    ss "$AGENT_TYPE" "" | grep -oP '"[^"]+"' | tr -d '"')

if [ -n "$AGENT_ID" ]; then
    echo "✅ Successfully spawned ${AGENT_TYPE} agent"
    echo "   Agent ID: $AGENT_ID"
    echo ""
    echo "Check status with:"
    echo "  busctl --system call org.dbusmcp.Orchestrator /org/dbusmcp/Orchestrator org.dbusmcp.Orchestrator GetAgentStatus s \"$AGENT_ID\""
else
    echo "❌ Failed to spawn agent"
    exit 1
fi



