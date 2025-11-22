# MCPO - Network Engineer MCP Server

The Network Engineer MCP Server (`mcpo`) provides expert network engineering capabilities through the Model Context Protocol (MCP). This server serves the network-engineer agent persona with comprehensive cloud networking, security, and performance optimization expertise.

## Overview

MCPO (Network Engineer MCP Server) is a specialized MCP server that exposes network engineering tools and operations. It combines the network-engineer agent persona with practical network operations capabilities.

## Features

### Network Engineering Tools
- **network_interfaces** - List all network interfaces with configuration and status
- **network_ping** - Test connectivity to target hosts
- **network_route_table** - Display current routing table
- **network_connections** - Show active network connections
- **network_traceroute** - Perform traceroute analysis to target hosts

### Expert Capabilities
- Cloud networking expertise (AWS, Azure, GCP)
- Security architectures and zero-trust networking
- Load balancing and traffic management
- DNS and service discovery
- SSL/TLS and PKI management
- Network troubleshooting and analysis

## Configuration

### MCP Server Configuration

The server is configured in `mcp-configs/cursor/mcp.json`:

```json
{
  "mcpo": {
    "command": "/home/jeremy/op-dbus-staging/target/debug/dbus-agent-network",
    "args": ["--mcp"],
    "env": {
      "RUST_LOG": "info",
      "AGENT_PERSONA": "network-engineer"
    },
    "description": "Network Engineer MCP Server (mcpo) - Expert network engineering with comprehensive cloud networking, security, and performance optimization capabilities"
  }
}
```

### Agent Configuration

Detailed agent configuration is available in `mcp-configs/agents/mcpo-network-engineer.json`.

## Usage

### Starting the Server

```bash
cd /home/jeremy/op-dbus-staging
./target/debug/dbus-agent-network --mcp
```

### MCP Protocol Usage

The server implements the MCP protocol for tool execution:

```json
// Initialize
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}

// List tools
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}

// Execute tool
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "network_interfaces",
    "arguments": {}
  }
}
```

## Tool Examples

### Network Interface Analysis
```json
{
  "method": "tools/call",
  "params": {
    "name": "network_interfaces",
    "arguments": {}
  }
}
```

### Connectivity Testing
```json
{
  "method": "tools/call",
  "params": {
    "name": "network_ping",
    "arguments": {
      "target": "google.com",
      "count": 4
    }
  }
}
```

### Network Path Analysis
```json
{
  "method": "tools/call",
  "params": {
    "name": "network_traceroute",
    "arguments": {
      "target": "example.com"
    }
  }
}
```

## Integration

MCPO integrates with MCP-compatible clients including:
- Claude Desktop
- Cursor/VSCode
- Custom MCP clients

## Architecture

The MCPO server combines:
- **Network Engineer Persona**: Expert knowledge base from comprehensive-agents
- **D-Bus Operations**: System-level network operations via zbus
- **MCP Protocol**: Standardized tool execution interface

## Security

- Command validation and sanitization
- Path traversal protection
- Resource limits and monitoring
- Audit logging of all operations

## Development

Built with Rust using:
- `zbus` for D-Bus communication
- `serde_json` for MCP protocol handling
- Tokio async runtime

## Files

- `src/mcp/agents/network.rs` - Main server implementation
- `mcp-configs/cursor/mcp.json` - MCP client configuration
- `mcp-configs/agents/mcpo-network-engineer.json` - Agent configuration
- `comprehensive-agents/plugins/observability-monitoring/agents/network-engineer.md` - Agent persona definition

