# Multi-Model AI Setup for op-dbus Chat

## Overview
op-dbus now supports **multiple AI providers** with model selection in the chat UI.

**Primary Provider**: HuggingFace (free tier, no rate limits for most models)  
**Secondary**: Ollama (local/cloud as backup)

## Quick Start

### 1. Get HuggingFace API Token (Free!)
```bash
# Visit: https://huggingface.co/settings/tokens
# Create a "Read" token (free, no credit card needed)
export HF_TOKEN="hf_your_token_here"
```

### 2. Configure Available Models
Edit `chat-ui/.env.local` to add/remove models:
```bash
# HuggingFace models are configured in MODELS array
# Format: model_id from https://huggingface.co/models
```

### 3. Start Backend (Rust)
```bash
cd /home/jeremy/git/op-dbus-staging
export HF_TOKEN="hf_your_token_here"
cargo run --bin chat-server
```

### 4. Start Frontend (chat-ui)
```bash
cd chat-ui
npm install  # First time only
npm run dev
```

### 5. Open Browser
```
http://localhost:5173
```

## Available Models (Default Configuration)

### HuggingFace (Primary) 🤗
- **Llama 3.3 70B** - Best for complex system tasks
- **Mistral 7B** - Fast, efficient for quick queries  
- **Qwen 2.5 72B** - Excellent reasoning and coding
- **Gemma 2 9B** - Google's efficient model

### Ollama (Backup)
- **Mistral** - Local model (if Ollama installed)

## Model Selection

### In Chat UI:
1. Click the model dropdown in the chat interface
2. Select from any available model
3. Model persists per conversation

### Via API:
```bash
# List available models
curl http://localhost:8080/api/chat/models

# Response:
{
  "models": [
    {
      "id": "meta-llama/Llama-3.3-70B-Instruct",
      "name": "🤗 meta-llama/Llama-3.3-70B-Instruct",
      "provider": "huggingface",
      "description": "AI model via huggingface"
    },
    ...
  ],
  "default_model": "meta-llama/Llama-3.3-70B-Instruct"
}
```

## Adding More Models

### HuggingFace Models
Browse https://huggingface.co/models?pipeline_tag=text-generation

Add to `chat-ui/.env.local`:
```javascript
{
  "name": "model-id-from-huggingface",
  "displayName": "🤗 Display Name",
  "description": "Model description",
  "endpoints": [{
    "type": "tgi", 
    "url": "https://api-inference.huggingface.co/models/model-id"
  }]
}
```

### Ollama Models (Local)
```bash
# Install Ollama: https://ollama.ai
ollama pull llama2
ollama pull codellama
```

## Configuration Files

- **Backend Models**: `models.toml` (Rust reads this)
- **Frontend Models**: `chat-ui/.env.local` (SvelteKit reads this)
- **Runtime Config**: Backend API `/api/chat/models`

## Benefits

✅ **No Rate Limits** - HuggingFace Inference API is generous  
✅ **Free Tier** - Most models available without payment  
✅ **Model Choice** - Switch models per conversation  
✅ **Multiple Providers** - Not locked into one service  
✅ **Offline Support** - Ollama works without internet  

## Troubleshooting

### "Model not loading"
- Check HF_TOKEN is set correctly
- Verify model ID at huggingface.co/models
- Some models may need approval (check model page)

### "Rate limit exceeded"
- Switch to a different model temporarily
- HuggingFace has per-model limits, not global
- Consider using local Ollama as backup

### "Connection refused"
- Ensure Rust backend is running on port 8080
- Check `PUBLIC_ORIGIN` in `.env.local` matches backend

## Next Steps

1. Get your free HuggingFace token
2. Try different models to find your favorite
3. Add more models from huggingface.co/models
4. Enjoy multi-model AI for your system management!
