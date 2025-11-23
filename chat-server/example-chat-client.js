#!/usr/bin/env node
/**
 * Simple Chatbot Client Example
 * 
 * This script demonstrates how to connect to the chatbot via HTTP/HTTPS
 * 
 * Usage:
 *   node example-chat-client.js
 *   node example-chat-client.js --mcp
 *   node example-chat-client.js --websocket
 */

const http = require('http');
const https = require('https');
const WebSocket = require('ws');

// Configuration
const CHAT_SERVER_URL = process.env.CHAT_SERVER_URL || 'http://localhost:8080';
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8000';
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const API_KEY = process.env.MCP_API_KEY || '';

// Parse command line arguments
const args = process.argv.slice(2);
const useMCP = args.includes('--mcp');
const useWebSocket = args.includes('--websocket');

/**
 * HTTP/HTTPS Chat Client
 */
async function httpChatClient(message) {
  const url = new URL(`${CHAT_SERVER_URL}/api/chat`);
  const protocol = url.protocol === 'https:' ? https : http;
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

/**
 * MCP HTTP Client
 */
async function mcpClient(method, params = {}) {
  const url = new URL(`${MCP_SERVER_URL}/mcp`);
  const protocol = url.protocol === 'https:' ? https : http;
  
  return new Promise((resolve, reject) => {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    };
    
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        ...(API_KEY && { 'x-api-key': API_KEY })
      }
    };
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

/**
 * WebSocket Chat Client
 */
function websocketChatClient(message) {
  return new Promise((resolve, reject) => {
    const wsUrl = CHAT_SERVER_URL.replace(/^http/, 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ Connected to WebSocket');
      
      ws.send(JSON.stringify({
        type: 'chat',
        message: message,
        timestamp: Date.now()
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        ws.close();
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
    
    ws.on('error', (error) => {
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
    });
  });
}

/**
 * Main function
 */
async function main() {
  const message = process.argv.find(arg => !arg.startsWith('--')) || 'Hello! What can you do?';
  
  console.log('🤖 Chatbot Client Example\n');
  console.log(`Server: ${useMCP ? MCP_SERVER_URL : CHAT_SERVER_URL}`);
  console.log(`Mode: ${useWebSocket ? 'WebSocket' : useMCP ? 'MCP' : 'HTTP'}\n`);
  
  try {
    if (useWebSocket) {
      console.log('📡 Connecting via WebSocket...');
      const response = await websocketChatClient(message);
      console.log('\n💬 AI Response:');
      console.log(response.content || response.message || JSON.stringify(response, null, 2));
    } else if (useMCP) {
      console.log('📡 Connecting via MCP...');
      
      // Initialize
      console.log('1. Initializing MCP connection...');
      const init = await mcpClient('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'example-client',
          version: '1.0.0'
        }
      });
      console.log('✅ Initialized:', init.result?.serverInfo?.name || 'OK');
      
      // List tools
      console.log('\n2. Listing available tools...');
      const tools = await mcpClient('tools/list');
      console.log(`✅ Found ${tools.result?.tools?.length || 0} tools`);
      if (tools.result?.tools) {
        tools.result.tools.forEach(tool => {
          console.log(`   - ${tool.name}: ${tool.description}`);
        });
      }
      
      // Call a tool (example)
      if (tools.result?.tools?.length > 0) {
        console.log('\n3. Calling a tool...');
        const toolResult = await mcpClient('tools/call', {
          name: tools.result.tools[0].name,
          arguments: {}
        });
        console.log('✅ Tool result:', JSON.stringify(toolResult.result, null, 2));
      }
    } else {
      console.log('📡 Connecting via HTTP...');
      const response = await httpChatClient(message);
      console.log('\n💬 AI Response:');
      console.log(response.message || JSON.stringify(response, null, 2));
    }
    
    console.log('\n✅ Success!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the server is running:');
    console.error('   node chat-server.js');
    if (useMCP) {
      console.error('   node mcp-server-http.js');
    }
    console.error('2. Check the server URL:', useMCP ? MCP_SERVER_URL : CHAT_SERVER_URL);
    console.error('3. Check if API key is required:', API_KEY ? 'Set' : 'Not set');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { httpChatClient, mcpClient, websocketChatClient };


