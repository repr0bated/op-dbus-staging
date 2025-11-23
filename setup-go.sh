#!/bin/bash
# Go 1.25.4 Environment Setup Script
# Source this file to configure Go environment variables

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set GOROOT to the local Go installation
export GOROOT="$SCRIPT_DIR/go"

# Set GOPATH for Go workspace (default to $HOME/go if not set)
export GOPATH="${GOPATH:-$HOME/go}"

# Add Go binaries to PATH
export PATH="$GOROOT/bin:$GOPATH/bin:$PATH"

# Go environment settings
export GO111MODULE=on
export GOPROXY=https://proxy.golang.org,direct
export GOSUMDB=sum.golang.org

echo "Go environment configured:"
echo "  GOROOT:  $GOROOT"
echo "  GOPATH:  $GOPATH"
echo "  Go version: $(go version 2>/dev/null || echo 'Go not found in PATH')"
