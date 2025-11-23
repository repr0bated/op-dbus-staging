# Go 1.25.4 Setup

This repository includes a local Go 1.25.4 installation for use with the `dbus-agent-golang-pro` agent.

## Quick Start

Source the setup script to configure your environment:

```bash
source /home/user/op-dbus-staging/setup-go.sh
```

Or, if you've sourced the `.profile`:

```bash
source /home/user/op-dbus-staging/.profile
```

## Verify Installation

```bash
go version
# Expected output: go version go1.25.4 linux/amd64
```

## Environment Variables

The setup script configures:

- **GOROOT**: `/home/user/op-dbus-staging/go` - The Go installation directory
- **GOPATH**: `$HOME/go` - The Go workspace (default)
- **PATH**: Updated to include `$GOROOT/bin` and `$GOPATH/bin`
- **GO111MODULE**: `on` - Enable Go modules
- **GOPROXY**: `https://proxy.golang.org,direct` - Go module proxy
- **GOSUMDB**: `sum.golang.org` - Go checksum database

## Usage with golang_pro Agent

The `dbus-agent-golang-pro` agent (defined in `Cargo.toml`) provides D-Bus interface for Go development operations:

- `go run` - Run Go programs
- `go test` - Run tests
- `go build` - Build Go binaries
- `go fmt` - Format Go code
- `go vet` - Examine Go source code
- `go mod` - Module maintenance

### Example Agent Usage

```rust
// The agent is located at: src/mcp/agents/golang_pro.rs
// Build with: cargo build --bin dbus-agent-golang-pro --features mcp
```

## Directory Structure

```
/home/user/op-dbus-staging/
├── go/                    # Go 1.25.4 installation
│   ├── bin/              # Go binaries (go, gofmt)
│   ├── src/              # Go source code
│   ├── pkg/              # Go packages
│   └── ...
├── setup-go.sh           # Environment setup script
├── .profile              # Shell profile with Go config
└── GO-SETUP.md           # This file
```

## Notes

- The Go installation was extracted from `go1.25.4.linux-arm64.tar.gz`
- The `.profile` automatically sources `setup-go.sh` on login
- This Go installation takes precedence over system-installed Go versions
