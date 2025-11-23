#!/bin/bash
# System Brain - Public IP Configuration Script
# Makes MCP HuggingChat interface available on public IP

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PUBLIC_IP=""
DOMAIN_NAME=""
EMAIL=""
HTTPS_PORT=8443
HTTP_PORT=8000

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

# Detect public IP
detect_public_ip() {
    log_info "Detecting public IP address..."

    # Try multiple services to detect public IP
    PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || \
                curl -s https://ipecho.net/plain 2>/dev/null || \
                curl -s https://ifconfig.me 2>/dev/null || \
                curl -s https://icanhazip.com 2>/dev/null)

    if [[ -z "$PUBLIC_IP" ]]; then
        log_error "Could not detect public IP. Please set it manually:"
        log_error "  export PUBLIC_IP=your.public.ip.address"
        exit 1
    fi

    log_success "Detected public IP: $PUBLIC_IP"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall for public access..."

    if command -v ufw &> /dev/null; then
        log_info "Using UFW firewall..."
        sudo ufw allow $HTTP_PORT/tcp comment "System Brain HTTP"
        sudo ufw allow $HTTPS_PORT/tcp comment "System Brain HTTPS"
        sudo ufw --force enable
        log_success "UFW configured"
    elif command -v firewall-cmd &> /dev/null; then
        log_info "Using firewalld..."
        sudo firewall-cmd --permanent --add-port=$HTTP_PORT/tcp
        sudo firewall-cmd --permanent --add-port=$HTTPS_PORT/tcp
        sudo firewall-cmd --reload
        log_success "Firewalld configured"
    elif command -v iptables &> /dev/null; then
        log_info "Using iptables..."
        sudo iptables -I INPUT -p tcp --dport $HTTP_PORT -j ACCEPT
        sudo iptables -I INPUT -p tcp --dport $HTTPS_PORT -j ACCEPT
        # Save iptables rules (distro-specific)
        if command -v netfilter-persistent &> /dev/null; then
            sudo netfilter-persistent save
        fi
        log_success "Iptables configured"
    else
        log_warning "No supported firewall detected. Please manually open ports $HTTP_PORT and $HTTPS_PORT"
    fi
}

