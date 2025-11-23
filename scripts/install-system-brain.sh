#!/bin/bash
# System Brain - Complete Installation Script for Live System
# This script installs the System Brain MCP chatbot and web interface

set -e

# Configuration
INSTALL_PREFIX="/opt/system-brain"
CONFIG_DIR="/etc/system-brain"
LOG_DIR="/var/log/system-brain"
DATA_DIR="/var/lib/system-brain"
SSL_DIR="$CONFIG_DIR/ssl"
SERVICE_USER="system-brain"
SERVICE_GROUP="system-brain"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (sudo)"
        exit 1
    fi
}

# Create system user and group
create_service_user() {
    log_info "Creating system user and group..."

    # Try to create group, fallback if commands not available
    if command -v groupadd &> /dev/null; then
        if ! getent group "$SERVICE_GROUP" > /dev/null; then
            groupadd --system "$SERVICE_GROUP" 2>/dev/null || true
            log_success "Created group: $SERVICE_GROUP"
        else
            log_info "Group $SERVICE_GROUP already exists"
        fi
    else
        log_warning "groupadd not available, using existing groups"
    fi

    # Try to create user, fallback if commands not available
    if command -v useradd &> /dev/null; then
        if ! getent passwd "$SERVICE_USER" > /dev/null; then
            useradd --system --shell /bin/bash --home-dir "$DATA_DIR" \
                    --gid "$SERVICE_GROUP" --create-home "$SERVICE_USER" 2>/dev/null || true
            log_success "Created user: $SERVICE_USER"
        else
            log_info "User $SERVICE_USER already exists"
        fi
    else
        log_warning "useradd not available, using current user for services"
        SERVICE_USER=$(whoami)
        SERVICE_GROUP=$(id -gn)
    fi
}

# Create directories
create_directories() {
    log_info "Creating directories..."

    mkdir -p "$INSTALL_PREFIX/bin"
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$SSL_DIR"
    mkdir -p "$INSTALL_PREFIX/web"

    # Set ownership
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_PREFIX"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_DIR"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$LOG_DIR"
    chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DATA_DIR"

    # Set permissions
    chmod 755 "$INSTALL_PREFIX"
    chmod 755 "$CONFIG_DIR"
    chmod 755 "$LOG_DIR"
    chmod 700 "$DATA_DIR"
    chmod 700 "$SSL_DIR"

    log_success "Created all directories with proper permissions"
}

