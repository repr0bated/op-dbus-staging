#!/bin/bash
# Startup script for MCP HTTP server on port 8000

cd "$(dirname "$0")"

# Check if chat-server is running
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "⚠️  Warning: Chat server on port 8080 is not running"
    echo "   The MCP server will still start but tool execution may fail"
    echo ""
fi

# Start MCP server
echo "Starting MCP server on port 8000..."
node mcp-server-http.js
