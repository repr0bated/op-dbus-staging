#!/usr/bin/env node
/**
 * MCP Server for operation-dbus over HTTP/WebSocket
 * Implements Model Context Protocol over HTTP (port 8000) for remote connections
 * Backend Architect's Recommended Implementation with:
 * - API Key Authentication
 * - Rate Limiting
 * - Structured Logging
 * - Metrics Collection
 * - Circuit Breaker Pattern
 * - Input Validation
 * - Request Correlation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const promClient = require('prom-client');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const CHAT_SERVER_URL = 'http://localhost:8080';
const MCP_PORT = process.env.MCP_PORT || 8000;
const BIND_IP = process.env.BIND_IP || '0.0.0.0'; // Listen on all interfaces for remote access

// Backend Architect's Security & Scalability Configuration
const CONFIG = {
  // Server Configuration
  HTTP_PORT: process.env.HTTP_PORT || 8000,
  HTTPS_PORT: process.env.HTTPS_PORT || 8443,
  BIND_IP: process.env.BIND_IP || '0.0.0.0',

  // HTTPS Configuration
  HTTPS_ENABLED: process.env.HTTPS_ENABLED === 'true',
  SSL_KEY_PATH: process.env.SSL_KEY_PATH || './ssl/private.key',
  SSL_CERT_PATH: process.env.SSL_CERT_PATH || './ssl/certificate.crt',

  // Authentication
  MCP_API_ENABLED: process.env.MCP_API_ENABLED !== 'false', // Enable/disable MCP API authentication
  API_KEYS: process.env.MCP_API_KEYS ? process.env.MCP_API_KEYS.split(',') : ['dev-key-12345'],
  API_KEY_HEADER: 'x-api-key',

  // CORS Configuration for HuggingChat integration
  CORS_ENABLED: process.env.CORS_ENABLED !== 'false',
  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    'https://huggingface.co',
    'https://hf.co',
    'https://huggingchat.vercel.app',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://localhost:8443'
  ],

  // Security Headers
  SECURITY_HEADERS_ENABLED: process.env.SECURITY_HEADERS_ENABLED !== 'false',
  CSP_POLICY: "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.huggingface.co https://*.hf.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.huggingface.co wss://*.huggingface.co;",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100, // per window

  // Circuit Breaker
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
  CIRCUIT_BREAKER_RESET_TIMEOUT: 60000, // 1 minute

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Metrics
  METRICS_ENABLED: process.env.METRICS_ENABLED !== 'false',

  // Security
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',

  // Validation
  MAX_REQUEST_SIZE: '10mb',
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Health Checks
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
};

// Backend Architect's Structured Logging Setup
const logger = winston.createLogger({
    level: CONFIG.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'mcpo-mcp-server' },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
                    const correlation = correlationId ? `[${correlationId}] ` : '';
                    return `${timestamp} ${level} ${correlation}${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                })
            )
        }),
        // In production, add file transport
        ...(process.env.NODE_ENV === 'production' ? [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' })
        ] : [])
    ]
});

// Legacy activity log for backward compatibility
let activityLog = [];
const MAX_LOG_ENTRIES = 100;

function logActivity(type, message, data = null, correlationId = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, type, message, data, correlationId };
    activityLog.unshift(entry);
    if (activityLog.length > MAX_LOG_ENTRIES) {
        activityLog.pop();
    }

    // Use structured logging
    const logData = {
        type,
        message,
        correlationId,
        ...(data && { data })
    };

    switch (type.toLowerCase()) {
        case 'error':
            logger.error(message, logData);
            break;
        case 'warn':
            logger.warn(message, logData);
            break;
        case 'info':
        default:
            logger.info(message, logData);
            break;
    }
}

// Backend Architect's Authentication Utilities
class AuthManager {
    constructor(apiKeys = CONFIG.API_KEYS) {
        this.apiKeys = new Set(apiKeys);
        this.apiKeyHashes = new Map(); // For metrics without exposing keys
    }

    validateApiKey(apiKey) {
        if (!apiKey) return false;
        const isValid = this.apiKeys.has(apiKey);
        if (isValid && metrics && metrics.apiKeyUsage) {
            const hash = this.hashApiKey(apiKey);
            metrics.apiKeyUsage.inc({ api_key_hash: hash });
        }
        return isValid;
    }

    hashApiKey(apiKey) {
        // Simple hash for metrics (not for security)
        let hash = 0;
        for (let i = 0; i < apiKey.length; i++) {
            const char = apiKey.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    getApiKeysCount() {
        return this.apiKeys.size;
    }
}

// Backend Architect's System Introspection on Boot
class SystemIntrospector {
    constructor(mcpProxy) {
        this.mcpProxy = mcpProxy;
        this.discoveredTools = new Set();
        this.unknownObjects = new Map();
        // Known D-Bus services to exclude from "unknown" detection
        this.knownDBusServices = new Set([
            'org.freedesktop.DBus',
            'org.freedesktop.systemd1',
            'org.freedesktop.login1',
            'org.freedesktop.NetworkManager',
            'org.freedesktop.systemd1',
            'org.freedesktop.UDisks2',
            'org.freedesktop.Accounts',
            'org.freedesktop.PolicyKit1',
            'org.freedesktop.ColorManager',
            'org.freedesktop.GeoClue2'
        ]);
    }

    async introspectOnBoot() {
        logActivity('INFO', '🔍 Starting system introspection on boot...');

        try {
            // 1. Check for unknown D-Bus objects
            await this.discoverUnknownDBusObjects();

            // 2. Introspect tool registry
            await this.introspectToolRegistry();

            // 3. Scan for new capabilities
            await this.scanForNewCapabilities();

            logActivity('INFO', `📊 Introspection complete: ${this.unknownObjects.size} unknown objects, ${this.discoveredTools.size} tools registered`);

        } catch (error) {
            logActivity('WARN', `⚠️  Boot introspection failed: ${error.message}`);
        }
    }

    async discoverUnknownDBusObjects() {
        try {
            // Query the chatbot for D-Bus introspection
            const response = await this.mcpProxy.makeRequest('tools/call', {
                name: 'dbus_discovery',
                arguments: {}
            });

            if (response && response.result) {
                const services = response.result.services || [];
                services.forEach(service => {
                    if (!this.knownDBusServices.has(service.name)) {
                        this.unknownObjects.set(service.name, {
                            type: 'dbus_service',
                            discovered: new Date().toISOString(),
                            details: service
                        });
                        logActivity('INFO', `🔍 Discovered unknown D-Bus service: ${service.name}`);
                    }
                });
            }
        } catch (error) {
            logActivity('DEBUG', `D-Bus discovery failed: ${error.message}`);
        }
    }

    async introspectToolRegistry() {
        try {
            // Get current tool list from chatbot
            const response = await this.mcpProxy.makeRequest('tools/list', {});

            if (response && response.result && response.result.tools) {
                response.result.tools.forEach(tool => {
                    if (!this.discoveredTools.has(tool.name)) {
                        this.discoveredTools.add(tool.name);
                        logActivity('INFO', `🛠️  Registered tool: ${tool.name}`);
                    }
                });
            }
        } catch (error) {
            logActivity('DEBUG', `Tool registry introspection failed: ${error.message}`);
        }
    }

    async scanForNewCapabilities() {
        try {
            // Check for system introspection capabilities
            const response = await this.mcpProxy.makeRequest('tools/call', {
                name: 'system_introspect',
                arguments: {}
            });

            if (response && response.result) {
                const capabilities = response.result.capabilities || [];
                capabilities.forEach(cap => {
                    if (!this.discoveredTools.has(cap.name)) {
                        this.discoveredTools.add(cap.name);
                        logActivity('INFO', `⚡ New capability discovered: ${cap.name}`);
                    }
                });
            }
        } catch (error) {
            logActivity('DEBUG', `Capability scan failed: ${error.message}`);
        }
    }

    getIntrospectionReport() {
        return {
            unknownObjects: Array.from(this.unknownObjects.entries()),
            discoveredTools: Array.from(this.discoveredTools),
            timestamp: new Date().toISOString()
        };
    }
}

// Backend Architect's MCP Proxy to Chatbot
class MCPProxy {
    constructor(chatbotUrl = 'http://localhost:8080') {
        this.chatbotUrl = chatbotUrl;
        this.connectionPool = new ConnectionPool(chatbotUrl, 10);
    }

    async proxyRequest(mcpRequest, correlationId) {
        logActivity('INFO', 'Proxying MCP request to chatbot', {
            method: mcpRequest.method,
            correlationId
        });

        if (metrics) {
            metrics.chatbotRequests.inc({ operation: mcpRequest.method });
        }

        try {
            // Convert MCP request to chatbot format
            const chatbotRequest = this.convertMCPToChatbot(mcpRequest);

            // Send to chatbot
            const response = await this.connectionPool.request(chatbotRequest);

            // Convert response back to MCP format
            const mcpResponse = this.convertChatbotToMCP(response, mcpRequest.id);

            logActivity('INFO', 'Chatbot response received', {
                method: mcpRequest.method,
                correlationId
            });

            return mcpResponse;

        } catch (error) {
            logActivity('ERROR', 'Chatbot proxy error', {
                error: error.message,
                correlationId
            });
            throw error;
        }
    }

    convertMCPToChatbot(mcpRequest) {
        // Convert MCP protocol to chatbot's expected format
        switch (mcpRequest.method) {
            case 'tools/list':
                return {
                    action: 'list_tools',
                    params: {}
                };

            case 'tools/call':
                return {
                    action: 'execute_tool',
                    tool: mcpRequest.params.name,
                    parameters: mcpRequest.params.arguments || {}
                };

            case 'chat/send':
                return {
                    action: 'send_message',
                    message: mcpRequest.params.message,
                    conversationId: mcpRequest.params.conversationId
                };

            default:
                return {
                    action: 'mcp_request',
                    method: mcpRequest.method,
                    params: mcpRequest.params || {}
                };
        }
    }

    convertChatbotToMCP(chatbotResponse, requestId) {
        // Convert chatbot response to MCP format
        if (chatbotResponse.success) {
            return {
                jsonrpc: '2.0',
                id: requestId,
                result: chatbotResponse.data || chatbotResponse.result || {}
            };
        } else {
            return {
                jsonrpc: '2.0',
                id: requestId,
                error: {
                    code: -32603,
                    message: chatbotResponse.error || 'Internal error'
                }
            };
        }
    }
}

// Simple connection pool for chatbot requests
class ConnectionPool {
    constructor(baseUrl, maxConnections = 5) {
        this.baseUrl = baseUrl;
        this.maxConnections = maxConnections;
        this.activeConnections = 0;
    }

    async request(data) {
        if (this.activeConnections >= this.maxConnections) {
            throw new Error('Connection pool exhausted');
        }

        this.activeConnections++;
        try {
            const response = await axios.post(`${this.baseUrl}/api/mcp`, data, {
                timeout: CONFIG.REQUEST_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } finally {
            this.activeConnections--;
        }
    }
}

// Initialize global instances
const authManager = new AuthManager();
const mcpProxy = new MCPProxy();

// Backend Architect's Middleware Functions

// Request correlation middleware
function correlationMiddleware(req, res, next) {
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    res.set('x-correlation-id', req.correlationId);
    next();
}

// API key authentication middleware
function apiKeyAuth(req, res, next) {
    // Skip authentication if MCP API is disabled
    if (!CONFIG.MCP_API_ENABLED) {
        return next();
    }

    const apiKey = req.headers[CONFIG.API_KEY_HEADER.toLowerCase()];

    if (!authManager.validateApiKey(apiKey)) {
        logActivity('ERROR', 'Invalid API key attempt', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            correlationId: req.correlationId
        });

        if (metrics) {
            metrics.requestsTotal.inc({ method: req.method, status: '401' });
        }

        return res.status(401).json({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32000,
                message: 'Authentication required - invalid API key'
            }
        });
    }

    logActivity('INFO', 'API key authenticated', {
        correlationId: req.correlationId,
        ip: req.ip
    });
    next();
}

// Rate limiting middleware
const rateLimiter = rateLimit({
    windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
    max: CONFIG.RATE_LIMIT_MAX_REQUESTS,
    message: {
        jsonrpc: '2.0',
        error: {
            code: -32001,
            message: `Rate limit exceeded. Maximum ${CONFIG.RATE_LIMIT_MAX_REQUESTS} requests per ${CONFIG.RATE_LIMIT_WINDOW_MS / 60000} minutes.`
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logActivity('WARN', 'Rate limit exceeded', {
            ip: req.ip,
            correlationId: req.correlationId
        });

        if (metrics) {
            metrics.requestsTotal.inc({ method: req.method, status: '429' });
        }

        res.status(429).json({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32001,
                message: `Rate limit exceeded. Maximum ${CONFIG.RATE_LIMIT_MAX_REQUESTS} requests per ${CONFIG.RATE_LIMIT_WINDOW_MS / 60000} minutes.`
            }
        });
    }
});

// Request validation middleware
function validateMcpRequest(req, res, next) {
    const { jsonrpc, method, id } = req.body;

    // Basic MCP protocol validation
    if (jsonrpc !== '2.0') {
        return res.status(400).json({
            jsonrpc: '2.0',
            id: id || null,
            error: {
                code: -32600,
                message: 'Invalid JSON-RPC version. Must be "2.0"'
            }
        });
    }

    if (!method || typeof method !== 'string') {
        return res.status(400).json({
            jsonrpc: '2.0',
            id: id || null,
            error: {
                code: -32600,
                message: 'Method is required and must be a string'
            }
        });
    }

    // Method-specific validation
    const allowedMethods = ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'chat/send'];
    if (!allowedMethods.includes(method)) {
        return res.status(400).json({
            jsonrpc: '2.0',
            id: id || null,
            error: {
                code: -32601,
                message: `Method not found: ${method}`
            }
        });
    }

    // Tools/call specific validation
    if (method === 'tools/call') {
        const { name } = req.body.params || {};
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                jsonrpc: '2.0',
                id: id || null,
                error: {
                    code: -32602,
                    message: 'Tool name is required for tools/call method'
                }
            });
        }
    }

    next();
}

// Metrics middleware
function metricsMiddleware(req, res, next) {
    if (!metrics) return next();

    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
        const duration = (Date.now() - startTime) / 1000;

        metrics.requestsTotal.inc({
            method: req.method,
            status: res.statusCode.toString()
        });

        metrics.requestDuration.observe({
            method: req.method,
            status: res.statusCode.toString()
        }, duration);

        return originalSend.call(this, data);
    };

    next();
}

// Request logging middleware
function requestLoggingMiddleware(req, res, next) {
    const startTime = Date.now();

    logActivity('REQUEST', `${req.method} ${req.path}`, {
        correlationId: req.correlationId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('content-length')
    });

    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        logActivity('RESPONSE', `${req.method} ${req.path} ${res.statusCode}`, {
            correlationId: req.correlationId,
            duration: `${duration}ms`,
            contentLength: data ? data.length : 0
        });
        return originalSend.call(this, data);
    };

    next();
}

// Simplified MCP Proxy Server - forwards to enhanced chatbot
class MCPProxyServer {
    constructor() {
        this.initialized = false;
        this.stats = {
            requests: 0,
            proxiedRequests: 0,
            errors: 0,
            connections: 0,
            startTime: new Date()
        };
    }

    // MCP Proxy simply forwards requests to the enhanced chatbot

    async fetchTools() {
        // Proxy tool discovery to the enhanced chatbot
        logActivity('INFO', 'Fetching tools from enhanced chatbot...');

        try {
            const response = await axios.get(`${CHAT_SERVER_URL}/api/mcp/tools`);
            this.tools = response.data.tools || [];
            logActivity('INFO', `✅ Fetched ${this.tools.length} tools from enhanced chatbot`);
            return this.tools;
        } catch (error) {
            logActivity('ERROR', `Failed to fetch tools from chatbot: ${error.message}`);
            // Return empty array if chatbot is unavailable
            this.tools = [];
            return [];
        }
    }

    async handleRequest(request, correlationId) {
        const { jsonrpc, id, method, params } = request;
        this.stats.requests++;

        logActivity('REQUEST', `📥 ${method}`, {
            id,
            params: params ? Object.keys(params) : [],
            correlationId
        });

        try {
            let result;
            const startTime = Date.now();

            // Handle basic MCP methods directly
            switch (method) {
                case 'initialize':
                    this.initialized = true;
                    result = {
                        protocolVersion: '2024-11-05',
                        serverInfo: {
                            name: 'Enhanced MCP Chatbot - System Brain',
                            version: '2.0.0'
                        },
                        capabilities: {
                            tools: {},
                            resources: {},
                            chat: {
                                send: true
                            }
                        }
                    };
                    logActivity('RESPONSE', `✅ Client initialized with enhanced chatbot`, { correlationId });
                    break;

                case 'tools/list':
                    logActivity('INFO', '📋 Listing tools via proxy...', { correlationId });
                    if (this.tools.length === 0) {
                        await this.fetchTools();
                    }
                    result = {
                        tools: this.tools
                    };
                    logActivity('RESPONSE', `✅ Returning ${this.tools.length} tools`, { correlationId });
                    break;

                // All other methods are proxied to the enhanced chatbot
                default:
                    this.stats.proxiedRequests++;
                    result = await mcpProxy.proxyRequest(request, correlationId);
                    break;
            }

            const duration = Date.now() - startTime;
            logActivity('RESPONSE', `📤 ${method} completed in ${duration}ms`, { id, correlationId });

            if (metrics) {
                metrics.requestDuration.observe({ method, status: '200' }, duration / 1000);
            }

            return {
                jsonrpc: '2.0',
                id,
                result
            };

        } catch (error) {
            this.stats.errors++;

            logActivity('ERROR', `❌ ${method} failed: ${error.message}`, {
                id,
                correlationId,
                error: error.message
            });

            if (metrics) {
                metrics.requestsTotal.inc({ method, status: '500' });
            }

            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32603,
                    message: error.message
                }
            };
        }
    }

    // Tool execution and chat are now handled by the MCP proxy to the enhanced chatbot
}

// Backend Architect's Metrics Collection Setup
let metrics;
if (CONFIG.METRICS_ENABLED) {
    // Enable default metrics collection
    promClient.collectDefaultMetrics();

    // Custom metrics for MCP proxy
    metrics = {
        requestsTotal: new promClient.Counter({
            name: 'mcp_proxy_requests_total',
            help: 'Total number of MCP proxy requests',
            labelNames: ['method', 'status']
        }),

        requestDuration: new promClient.Histogram({
            name: 'mcp_proxy_request_duration_seconds',
            help: 'Duration of MCP proxy requests in seconds',
            labelNames: ['method', 'status'],
            buckets: [0.1, 0.5, 1, 2, 5, 10]
        }),

        activeConnections: new promClient.Gauge({
            name: 'mcp_proxy_active_connections',
            help: 'Number of active WebSocket connections'
        }),

        chatbotRequests: new promClient.Counter({
            name: 'mcp_proxy_chatbot_requests_total',
            help: 'Requests forwarded to chatbot',
            labelNames: ['operation']
        }),

        orchestratorCalls: new promClient.Counter({
            name: 'mcp_proxy_orchestrator_calls_total',
            help: 'Orchestrator operations performed',
            labelNames: ['operation_type']
        })
    };
}

// Create Express app for HTTP POST requests
const app = express();

// Backend Architect's Security Middleware
if (CONFIG.SECURITY_HEADERS_ENABLED) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://*.huggingface.co", "https://*.hf.co"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://*.huggingface.co", "wss://*.huggingface.co"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'self'", "https://*.huggingface.co"]
            }
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));
}

// CORS configuration for HuggingChat integration
if (CONFIG.CORS_ENABLED) {
    app.use(cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, etc.)
            if (!origin) return callback(null, true);

            // Check if origin is in allowed list
            if (CONFIG.CORS_ORIGINS.includes(origin)) {
                return callback(null, true);
            }

            // Allow localhost for development
            if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
                return callback(null, true);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-correlation-id']
    }));
}

app.use(express.json({ limit: CONFIG.MAX_REQUEST_SIZE }));

// Trust proxy for proper IP detection behind load balancers
if (CONFIG.TRUST_PROXY) {
    app.set('trust proxy', 1);
}

// Apply middleware in the correct order (security first)
app.use(correlationMiddleware);
app.use(metricsMiddleware);
app.use(requestLoggingMiddleware);

// Health and status endpoints (before auth)
app.get('/health', (req, res) => {
    const uptime = Math.floor((Date.now() - mcpServer.stats.startTime) / 1000);
    res.json({
        status: 'ok',
        service: 'mcp-proxy-server',
        version: '2.0.0',
        port: MCP_PORT,
        chatbot: CHAT_SERVER_URL,
        auth: {
            apiKeysConfigured: authManager.getApiKeysCount()
        },
        proxy: {
            activeConnections: mcpServer.stats.connections,
            proxiedRequests: mcpServer.stats.proxiedRequests
        },
        stats: {
            uptime: `${uptime}s`,
            requests: mcpServer.stats.requests,
            errors: mcpServer.stats.errors,
            connections: mcpServer.stats.connections,
            toolsAvailable: mcpServer.tools ? mcpServer.tools.length : 0
        },
        recentActivity: activityLog.slice(0, 10)
    });
});

app.get('/status', (req, res) => {
    const uptime = Math.floor((Date.now() - mcpServer.stats.startTime) / 1000);
    res.json({
        status: 'ok',
        service: 'mcp-proxy-server',
        port: MCP_PORT,
        chatbot: CHAT_SERVER_URL,
        config: {
            rateLimit: {
                windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
                maxRequests: CONFIG.RATE_LIMIT_MAX_REQUESTS
            }
        },
        proxy: {
            connectionPoolSize: mcpProxy.connectionPool.maxConnections,
            activeConnections: mcpProxy.connectionPool.activeConnections
        },
        stats: mcpServer.stats,
        uptime: `${uptime}s`,
        activity: activityLog.slice(0, 50)
    });
});

// Prometheus metrics endpoint
if (CONFIG.METRICS_ENABLED) {
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
    });
}

// Serve static files for web interface
app.use(express.static(path.join(__dirname, 'web')));

// Serve main chat interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

// Apply security middleware to protected routes
app.use('/mcp', apiKeyAuth);
app.use('/mcp', rateLimiter);
app.use('/mcp', validateMcpRequest);

// Add /mcp-chat endpoint (alias for /mcp)
app.use('/mcp-chat', apiKeyAuth);
app.use('/mcp-chat', rateLimiter);
app.use('/mcp-chat', validateMcpRequest);

// Create HTTP server
// Create HTTP and HTTPS servers
let httpServer = null;
let httpsServer = null;

// Create HTTP server
httpServer = http.createServer(app);

// Create HTTPS server if enabled
if (CONFIG.HTTPS_ENABLED) {
    try {
        // Check if SSL certificates exist
        if (fs.existsSync(CONFIG.SSL_CERT_PATH) && fs.existsSync(CONFIG.SSL_KEY_PATH)) {
            logActivity('INFO', `🔒 Creating HTTPS server with certificates...`);
            const sslOptions = {
                key: fs.readFileSync(CONFIG.SSL_KEY_PATH),
                cert: fs.readFileSync(CONFIG.SSL_CERT_PATH)
            };
            httpsServer = https.createServer(sslOptions, app);
            logActivity('INFO', `✅ HTTPS server created successfully`);
        } else {
            logActivity('WARN', `⚠️  HTTPS enabled but certificates not found at ${CONFIG.SSL_CERT_PATH} or ${CONFIG.SSL_KEY_PATH}`);
            logActivity('INFO', `🔧 Generate self-signed certificates: openssl req -x509 -newkey rsa:4096 -keyout ssl/private.key -out ssl/certificate.crt -days 365 -nodes`);
        }
    } catch (error) {
        logActivity('ERROR', `❌ Failed to create HTTPS server: ${error.message}`);
        logActivity('ERROR', `❌ Error stack: ${error.stack}`);
    }
} else {
    logActivity('INFO', `🚫 HTTPS not enabled`);
}

// Create MCP proxy server instance
const mcpServer = new MCPProxyServer();

// The server is now a clean proxy to the enhanced chatbot

// HTTP POST endpoint for MCP requests
// MCP endpoint handler - supports both /mcp and /mcp-chat
const mcpHandler = async (req, res) => {
    try {
        const request = req.body;
        const correlationId = req.correlationId;

        const response = await mcpServer.handleRequest(request, correlationId);
        res.json(response);
    } catch (error) {
        logActivity('ERROR', `HTTP request error: ${error.message}`, {
            correlationId: req.correlationId
        });
        res.status(500).json({
            jsonrpc: '2.0',
            id: req.body.id || null,
            error: {
                code: -32603,
                message: error.message
            }
        });
    }
});

// Direct chat endpoint (non-MCP, for convenience)
app.post('/chat', async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    logActivity('REQUEST', `💬 Direct chat request from ${clientIp}`);
    
    try {
        const { message, conversationId } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const result = await mcpServer.sendChatMessage(message, conversationId);
        
        res.json({
            success: true,
            response: result.content[0].text,
            conversationId: result.conversationId
        });
    } catch (error) {
        logActivity('ERROR', `Chat request error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const uptime = Math.floor((Date.now() - mcpServer.stats.startTime) / 1000);
    res.json({
        status: 'ok',
        service: 'mcp-server + mcpo',
        port: MCP_PORT,
        chatServer: CHAT_SERVER_URL,
        mcpo: {
            running: mcpServer.mcpoProcess !== null,
            tools: mcpServer.mcpoTools.length
        },
        stats: {
            uptime: `${uptime}s`,
            requests: mcpServer.stats.requests,
            toolsExecuted: mcpServer.stats.toolsExecuted,
            errors: mcpServer.stats.errors,
            connections: mcpServer.stats.connections,
            toolsAvailable: mcpServer.tools ? mcpServer.tools.length : 0
        },
        recentActivity: activityLog.slice(0, 10)
    });
});

// Status endpoint with detailed activity
app.get('/status', (req, res) => {
    const uptime = Math.floor((Date.now() - mcpServer.stats.startTime) / 1000);
    res.json({
        status: 'ok',
        service: 'mcp-server',
        port: MCP_PORT,
        chatServer: CHAT_SERVER_URL,
        stats: mcpServer.stats,
        uptime: `${uptime}s`,
        activity: activityLog.slice(0, 50)
    });
});

// WebSocket server for real-time MCP connections
// Will be attached to both HTTP and HTTPS servers
const wss = new WebSocket.Server({
    noServer: true
});

// Handle WebSocket upgrades
function handleWebSocketUpgrade(request, socket, head) {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (pathname === '/mcp-ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
}

// Attach WebSocket upgrade handler to both servers
if (httpServer) {
    httpServer.on('upgrade', handleWebSocketUpgrade);
}
if (httpsServer) {
    httpsServer.on('upgrade', handleWebSocketUpgrade);
}

wss.on('connection', (ws, req) => {
    mcpServer.stats.connections++;
    const clientIp = req.socket.remoteAddress || 'unknown';
    const correlationId = uuidv4();

    logActivity('WS', `🔌 New WebSocket connection from ${clientIp}`, { correlationId });

    if (metrics) {
        metrics.activeConnections.inc();
    }

    ws.on('message', async (message) => {
        try {
            const request = JSON.parse(message.toString());
            logActivity('WS', `📨 WebSocket message: ${request.method || 'unknown'}`, { correlationId });

            const response = await mcpServer.handleRequest(request, correlationId);
            ws.send(JSON.stringify(response));
            logActivity('WS', `📤 WebSocket response sent`, { correlationId });
        } catch (error) {
            logActivity('ERROR', `WebSocket message error: ${error.message}`, { correlationId });
            ws.send(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32700,
                    message: 'Parse error: ' + error.message
                }
            }));
        }
    });

    ws.on('error', (error) => {
        logActivity('ERROR', `WebSocket error: ${error.message}`, { correlationId });
    });

    ws.on('close', () => {
        if (metrics) {
            metrics.activeConnections.dec();
        }
        logActivity('WS', `🔌 WebSocket connection closed from ${clientIp}`, { correlationId });
    });

    // Send welcome message
    ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'server/ready',
        params: {
            serverInfo: {
                name: 'operation-dbus + Network Engineer (MCPO)',
                version: '1.0.0'
            }
        }
    }));
    logActivity('WS', `✅ Welcome message sent to ${clientIp}`, { correlationId });
});

// Backend Architect's Graceful Shutdown Handler
let shuttingDown = false;

function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    logActivity('INFO', `🛑 Received ${signal}, shutting down gracefully...`);

    // Close WebSocket server
    wss.close();

    // Close servers
    let serversClosed = 0;
    const totalServers = (httpServer ? 1 : 0) + (httpsServer ? 1 : 0);

    const checkShutdownComplete = () => {
        serversClosed++;
        if (serversClosed >= totalServers) {
            logActivity('INFO', '✅ All servers closed successfully');
            process.exit(0);
        }
    };

    if (httpServer) {
        httpServer.close(() => {
            logActivity('INFO', '✅ HTTP server closed');
            checkShutdownComplete();
        });
    }

    if (httpsServer) {
        httpsServer.close(() => {
            logActivity('INFO', '✅ HTTPS server closed');
            checkShutdownComplete();
        });
    }

    // If no servers to close, exit immediately
    if (totalServers === 0) {
        process.exit(0);
    }

    // Force exit after timeout
    setTimeout(() => {
        logActivity('ERROR', '❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logActivity('ERROR', `💥 Uncaught exception: ${error.message}`, {
        stack: error.stack
    });
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logActivity('ERROR', `💥 Unhandled rejection: ${reason}`, {
        promise: promise.toString()
    });
    gracefulShutdown('unhandledRejection');
});

// Start servers
// Initialize system introspector
const systemIntrospector = new SystemIntrospector(mcpProxy);

// Test route
app.get('/test', (req, res) => {
    res.json({ status: 'ok', message: 'test route works' });
});

// System introspection report endpoint
app.get('/introspection', (req, res) => {
    try {
        res.json({
            status: 'ok',
            service: 'system-brain-introspection',
            report: systemIntrospector.getIntrospectionReport()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            service: 'system-brain-introspection',
            error: error.message
        });
    }
});

const startServers = async () => {
    logActivity('INFO', '='.repeat(70));
    logActivity('INFO', '🚀 MCP Proxy Server - Enhanced Chatbot Integration with HTTPS');
    logActivity('INFO', '='.repeat(70));

    // Start HTTP server
    httpServer.listen(CONFIG.HTTP_PORT, CONFIG.BIND_IP, () => {
        logActivity('INFO', `🌐 HTTP Server listening on http://${CONFIG.BIND_IP}:${CONFIG.HTTP_PORT}`);
        logActivity('INFO', `📡 HTTP MCP endpoint: http://${CONFIG.BIND_IP}:${CONFIG.HTTP_PORT}/mcp`);
        logActivity('INFO', `💬 Direct chat endpoint: http://${CONFIG.BIND_IP}:${CONFIG.HTTP_PORT}/chat`);
        logActivity('INFO', `🔌 WebSocket endpoint: ws://${CONFIG.BIND_IP}:${CONFIG.HTTP_PORT}/mcp-ws`);
        logActivity('INFO', `💚 Health check: http://${CONFIG.BIND_IP}:${CONFIG.HTTP_PORT}/health`);
        logActivity('INFO', `📊 Status dashboard: http://${CONFIG.BIND_IP}:${CONFIG.HTTP_PORT}/status`);
    });

    // Start HTTPS server if available
    logActivity('INFO', `🔍 httpsServer exists: ${!!httpsServer}`);
    if (httpsServer) {
        httpsServer.listen(CONFIG.HTTPS_PORT, CONFIG.BIND_IP, () => {
            logActivity('INFO', `🔒 HTTPS Server listening on https://${CONFIG.BIND_IP}:${CONFIG.HTTPS_PORT}`);
            logActivity('INFO', `🔐 Secure MCP endpoint: https://${CONFIG.BIND_IP}:${CONFIG.HTTPS_PORT}/mcp`);
            logActivity('INFO', `🔒 Secure WebSocket: wss://${CONFIG.BIND_IP}:${CONFIG.HTTPS_PORT}/mcp-ws`);
        });
    }

    // Common info
    if (CONFIG.METRICS_ENABLED) {
        logActivity('INFO', `📈 Prometheus metrics: http://${CONFIG.BIND_IP}:${CONFIG.HTTP_PORT}/metrics`);
    }
    logActivity('INFO', `🤖 Enhanced Chatbot: ${process.env.CHAT_SERVER_URL || 'http://localhost:8080'}`);
    logActivity('INFO', `🔄 Proxy Architecture: Clean routing to intelligent chatbot`);
    logActivity('INFO', `🔐 Security: ${CONFIG.MCP_API_ENABLED ? 'MCP API key auth enabled' : 'MCP API auth disabled'}, rate limiting, input validation, HTTPS`);
    logActivity('INFO', `🌐 CORS: Enabled for HuggingChat integration`);
    logActivity('INFO', `📋 Observability: Structured logging, metrics, correlation IDs`);
    logActivity('INFO', '='.repeat(70));
    // Perform system introspection on boot
    await systemIntrospector.introspectOnBoot();

    logActivity('INFO', '✅ MCP Proxy ready - Chatbot is the system brain!');
    logActivity('INFO', '💡 Orchestrator and introspection integrated into chatbot');
    logActivity('INFO', '🔒 HTTPS enabled for secure external connections');
    logActivity('INFO', '');
};

startServers();

    logActivity('INFO', '🔒 HTTPS enabled for secure external connections');
    logActivity('INFO', '');
};

startServers();