# Configure SSL for domain (optional)
configure_ssl_domain() {
    if [[ -n "$DOMAIN_NAME" && -n "$EMAIL" ]]; then
        log_info "Configuring SSL certificate for domain: $DOMAIN_NAME"

        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            log_info "Installing certbot..."
            sudo apt update && sudo apt install -y certbot python3-certbot-nginx
        fi

        # Stop services temporarily
        sudo systemctl stop system-brain-web 2>/dev/null || true
        sudo pkill -f "mcp-server-http.js" || true

        # Get SSL certificate
        sudo certbot certonly --standalone -d "$DOMAIN_NAME" --email "$EMAIL" --agree-tos --non-interactive

        if [[ $? -eq 0 ]]; then
            # Update configuration to use real SSL certificates
            sudo tee /etc/system-brain/environment > /dev/null << EOF
# System Brain Environment Configuration
# Updated for public domain access

# Required: Ollama API key for AI functionality
OLLAMA_API_KEY=3eea1d84afd34066b34970f8a3e5ca06.XXwG16QEx6HGWTHWN513x-LS

# Server configuration for public access
HTTP_PORT=80
HTTPS_PORT=443
BIND_IP=0.0.0.0

# HTTPS configuration with real certificates
HTTPS_ENABLED=true
SSL_KEY_PATH=/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem

# Authentication
MCP_API_ENABLED=true
MCP_API_KEYS=public-key-1,public-key-2

# CORS for public access
CORS_ENABLED=true
CORS_ORIGINS=https://huggingface.co,https://hf.co,https://$DOMAIN_NAME

# Logging
LOG_LEVEL=info

# Metrics
METRICS_ENABLED=true
EOF

            log_success "SSL certificate configured for $DOMAIN_NAME"

            # Set up automatic renewal
            sudo crontab -l | grep -q certbot || (sudo crontab -l ; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -

            log_success "SSL certificate auto-renewal configured"
        else
            log_error "Failed to obtain SSL certificate"
        fi
    fi
}

# Configure Nginx reverse proxy (optional)
configure_nginx() {
    if [[ -n "$DOMAIN_NAME" ]]; then
        log_info "Configuring Nginx reverse proxy..."

        # Install nginx if not present
        if ! command -v nginx &> /dev/null; then
            sudo apt update && sudo apt install -y nginx
        fi

        # Create nginx configuration
        sudo tee /etc/nginx/sites-available/system-brain > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Proxy to System Brain
    location / {
        proxy_pass https://127.0.0.1:$HTTPS_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (no auth required)
    location /health {
        proxy_pass https://127.0.0.1:$HTTPS_PORT;
        access_log off;
    }
}
EOF

        # Enable site
        sudo ln -sf /etc/nginx/sites-available/system-brain /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx

        log_success "Nginx reverse proxy configured"
    fi
}

# Update System Brain configuration for public access
configure_system_brain() {
    log_info "Configuring System Brain for public access..."

    # Update CORS origins to include the public domain
    if [[ -n "$DOMAIN_NAME" ]]; then
        sudo sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://huggingface.co,https://hf.co,https://$DOMAIN_NAME,https://$PUBLIC_IP|" /etc/system-brain/environment
    else
        sudo sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://huggingface.co,https://hf.co,https://$PUBLIC_IP|" /etc/system-brain/environment
    fi

    # Update bind IP to listen on all interfaces
    sudo sed -i "s|BIND_IP=.*|BIND_IP=0.0.0.0|" /etc/system-brain/environment

    log_success "System Brain configuration updated for public access"
}

# Generate access URLs
generate_access_info() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "🌐 PUBLIC ACCESS CONFIGURED!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    if [[ -n "$DOMAIN_NAME" ]]; then
        echo "🔒 Secure Domain Access:"
        echo "   HTTPS: https://$DOMAIN_NAME"
        echo "   WebSocket: wss://$DOMAIN_NAME/mcp-ws"
        echo ""
        echo "🔓 HTTP Redirect:"
        echo "   HTTP: http://$DOMAIN_NAME → HTTPS"
        echo ""
    fi

    echo "🌍 Direct IP Access:"
    echo "   HTTPS: https://$PUBLIC_IP:$HTTPS_PORT"
    echo "   HTTP:  http://$PUBLIC_IP:$HTTP_PORT"
    echo "   WebSocket: wss://$PUBLIC_IP:$HTTPS_PORT/mcp-ws"
    echo ""

    echo "🤖 MCP Client Connections:"
    echo "   Endpoint: https://$PUBLIC_IP:$HTTPS_PORT/mcp"
    echo "   API Keys: Configure in client settings"
    echo ""

    echo "📊 Monitoring:"
    echo "   Health: https://$PUBLIC_IP:$HTTPS_PORT/health"
    echo "   Status: https://$PUBLIC_IP:$HTTPS_PORT/status"
    echo "   Metrics: https://$PUBLIC_IP:$HTTPS_PORT/metrics"
    echo ""

    if [[ -n "$DOMAIN_NAME" ]]; then
        echo "🔧 SSL Certificate:"
        echo "   Auto-renewal: Configured (runs daily at noon)"
        echo "   Manual renew: sudo certbot renew"
        echo ""
    fi

    echo "⚠️  Security Notes:"
    echo "   • Change default API keys in /etc/system-brain/environment"
    echo "   • Monitor access logs: tail -f /var/log/system-brain/web.log"
    echo "   • Consider rate limiting for production use"
    echo "   • Keep system updated: sudo apt update && sudo apt upgrade"
    echo ""

    echo "═══════════════════════════════════════════════════════════════"
}

# Interactive setup
interactive_setup() {
    echo "🔧 System Brain - Public IP Configuration"
    echo ""

    # Detect public IP
    detect_public_ip

    # Ask for domain (optional)
    read -p "Do you have a domain name? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your domain name (e.g., chat.yourdomain.com): " DOMAIN_NAME
        read -p "Enter your email for SSL certificates: " EMAIL
    fi

    # Confirm configuration
    echo ""
    echo "Configuration Summary:"
    echo "  Public IP: $PUBLIC_IP"
    if [[ -n "$DOMAIN_NAME" ]]; then
        echo "  Domain: $DOMAIN_NAME"
        echo "  Email: $EMAIL"
    fi
    echo ""

    read -p "Proceed with configuration? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "Configuration cancelled"
        exit 0
    fi
}

# Main function
main() {
    log_info "Starting System Brain public IP configuration..."

    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (sudo)"
        exit 1
    fi

    # Interactive setup
    interactive_setup

    # Configure components
    configure_firewall
    configure_system_brain

    if [[ -n "$DOMAIN_NAME" && -n "$EMAIL" ]]; then
        configure_ssl_domain
        configure_nginx
    fi

    # Restart services
    log_info "Restarting System Brain services..."
    sudo systemctl restart system-brain-web 2>/dev/null || \
    sudo pkill -f "mcp-server-http.js" || true
    sleep 2
    sudo /opt/system-brain/start-web.sh &

    generate_access_info

    log_success "System Brain is now accessible on public IP!"
    log_warning "Remember to configure strong API keys and monitor access logs"
}

# Run main function
main "$@"
