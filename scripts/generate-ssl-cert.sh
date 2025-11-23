#!/bin/bash
# Generate self-signed SSL certificate for HTTPS

set -e

SSL_DIR="./ssl"
KEY_FILE="$SSL_DIR/private.key"
CERT_FILE="$SSL_DIR/certificate.crt"

echo "🔐 Generating self-signed SSL certificate for HTTPS..."

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 365 \
    -nodes \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set appropriate permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo "✅ SSL certificate generated successfully!"
echo "   Private key: $KEY_FILE"
echo "   Certificate: $CERT_FILE"
echo ""
echo "🔒 For production, replace with certificates from a trusted CA"
echo "📝 Example with Let's Encrypt:"
echo "   certbot certonly --standalone -d yourdomain.com"
echo ""
echo "🚀 Start server with HTTPS:"
echo "   HTTPS_ENABLED=true node mcp-server-http.js"
