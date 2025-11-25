# Quick Start: op-dbus Chat with Multi-Model Support

## 🚀 Get Started in 3 Steps

### 1. Get Free HuggingFace API Token
```bash
# Visit: https://huggingface.co/settings/tokens
# Create a "Read" token (100% free, no credit card!)
export HF_TOKEN="hf_your_token_here"

# Add to your shell profile for permanence (~/.bashrc or ~/.zshrc)
echo 'export HF_TOKEN="hf_your_token_here"' >> ~/.bashrc
```

### 2. Start Backend (Terminal 1)
```bash
cd /home/jeremy/git/op-dbus-staging

# Set your HuggingFace token
export HF_TOKEN="hf_your_token_here"

# Optional: Keep using Ollama as backup
export OLLAMA_API_KEY="your_ollama_key"  # or omit for HF-only

# Build and run
cargo run --bin chat-server

# You should see:
# ✅ Available models: meta-llama/Llama-3.3-70B-Instruct, mistralai/Mistral-7B-Instruct-v0.3, ...
# 🚀 MCP Chat Server starting...
```

### 3. Start Frontend (Terminal 2)
```bash
cd /home/jeremy/git/op-dbus-staging/chat-ui

# First time only
npm install

# Start dev server
npm run dev

# Opens at: http://localhost:5173
```

## ✨ You're Ready!

Open your browser to **http://localhost:5173**

### Things to Try:

1. **Select a Model**: Click the model dropdown - see all HuggingFace models
2. **Chat Away**: Ask about your system, run commands, manage services
3. **Use Tools**: AI automatically calls plugin tools when needed
4. **Switch Models**: Try different models per conversation

---

## 📋 Available Commands

### Development Mode (Recommended)
```bash
# Terminal 1: Rust backend
cargo run --bin chat-server

# Terminal 2: Frontend with hot reload
cd chat-ui && npm run dev
```

### Production Mode
```bash
# Build frontend once
cd chat-ui
npm run build

# Run backend (serves built frontend)
cd ..
cargo run --release --bin chat-server

# Access: http://localhost:8080
```

---

## 🎯 Model Selection

### In the UI:
- **Model Dropdown**: Top of chat window
- **Default**: Llama 3.3 70B (HuggingFace)
- **Switches**: Per conversation (each chat can use different model)

### Available Models (Default Config):
1. **🤗 Llama 3.3 70B** - Best for complex tasks
2. **🤗 Mistral 7B** - Fast, efficient  
3. **🤗 Qwen 2.5 72B** - Great reasoning
4. **🤗 Gemma 2 9B** - Google's model

### Add More Models:
Edit `chat-ui/.env.local` and add to the `MODELS` array:
```javascript
{
  "name": "model-id-from-huggingface",
  "displayName": "🤗 My Model",
  "endpoints": [{
    "type": "tgi",
    "url": "https://api-inference.huggingface.co/models/model-id"
  }]
}
```

Browse models at: https://huggingface.co/models?pipeline_tag=text-generation

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `chat-ui/.env.local` | Frontend model list & settings |
| `models.toml` | Backend model registry |
| `.env` | API keys (HF_TOKEN, OLLAMA_API_KEY) |

---

## 🆘 Troubleshooting

### "Connection refused"
- Ensure backend is running: `cargo run --bin chat-server`
- Check it's on port 8080: Look for "🚀 MCP Chat Server starting..."

### "Model not loading"
- Verify HF_TOKEN is set: `echo $HF_TOKEN`
- Some models need approval - check huggingface.co/models/MODEL_NAME

### "Build errors"
```bash
# Ensure Rust is up to date
rustup update

# Clean build
cargo clean
cargo build

# Frontend issues
cd chat-ui
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Check Status

```bash
# Backend health
curl http://localhost:8080/api/chat/health

# Available models
curl http://localhost:8080/api/chat/models

# Server status
curl http://localhost:8080/api/chat/status
```

---

## 🎉 Success Indicators

You should see:
- ✅ Backend: "Available models: meta-llama/Llama-3.3-70B-Instruct, ..."
- ✅ Frontend: Opens at http://localhost:5173
- ✅ Model dropdown showing all configured models
- ✅ Chat responds using selected model

---

## Next Steps

1. **Try Different Models** - See which works best for you
2. **Use System Tools** - Ask AI to check services, configure network, etc.
3. **Read Documentation**:
   - `MULTI_MODEL_SETUP.md` - Detailed model configuration
   - `MCP_ARCHITECTURE.md` - How tools/agents/MCP work
   - `REGISTRATION_VERIFICATION.md` - What's registered

Enjoy your multi-model AI-powered system management! 🎊
