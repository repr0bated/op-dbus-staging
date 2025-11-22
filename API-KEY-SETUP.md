# 🔑 System Brain API Key Setup

## Overview

The System Brain requires an API key for AI functionality. The system uses **Ollama Cloud API** for intelligent conversation and orchestration capabilities.

## 🚀 Quick Setup

### 1. Visit Ollama Cloud
Open your browser and go to: **https://ollama.com**

### 2. Sign Up or Sign In
- Click **"Sign In"** in the top right corner
- If you don't have an account: Click **"Sign up"**
- Use your email or GitHub account to register

### 3. Access API Keys
Once logged in:
1. Go to your account settings (click your profile picture)
2. Navigate to **"API Keys"** section
3. Click **"Create new API key"**
4. Give it a descriptive name like "System Brain MCP"
5. Copy the generated API key

### 4. Set Environment Variable

#### Linux/macOS:
```bash
export OLLAMA_API_KEY="your-api-key-here"
```

#### Windows (Command Prompt):
```cmd
set OLLAMA_API_KEY=your-api-key-here
```

#### Windows (PowerShell):
```powershell
$env:OLLAMA_API_KEY="your-api-key-here"
```

### 5. Test the Setup
```bash
# Start the System Brain chatbot
OLLAMA_API_KEY=your-key ./target/debug/mcp-chat

# Start the web interface
HTTPS_ENABLED=true node mcp-server-http.js
```

## 🔧 Configuration Options

### Environment Variables

```bash
# Required
OLLAMA_API_KEY=your-api-key-here

# Optional
OLLAMA_DEFAULT_MODEL=mistral        # Default AI model
OLLAMA_API_BASE_URL=https://api.ollama.com  # API endpoint
```

### Web Interface API Key

The web interface also accepts API keys for MCP authentication:

1. Open the web interface: https://localhost:8443
2. Click the **⚙️ Settings** button
3. Enter your API key in the **"API Key"** field
4. Click **"Save"**

## 🛡️ Security Best Practices

### API Key Management
- **Never commit API keys to version control**
- **Use environment variables, not hardcoded values**
- **Rotate keys regularly**
- **Use different keys for different environments**

### Environment File (Optional)
Create a `.env` file in the project root:

```bash
# .env file (add to .gitignore)
OLLAMA_API_KEY=your-actual-api-key-here
HTTPS_ENABLED=true
API_KEYS=dev-key-12345,prod-key-67890
```

### Production Deployment
For production systems:
- Use secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)
- Implement key rotation policies
- Monitor API key usage
- Set up alerts for unusual activity

## 🔍 Troubleshooting

### "OLLAMA_API_KEY required" Error
```bash
❌ OLLAMA_API_KEY required - AI is the core of this system
                 Get your API key from: https://ollama.com
```

**Solution**: Set the environment variable as shown above.

### "Invalid API key" Error
- Verify you copied the complete API key
- Check for extra spaces or characters
- Confirm the key is still active on Ollama's website
- Try regenerating the key

### Connection Issues
```bash
# Test API connectivity
curl -H "Authorization: Bearer $OLLAMA_API_KEY" \
     https://api.ollama.com/api/tags
```

### Rate Limiting
- Ollama Cloud has rate limits based on your plan
- Free tier: Limited requests per hour
- Paid plans: Higher limits and priority access

## 💰 Pricing & Plans

Ollama Cloud offers several pricing tiers:

- **Free**: Limited usage for testing
- **Pro**: $20/month - Higher limits, priority support
- **Team**: Custom pricing for organizations

Visit: https://ollama.com/pricing

## 📞 Support

If you encounter issues:

1. **Check Ollama Status**: https://status.ollama.com
2. **API Documentation**: https://docs.ollama.com/api/
3. **Community Support**: https://discord.gg/ollama
4. **System Brain Logs**: Check server logs for detailed error messages

## 🔄 Key Rotation

To rotate your API key:

1. Generate a new key on Ollama's website
2. Update environment variables
3. Restart System Brain services
4. Delete the old key from Ollama's dashboard

## 📋 Checklist

- [ ] Visit https://ollama.com
- [ ] Create/sign into account
- [ ] Generate API key
- [ ] Set `OLLAMA_API_KEY` environment variable
- [ ] Test connection with `./target/debug/mcp-chat`
- [ ] Access web interface at https://localhost:8443
- [ ] Configure API key in web settings (for MCP protocol access)

## 🔐 MCP Client Authentication

### For MCP Protocol Clients
**API Key Required** for direct MCP connections:

```bash
# Environment variable for MCP clients
export MCP_API_KEYS=key1,key2,key3

# Or disable authentication (not recommended for production)
unset MCP_API_KEYS
```

### Web Interface Users
**API Key Optional** - Web users can authenticate through the UI:

1. Visit https://localhost:8443
2. Click ⚙️ Settings
3. Enter API key for enhanced MCP features
4. Or use without key for basic chat

### Development Mode
For development/testing, you can disable MCP authentication:

```bash
# Disable MCP API key requirement
export MCP_API_KEYS=""

# Start server
node mcp-server-http.js
```

### Production Security
For production deployments:

```bash
# Require MCP authentication
export MCP_API_KEYS=prod-key-123,admin-key-456

# Enable HTTPS
export HTTPS_ENABLED=true

# Start secure server
node mcp-server-http.js
```
