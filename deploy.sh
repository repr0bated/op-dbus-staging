#!/bin/bash
# Deployment script for op-dbus with unified introspection

set -e

echo "🚀 Starting op-dbus deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/jeremy/op-dbus-staging"
CARGO_BIN_DIR="/home/jeremy/.cargo/bin"
SYSTEMD_DIR="/etc/systemd/system"

echo "📦 Building release binary..."
cd "$PROJECT_DIR"
cargo build --release 2>&1 | tail -20

if [ ! -f "target/release/op-dbus" ]; then
    echo -e "${RED}❌ Build failed: op-dbus binary not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

echo "📋 Building MCP chat binary..."
cargo build --release --bin mcp-chat 2>&1 | tail -10

if [ ! -f "target/release/mcp-chat" ]; then
    echo -e "${RED}❌ Build failed: mcp-chat binary not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ MCP chat binary built${NC}"

echo "📂 Installing binaries..."
cp target/release/op-dbus "$CARGO_BIN_DIR/"
chmod +x "$CARGO_BIN_DIR/op-dbus"
echo -e "${GREEN}✅ Installed op-dbus${NC}"

cp target/release/mcp-chat "$CARGO_BIN_DIR/"
chmod +x "$CARGO_BIN_DIR/mcp-chat"
echo -e "${GREEN}✅ Installed mcp-chat${NC}"

echo "⚙️  Installing systemd services..."
if [ -d "$SYSTEMD_DIR" ]; then
    echo "Installing MCP chat server service..."
    sudo cp systemd/mcp-chat-server.service "$SYSTEMD_DIR/"
    sudo systemctl daemon-reload
    echo -e "${GREEN}✅ Service installed${NC}"
else
    echo -e "${YELLOW}⚠️  systemd directory not found, skipping service installation${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Set up environment variables (if using Ollama):"
echo "     export OLLAMA_API_KEY=your-api-key"
echo "     export OLLAMA_DEFAULT_MODEL=mistral"
echo ""
echo "  2. Start the MCP chat server:"
echo "     mcp-chat"
echo ""
echo "  3. Or use systemd to start:"
echo "     sudo systemctl start mcp-chat-server"
echo "     sudo systemctl enable mcp-chat-server"
echo ""
echo "  4. Access the chat UI:"
echo "     http://localhost:8080"
echo ""
echo "📊 Verify installation:"
echo "  which op-dbus"
echo "  which mcp-chat"
echo "  systemctl status mcp-chat-server"
echo ""