# Install binaries
install_binaries() {
    log_info "Installing binaries..."

    if [[ ! -f "target/release/mcp-chat" ]]; then
        log_error "mcp-chat binary not found. Please build it first:"
        log_error "  cargo build --release --bin mcp-chat"
        exit 1
    fi

    # Install binaries
    install -m 755 "target/release/mcp-chat" "$INSTALL_PREFIX/bin/"
    install -m 644 "mcp-server-http.js" "$INSTALL_PREFIX/"
    install -m 644 "package.json" "$INSTALL_PREFIX/"
    install -m 644 "package-lock.json" "$INSTALL_PREFIX/" 2>/dev/null || true

    # Install web interface
    cp -r web/* "$INSTALL_PREFIX/web/" 2>/dev/null || true

    # Install scripts
    install -m 755 "generate-ssl-cert.sh" "$INSTALL_PREFIX/"
    install -m 755 "test-api-key.sh" "$INSTALL_PREFIX/"

    log_success "Installed all binaries and files"
}

# Generate SSL certificates
generate_ssl() {
    log_info "Generating SSL certificates..."

    cd "$INSTALL_PREFIX"

    # Generate self-signed certificate
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$SSL_DIR/private.key" \
        -out "$SSL_DIR/certificate.crt" \
        -days 365 \
        -nodes \
        -subj "/C=US/ST=State/L=City/O=System Brain/CN=localhost" \
        2>/dev/null

    # Set permissions
    chown "$SERVICE_USER:$SERVICE_GROUP" "$SSL_DIR/private.key"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$SSL_DIR/certificate.crt"
    chmod 600 "$SSL_DIR/private.key"
    chmod 644 "$SSL_DIR/certificate.crt"

    log_success "Generated SSL certificates"
}

# Install Node.js dependencies
install_dependencies() {
    log_info "Installing Node.js dependencies..."

    cd "$INSTALL_PREFIX"

    # Install npm dependencies
    if command -v npm &> /dev/null; then
        npm install --production
        log_success "Installed Node.js dependencies"
    else
        log_warning "npm not found. Please install Node.js and run: npm install"
    fi
}

# Create environment configuration
create_environment_config() {
    log_info "Creating environment configuration..."

    cat > "$CONFIG_DIR/environment" << EOF
# System Brain Environment Configuration
# Copy this file and customize as needed

# Required: Ollama API key for AI functionality
# Get from: https://ollama.com
OLLAMA_API_KEY=3eea1d84afd34066b34970f8a3e5ca06.XXwG16QEx6HGWTHWN513x-LS

# Optional: AI model configuration
OLLAMA_DEFAULT_MODEL=mistral
OLLAMA_API_BASE_URL=https://api.ollama.com

# Server configuration
HTTP_PORT=8000
HTTPS_PORT=8443
BIND_IP=0.0.0.0

# HTTPS configuration
HTTPS_ENABLED=true
SSL_KEY_PATH=$SSL_DIR/private.key
SSL_CERT_PATH=$SSL_DIR/certificate.crt

# Authentication (leave empty to disable)
MCP_API_ENABLED=true
MCP_API_KEYS=prod-key-1,prod-key-2

# CORS configuration
CORS_ENABLED=true
CORS_ORIGINS=https://huggingface.co,https://yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE=$LOG_DIR/system-brain.log

# Metrics
METRICS_ENABLED=true

# Runtime directories
DATA_DIR=$DATA_DIR
CONFIG_DIR=$CONFIG_DIR
EOF

    chmod 600 "$CONFIG_DIR/environment"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_DIR/environment"

    log_success "Created environment configuration template"
    log_warning "IMPORTANT: Edit $CONFIG_DIR/environment and set OLLAMA_API_KEY"
}

# Create service management scripts
create_service_scripts() {
    log_info "Creating service management..."

    # Create start script for chatbot
    cat > "$INSTALL_PREFIX/start-chatbot.sh" << EOF
#!/bin/bash
# Start System Brain Chatbot

cd "$INSTALL_PREFIX"
source "$CONFIG_DIR/environment"

# Check if API key is set
if [[ -z "\$OLLAMA_API_KEY" || "\$OLLAMA_API_KEY" == "your-api-key-here" ]]; then
    echo "ERROR: OLLAMA_API_KEY not configured. Please edit $CONFIG_DIR/environment"
    exit 1
fi

echo "Starting System Brain Chatbot..."
exec "$INSTALL_PREFIX/bin/mcp-chat" >> "$LOG_DIR/chatbot.log" 2>&1
EOF

    # Create start script for web server
    cat > "$INSTALL_PREFIX/start-web.sh" << EOF
#!/bin/bash
# Start System Brain Web Server

cd "$INSTALL_PREFIX"
source "$CONFIG_DIR/environment"

# Check if API key is set
if [[ -z "\$OLLAMA_API_KEY" || "\$OLLAMA_API_KEY" == "your-api-key-here" ]]; then
    echo "ERROR: OLLAMA_API_KEY not configured. Please edit $CONFIG_DIR/environment"
    exit 1
fi

echo "Starting System Brain Web Server..."
exec /usr/bin/node "$INSTALL_PREFIX/mcp-server-http.js" >> "$LOG_DIR/web.log" 2>&1
EOF

    # Create systemd services if systemctl is available
    if command -v systemctl &> /dev/null; then
        # Chatbot service
        cat > "/etc/systemd/system/system-brain-chat.service" << EOF
[Unit]
Description=System Brain AI Chatbot
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
EnvironmentFile=$CONFIG_DIR/environment
ExecStart=$INSTALL_PREFIX/bin/mcp-chat
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=system-brain-chat

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=$DATA_DIR $LOG_DIR
ProtectKernelTunables=yes
ProtectControlGroups=yes

[Install]
WantedBy=multi-user.target
EOF

        # Web server service
        cat > "/etc/systemd/system/system-brain-web.service" << EOF
[Unit]
Description=System Brain Web Interface
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
EnvironmentFile=$CONFIG_DIR/environment
WorkingDirectory=$INSTALL_PREFIX
ExecStart=/usr/bin/node $INSTALL_PREFIX/mcp-server-http.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=system-brain-web

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=$DATA_DIR $LOG_DIR $SSL_DIR
ProtectKernelTunables=yes
ProtectControlGroups=yes

[Install]
WantedBy=multi-user.target
EOF

        systemctl daemon-reload 2>/dev/null || true
        log_success "Created systemd services"
    else
        log_warning "systemctl not available, created manual start scripts instead"
    fi

    # Make scripts executable
    chmod +x "$INSTALL_PREFIX/start-chatbot.sh"
    chmod +x "$INSTALL_PREFIX/start-web.sh"

    log_success "Created service management scripts"
}

# Configure firewall (optional)
configure_firewall() {
    log_info "Configuring firewall..."

    if command -v ufw &> /dev/null; then
        ufw allow 8000/tcp comment "System Brain HTTP"
        ufw allow 8443/tcp comment "System Brain HTTPS"
        log_success "Configured UFW firewall rules"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=8000/tcp --add-port=8443/tcp
        firewall-cmd --reload
        log_success "Configured firewalld rules"
    else
        log_warning "No supported firewall found. Please manually open ports 8000 and 8443"
    fi
}

# Create uninstall script
create_uninstall_script() {
    log_info "Creating uninstall script..."

    cat > "$INSTALL_PREFIX/uninstall.sh" << 'EOF'
#!/bin/bash
# System Brain Uninstall Script

set -e

echo "🛑 Uninstalling System Brain..."

# Stop and disable services
systemctl stop system-brain-web system-brain-chat 2>/dev/null || true
systemctl disable system-brain-web system-brain-chat 2>/dev/null || true

# Remove systemd files
rm -f /etc/systemd/system/system-brain-*.service
systemctl daemon-reload

# Remove firewall rules
if command -v ufw &> /dev/null; then
    ufw delete allow 8000/tcp
    ufw delete allow 8443/tcp
fi

# Remove files and directories
rm -rf /opt/system-brain
rm -rf /etc/system-brain
rm -rf /var/log/system-brain
rm -rf /var/lib/system-brain

# Remove user and group (if empty)
userdel system-brain 2>/dev/null || true
groupdel system-brain 2>/dev/null || true

echo "✅ System Brain uninstalled successfully"
EOF

    chmod +x "$INSTALL_PREFIX/uninstall.sh"

    log_success "Created uninstall script: $INSTALL_PREFIX/uninstall.sh"
}

# Display post-installation instructions
show_post_install_instructions() {
    log_success "System Brain installation completed!"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "🎉 INSTALLATION COMPLETE!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. 🔑 Configure API Key:"
    echo "   sudo nano $CONFIG_DIR/environment"
    echo "   Set: OLLAMA_API_KEY=your-key-from-https://ollama.com"
    echo ""
    echo "2. 🚀 Start Services:"

    if command -v systemctl &> /dev/null; then
        echo "   # Using systemd:"
        echo "   sudo systemctl enable system-brain-chat"
        echo "   sudo systemctl enable system-brain-web"
        echo "   sudo systemctl start system-brain-chat"
        echo "   sudo systemctl start system-brain-web"
        echo ""
        echo "   # Check status:"
        echo "   sudo systemctl status system-brain-chat"
        echo "   sudo systemctl status system-brain-web"
        echo "   sudo journalctl -u system-brain-chat -f"
    else
        echo "   # Manual startup:"
        echo "   sudo -u $SERVICE_USER $INSTALL_PREFIX/start-chatbot.sh &"
        echo "   sudo -u $SERVICE_USER $INSTALL_PREFIX/start-web.sh &"
        echo ""
        echo "   # Check logs:"
        echo "   tail -f $LOG_DIR/chatbot.log"
        echo "   tail -f $LOG_DIR/web.log"
    fi

    echo ""
    echo "3. 🌐 Access Web Interface:"
    echo "   HTTPS: https://localhost:8443"
    echo "   HTTP:  http://localhost:8000"
    echo ""
    echo "4. 🛡️ SSL Certificate (Production):"
    echo "   Replace $SSL_DIR/certificate.crt with real certificate"
    echo "   Update $SSL_DIR/private.key with private key"
    echo ""
    echo "5. 🗑️  Uninstall:"
    echo "   sudo $INSTALL_PREFIX/uninstall.sh"
    echo ""
    echo "6. 📚 Documentation:"
    echo "   API Setup: $INSTALL_PREFIX/API-KEY-SETUP.md"
    echo "   Web Interface: $INSTALL_PREFIX/WEB-INTERFACE-README.md"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

# Main installation function
main() {
    log_info "Starting System Brain installation..."

    check_root
    create_service_user
    create_directories
    install_binaries
    generate_ssl
    install_dependencies
    create_environment_config
    create_service_scripts
    configure_firewall
    create_uninstall_script

    show_post_install_instructions

    log_success "System Brain installed successfully!"
    log_warning "Remember to configure your OLLAMA_API_KEY before starting the services!"
}

# Run main function
main "$@"
