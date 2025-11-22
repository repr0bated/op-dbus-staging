#!/bin/bash
# Test Ollama API key validity

set -e

if [ -z "$OLLAMA_API_KEY" ]; then
    echo "❌ OLLAMA_API_KEY environment variable not set"
    echo ""
    echo "📝 To set your API key:"
    echo "   export OLLAMA_API_KEY='your-key-here'"
    echo ""
    echo "🔑 Get your API key from: https://ollama.com"
    exit 1
fi

echo "🔍 Testing Ollama API key..."
echo "📡 API Key: ${OLLAMA_API_KEY:0:10}..."
echo ""

# Test API key with a simple request
curl -s -X POST "https://api.ollama.com/api/generate" \
    -H "Authorization: Bearer $OLLAMA_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "mistral",
        "prompt": "Hello",
        "stream": false,
        "options": {
            "num_predict": 10
        }
    }' > /tmp/ollama_test.json 2>/dev/null

if [ $? -eq 0 ] && [ -s /tmp/ollama_test.json ]; then
    if grep -q "response" /tmp/ollama_test.json; then
        echo "✅ API key is valid!"
        echo "🚀 You can now start the System Brain:"
        echo "   ./target/debug/mcp-chat"
        echo ""
        echo "🌐 Web interface:"
        echo "   HTTPS_ENABLED=true node mcp-server-http.js"
        echo "   Open: https://localhost:8443"
    else
        echo "❌ API key appears invalid or expired"
        echo "🔄 Please check your key at: https://ollama.com"
        echo ""
        echo "📄 Response:"
        cat /tmp/ollama_test.json
    fi
else
    echo "❌ Failed to connect to Ollama API"
    echo "🔍 Check your internet connection and API key"
fi

rm -f /tmp/ollama_test.json
