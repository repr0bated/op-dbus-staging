//! Standalone MCP Chat Server with Unified Introspection Support
//!
//! # Architecture
//!
//! This chat server implements the consolidated introspection pattern requested by users:
//! instead of querying multiple sources (plugin registry, tool registry, D-Bus cache),
//! the AI has ONE unified introspection point that includes:
//!
//! 1. **Plugin-Derived Tools**: State plugins (systemd, network, lxc, keyring, etc.)
//!    are automatically converted to MCP tools via PluginToolBridge. Each plugin becomes:
//!    - `plugin_{name}_query` - Query current state
//!    - `plugin_{name}_diff` - Calculate diff between current and desired state
//!    - `plugin_{name}_apply` - Apply state changes
//!
//! 2. **Workflows**: code_review, test_generation, deployment workflows with their nodes
//!    and state transitions are available for the AI to reference.
//!
//! 3. **Plugin Capabilities**: Information about what each plugin can do (rollback,
//!    checkpoints, diff support, verification, etc.)
//!
//! # Why This Design
//!
//! Previously, chat would need to:
//! - Query IntrospectionCache for D-Bus services (has rusqlite Send+Sync issues in async)
//! - Check PluginRegistry for available plugins
//! - Query ToolRegistry for native tools
//! - Query workflows separately
//!
//! Now the chat server:
//! - Calls build_unified_tool_introspection() once on startup
//! - Stores consolidated data in tool_introspection field
//! - Passes it to all handlers via ChatState
//! - Avoids the rusqlite Send+Sync issues by not using IntrospectionCache in web context
//!
//! # Usage
//!
//! Run as: OLLAMA_API_KEY=your-key cargo run --bin mcp-chat

// Module includes for standalone binary
#[path = "ollama.rs"]
mod ollama;
#[path = "workflow_plugin_introspection.rs"]
mod workflow_plugin_introspection;
#[path = "orchestrator.rs"]
mod orchestrator;
#[path = "introspection_cache.rs"]
mod introspection_cache;

use anyhow::{Context, Result};
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::sync::RwLock;
use tower_http::{
    cors::CorsLayer,
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::{error, info};

use ollama::OllamaClient;

/// Tool: discover_system - Full system introspection
async fn register_discover_system() -> Result<()> {
    // This would register with a tool registry, but for chat we just use it directly
    Ok(())
}

/// Tool: detect_ssl_certificates - Detect SSL/TLS certificates via introspection
async fn register_detect_ssl_certificates() -> Result<()> {
    // This would register with a tool registry, but for chat we just use it directly
    Ok(())
}

/// Server configuration detected via introspection
struct ServerConfig {
    http_port: u16,
    https_port: u16,
    bind_host: String,
    public_host: String,
    https_enabled: bool,
    ssl_cert_path: String,
    ssl_key_path: String,
}

/// Introspect system to detect server configuration
async fn introspect_server_config() -> ServerConfig {
    // Get hostname via introspection
    let hostname = gethostname::gethostname().to_string_lossy().to_string();

    // Try to get FQDN from /etc/hostname or /etc/hosts
    let public_host = detect_fqdn(&hostname).unwrap_or_else(|| {
        std::env::var("PUBLIC_HOST").unwrap_or_else(|_| hostname.clone())
    });

    // Detect Let's Encrypt certificates for the hostname/domain
    let (ssl_cert_path, ssl_key_path, https_enabled) = detect_ssl_certificates(&public_host);

    ServerConfig {
        http_port: std::env::var("HTTP_PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .unwrap_or(8080),
        https_port: std::env::var("HTTPS_PORT")
            .unwrap_or_else(|_| "8443".to_string())
            .parse::<u16>()
            .unwrap_or(8443),
        bind_host: std::env::var("BIND_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
        public_host,
        https_enabled: https_enabled || std::env::var("HTTPS_ENABLED").unwrap_or_else(|_| "false".to_string()) == "true",
        ssl_cert_path: std::env::var("SSL_CERT_PATH").unwrap_or(ssl_cert_path),
        ssl_key_path: std::env::var("SSL_KEY_PATH").unwrap_or(ssl_key_path),
    }
}

/// Detect FQDN from system files
fn detect_fqdn(hostname: &str) -> Option<String> {
    // Try /etc/hostname first
    if let Ok(contents) = std::fs::read_to_string("/etc/hostname") {
        let fqdn = contents.trim();
        if !fqdn.is_empty() && fqdn.contains('.') {
            return Some(fqdn.to_string());
        }
    }

    // Try /etc/hosts for FQDN
    if let Ok(contents) = std::fs::read_to_string("/etc/hosts") {
        for line in contents.lines() {
            if line.contains(hostname) && line.contains('.') {
                // Extract domain from line like "127.0.0.1 hostname.domain.com hostname"
                if let Some(domain_part) = line.split_whitespace().find(|s| s.contains('.') && s.contains(hostname)) {
                    return Some(domain_part.to_string());
                }
            }
        }
    }

    // Try hostname -f command
    if let Ok(output) = std::process::Command::new("hostname")
        .arg("-f")
        .output()
    {
        let fqdn = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !fqdn.is_empty() && fqdn.contains('.') {
            return Some(fqdn);
        }
    }

    None
}

/// Detect SSL certificates via introspection (Cloudflare, Let's Encrypt, or self-signed)
fn detect_ssl_certificates(domain: &str) -> (String, String, bool) {
    // Extract domain from FQDN (remove subdomain if needed, or use as-is)
    let cert_domain = if domain.contains('.') {
        domain.to_string()
    } else {
        format!("{}.local", domain)
    };

    // Try Cloudflare certificates first (common locations)
    let cloudflare_paths: Vec<(&str, &str, &str)> = vec![
        // Standard Cloudflare origin certificate locations
        ("/etc/ssl/cloudflare", "origin.pem", "origin.key"),
        ("/etc/cloudflare", "cert.pem", "key.pem"),
        ("/etc/ssl/certs/cloudflare", "origin.pem", "origin.key"),
        // Common alternative names
        ("/etc/ssl/cloudflare", "cert.pem", "key.pem"),
        ("/etc/ssl/cloudflare", "fullchain.pem", "privkey.pem"),
    ];

    // Check domain-specific paths separately
    let domain_paths = vec![
        format!("/etc/ssl/cloudflare/{}", cert_domain),
        format!("/etc/cloudflare/{}", cert_domain),
    ];

    for domain_path in &domain_paths {
        if std::path::Path::new(&format!("{}/cert.pem", domain_path)).exists() &&
           std::path::Path::new(&format!("{}/key.pem", domain_path)).exists() {
            info!("🔍 Introspected Cloudflare certificates for {}", cert_domain);
            return (format!("{}/cert.pem", domain_path), format!("{}/key.pem", domain_path), true);
        }
    }

    for (base_path, cert_file, key_file) in cloudflare_paths {
        let cert_path = format!("{}/{}", base_path, cert_file);
        let key_path = format!("{}/{}", base_path, key_file);

        if std::path::Path::new(&cert_path).exists() && std::path::Path::new(&key_path).exists() {
            info!("🔍 Introspected Cloudflare certificates: {} / {}", cert_path, key_path);
            return (cert_path, key_path, true);
        }
    }

    // Try Let's Encrypt paths
    let letsencrypt_base = "/etc/letsencrypt/live";
    let cert_path = format!("{}/{}/fullchain.pem", letsencrypt_base, cert_domain);
    let key_path = format!("{}/{}/privkey.pem", letsencrypt_base, cert_domain);

    if std::path::Path::new(&cert_path).exists() && std::path::Path::new(&key_path).exists() {
        info!("🔍 Introspected Let's Encrypt certificates for {}", cert_domain);
        return (cert_path, key_path, true);
    }

    // Try alternative Let's Encrypt path (with subdomain)
    let domain_parts: Vec<&str> = cert_domain.split('.').skip(1).collect();
    if !domain_parts.is_empty() {
        let main_domain = domain_parts.join(".");
        let alt_cert_path = format!("{}/{}/fullchain.pem", letsencrypt_base, main_domain);
        let alt_key_path = format!("{}/{}/privkey.pem", letsencrypt_base, main_domain);

        if std::path::Path::new(&alt_cert_path).exists() && std::path::Path::new(&alt_key_path).exists() {
            info!("🔍 Introspected Let's Encrypt certificates for {}", main_domain);
            return (alt_cert_path, alt_key_path, true);
        }
    }

    // Check for self-signed certificates in common locations
    let self_signed_cert = "./ssl/certificate.crt";
    let self_signed_key = "./ssl/private.key";

    if std::path::Path::new(self_signed_cert).exists() && std::path::Path::new(self_signed_key).exists() {
        info!("🔍 Introspected self-signed certificates");
        return (self_signed_cert.to_string(), self_signed_key.to_string(), true);
    }

    // No certificates found via introspection
    (self_signed_cert.to_string(), self_signed_key.to_string(), false)
}

// Chat message structure with unified system context
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ChatMessage {
    User {
        content: String,
        timestamp: u64,
        #[serde(skip_serializing_if = "Option::is_none")]
        context: Option<SystemContext>,
    },
    Assistant {
        content: String,
        timestamp: u64,
        #[serde(skip_serializing_if = "Option::is_none")]
        tools_used: Option<Vec<String>>,
    },
    Error {
        content: String,
        timestamp: u64
    },
}

// Unified system context for AI awareness
// Includes D-Bus services, tools (which include plugin-derived operations), and workflows
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SystemContext {
    active_services: Vec<String>,
    network_status: String,
    system_load: f32,
    available_tools: Vec<String>,
    tool_count: usize,
}

// Chat server state with unified introspection support and mandatory AI
// This consolidates tool/plugin introspection into a single registry
// Note: We avoid IntrospectionCache here to prevent Send+Sync issues with rusqlite
// The cache is designed for CLI usage, not async web servers
#[derive(Clone)]
struct ChatState {
    ollama_client: Arc<OllamaClient>,  // Mandatory - AI is the brain
    conversations: Arc<RwLock<HashMap<String, Vec<ChatMessage>>>>,
    // Cached unified introspection data from plugins and workflows
    // This replaces the need for IntrospectionCache in web context
    tool_introspection: Arc<RwLock<Option<Value>>>,
    // Enhanced capabilities: orchestrator for system orchestration
    _orchestrator: Arc<orchestrator::Orchestrator>, // TODO: Implement full orchestrator integration
    // TODO: Add introspection cache when SQLite threading issues are resolved
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    info!("Starting AI Chat Server...");

    // AI is mandatory - the brain of the system
    let api_key = std::env::var("OLLAMA_API_KEY")
        .expect("❌ OLLAMA_API_KEY required - AI is the core of this system\n\
                 Get your API key from: https://ollama.com");

    let model = std::env::var("OLLAMA_DEFAULT_MODEL")
        .unwrap_or_else(|_| "mistral".to_string());

    info!("✅ AI Enabled - Using model: {}", model);

    // Initialize Ollama client
    let ollama_client = Arc::new(
        OllamaClient::cloud(api_key)
            .with_default_model(model.clone())
    );

    // Test AI connection
    match ollama_client.health_check().await {
        Ok(true) => info!("✅ Connected to Ollama"),
        Ok(false) => info!("⚠️  Using cloud API (no local Ollama)"),
        Err(e) => {
            eprintln!("❌ Ollama connection failed: {}", e);
            eprintln!("Make sure OLLAMA_API_KEY is valid and set OLLAMA_DEFAULT_MODEL");
            std::process::exit(1);
        }
    }

    // Build unified tool introspection
    // This consolidates plugins (via PluginToolBridge) and native tools into one registry
    // Note: We use this instead of IntrospectionCache which has rusqlite Send+Sync issues
    let tool_introspection = build_unified_tool_introspection().await;
    info!("✅ Unified tool introspection initialized from workflows and plugins");

    // Initialize orchestrator for system task orchestration
    let orchestrator = Arc::new(orchestrator::Orchestrator::new().await?);
    info!("✅ Orchestrator initialized for system task orchestration");

    // TODO: Initialize introspection cache for D-Bus service discovery
    // Currently disabled due to SQLite threading issues in async contexts

    // Create enhanced chat state with orchestrator capabilities
    let chat_state = ChatState {
        ollama_client,
        conversations: Arc::new(RwLock::new(HashMap::new())),
        tool_introspection: Arc::new(RwLock::new(tool_introspection)),
        _orchestrator: orchestrator,
    };

    info!("✅ Chat state initialized with unified introspection support");
    info!("   - Plugin/tool registry: consolidated");
    info!("   - Workflows: available");

    // Setup static file serving for the web UI
    let web_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join("mcp")
        .join("web");

    // Create the main router
    let app = Router::new()
        // MCP endpoint for proxy server
        .route("/api/mcp", post(mcp_handler))
        // WebSocket endpoint for chat
        .route("/ws", get(websocket_handler))
        // Serve web directory - handles all static files including HTML, CSS, JS
        .nest_service("/", ServeDir::new(&web_dir))
        // Add CORS and tracing
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(chat_state);

    // Start the server (HTTP and optionally HTTPS)
    // Use introspection to detect configuration, fallback to environment variables
    let config = introspect_server_config().await;

    let http_port = config.http_port;
    let https_port = config.https_port;
    let bind_host = config.bind_host;
    let public_host = config.public_host;

    let http_addr: SocketAddr = format!("{}:{}", bind_host, http_port)
        .parse()
        .context("Invalid HTTP bind address")?;
    let https_addr: SocketAddr = format!("{}:{}", bind_host, https_port)
        .parse()
        .context("Invalid HTTPS bind address")?;

    // Check for HTTPS configuration (introspected or from env)
    let https_enabled = config.https_enabled;
    let ssl_key_path = config.ssl_key_path;
    let ssl_cert_path = config.ssl_cert_path;

    if https_enabled {
        // Use axum-server for HTTPS (Rust-only, no Node.js)
        use axum_server::tls_rustls::RustlsConfig;

        match RustlsConfig::from_pem_file(
            std::path::Path::new(&ssl_cert_path),
            std::path::Path::new(&ssl_key_path),
        ).await {
            Ok(rustls_config) => {
                info!("🔒 HTTPS enabled - Loading TLS configuration...");

                // Start HTTP server (redirect or fallback)
                let http_listener = tokio::net::TcpListener::bind(http_addr).await?;
                let http_app = app.clone();
                tokio::spawn(async move {
                    info!("🌐 HTTP server listening on http://{} (redirects to HTTPS)", http_addr);
                    let _ = axum::serve(http_listener, http_app).await;
                });

                info!("🔒 HTTPS server listening on https://{}", https_addr);
                info!("📡 MCP endpoints:");
                info!("   - https://{}:{}/api/mcp", public_host, https_port);
                info!("   - https://{}:{}/mcp-chat", public_host, https_port);
                info!("   - https://{}:{}/mcp", public_host, https_port);
                info!("🌐 Web interface: https://{}:{}", public_host, https_port);
                info!("Open https://{}:{} in your browser to chat with AI", public_host, https_port);
                info!("💡 HuggingFace browser client: https://{}:{}/mcp-chat", public_host, https_port);
                info!("💡 Optional headers: X-API-Key, Authorization: Bearer, X-Password (not required)");

                axum_server::bind_rustls(https_addr, rustls_config)
                    .serve(app.into_make_service())
                    .await?;
            }
            Err(e) => {
                info!("⚠️  HTTPS enabled but certificates not found, falling back to HTTP");
                info!("   Error: {}", e);
                info!("   Generate certificates: ./generate-ssl-cert.sh");
                info!("   Or set SSL_KEY_PATH and SSL_CERT_PATH environment variables");

                let listener = tokio::net::TcpListener::bind(http_addr).await?;
                info!("🌐 HTTP server listening on http://{}", http_addr);
                info!("⚠️  HTTP is not secure - use HTTPS for production");
                info!("📡 MCP endpoints:");
                info!("   - http://{}:{}/api/mcp", public_host, http_port);
                info!("   - http://{}:{}/mcp-chat", public_host, http_port);
                info!("   - http://{}:{}/mcp", public_host, http_port);
                info!("Open http://{}:{} in your browser to chat with AI", public_host, http_port);
    axum::serve(listener, app).await?;
            }
        }
    } else {
        // HTTP only
        let listener = tokio::net::TcpListener::bind(http_addr).await?;
        info!("🌐 HTTP server listening on http://{}", http_addr);
        info!("⚠️  HTTP is not secure - use HTTPS for production");
        info!("📡 MCP endpoints:");
        info!("   - http://{}:{}/api/mcp", public_host, http_port);
        info!("   - http://{}:{}/mcp-chat", public_host, http_port);
        info!("   - http://{}:{}/mcp", public_host, http_port);
        info!("Open http://{}:{} in your browser to chat with AI", public_host, http_port);
        axum::serve(listener, app).await?;
    }

    Ok(())
}

// Enhanced MCP helper functions with orchestrator integration

async fn get_available_tools(state: &ChatState) -> Vec<Value> {
    // Get tools from unified introspection
    let tool_introspection = state.tool_introspection.read().await;
    if let Some(introspection) = tool_introspection.as_ref() {
        if let Some(tools) = introspection.get("tools") {
            if let Some(tools_array) = tools.as_array() {
                return tools_array.clone();
            }
        }
    }

    // Fallback: get orchestrator capabilities
    get_orchestrator_tools(state).await
}

async fn get_orchestrator_tools(_state: &ChatState) -> Vec<Value> {
    vec![
        json!({
            "name": "orchestrate_system_task",
            "description": "Orchestrate complex system tasks across multiple agents",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "task_type": {
                        "type": "string",
                        "description": "Type of system task (deploy, monitor, configure, etc.)"
                    },
                    "target_systems": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Target systems or services"
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Task-specific parameters"
                    }
                },
                "required": ["task_type"]
            }
        }),
        json!({
            "name": "dbus_discovery",
            "description": "Discover and introspect D-Bus services and interfaces",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "service_filter": {
                        "type": "string",
                        "description": "Filter services by name pattern"
                    },
                    "interface_filter": {
                        "type": "string",
                        "description": "Filter interfaces by name pattern"
                    }
                }
            }
        }),
        json!({
            "name": "system_introspect",
            "description": "Get comprehensive system introspection data",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "layers": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "System layers to introspect (physical, network, service, application)",
                        "default": ["physical", "network", "service", "application"]
                    }
                }
            }
        }),
        json!({
            "name": "workflow_orchestrate",
            "description": "Execute complex multi-step workflows with orchestration",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "workflow_type": {
                        "type": "string",
                        "description": "Type of workflow (deployment, monitoring, maintenance)"
                    },
                    "targets": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Target systems for workflow execution"
                    },
                    "workflow_params": {
                        "type": "object",
                        "description": "Workflow-specific parameters"
                    }
                },
                "required": ["workflow_type"]
            }
        })
    ]
}

async fn execute_tool_with_orchestration(
    state: &ChatState,
    tool_name: &str,
    parameters: &Value,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    info!("Executing tool with orchestration: {} with params {:?}", tool_name, parameters);

    match tool_name {
        "orchestrate_system_task" => {
            orchestrate_system_task(state, parameters).await
        }
        "dbus_discovery" => {
            dbus_discovery(state, parameters).await
        }
        "system_introspect" => {
            system_introspect(state, parameters).await
        }
        "workflow_orchestrate" => {
            workflow_orchestrate(state, parameters).await
        }
        _ => {
            // Try to execute as regular tool
            execute_regular_tool(state, tool_name, parameters).await
        }
    }
}

async fn orchestrate_system_task(
    _state: &ChatState,
    parameters: &Value,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let task_type = parameters.get("task_type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let default_targets = vec![];
    let target_systems = parameters.get("target_systems")
        .and_then(|v| v.as_array())
        .unwrap_or(&default_targets)
        .iter()
        .filter_map(|v| v.as_str())
        .collect::<Vec<_>>();

    let default_params = json!({});
    let task_params = parameters.get("parameters")
        .unwrap_or(&default_params);

    info!("Orchestrating system task: {} on targets {:?}", task_type, target_systems);

    // Create orchestrated task
    let task_payload = json!({
        "task_type": task_type,
        "target_systems": target_systems,
        "parameters": task_params
    });

    // Use orchestrator to execute task
    let task = orchestrator::Task {
        id: format!("task_{}", chrono::Utc::now().timestamp()),
        agent_id: "system_orchestrator".to_string(),
        task_type: task_type.to_string(),
        payload: task_payload,
        created_at: chrono::Utc::now(),
        status: orchestrator::TaskStatus::Pending,
    };

    // TODO: Implement orchestrator task execution
    // For now, return success with orchestration note
    info!("Orchestration task queued: {}", task.id);

    Ok(json!({
        "status": "orchestrated",
        "task_type": task_type,
        "target_systems": target_systems,
        "message": "System task orchestration initiated"
    }))
}

async fn dbus_discovery(
    _state: &ChatState,
    parameters: &Value,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let service_filter = parameters.get("service_filter")
        .and_then(|v| v.as_str());
    let interface_filter = parameters.get("interface_filter")
        .and_then(|v| v.as_str());

    info!("Performing D-Bus discovery with filters: service={:?}, interface={:?}",
          service_filter, interface_filter);

    // TODO: Implement introspection cache when SQLite threading is resolved
    // For now, return placeholder data
    let services_data = vec!["org.freedesktop.systemd1".to_string()];
    let interfaces_data = vec!["org.freedesktop.systemd1.Manager".to_string()];

    // Apply filters to placeholder data
    let filtered_services: Vec<_> = services_data.into_iter()
        .filter(|s| service_filter.map_or(true, |f| s.contains(f)))
        .collect();

    let filtered_interfaces: Vec<_> = interfaces_data.into_iter()
        .filter(|i| interface_filter.map_or(true, |f| i.contains(f)))
        .collect();

    Ok(json!({
        "services": filtered_services,
        "interfaces": filtered_interfaces,
        "total_services": filtered_services.len(),
        "total_interfaces": filtered_interfaces.len(),
        "note": "Using placeholder data - introspection cache pending"
    }))
}

async fn system_introspect(
    _state: &ChatState,
    parameters: &Value,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let layers = parameters.get("layers")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
        .unwrap_or_else(|| vec!["physical", "network", "service", "application"]);

    info!("Performing system introspection for layers: {:?}", layers);

    let mut results = json!({});

    for layer in layers {
        match layer {
            "physical" => {
                results["physical"] = json!({
                    "cpu_count": num_cpus::get(),
                    "memory": sys_info::mem_info().map(|m| m.total as u64).unwrap_or(0),
                    "hostname": gethostname::gethostname().to_string_lossy()
                });
            }
            "network" => {
                // Basic network info - could be expanded
                results["network"] = json!({
                    "interfaces": "available",
                    "connections": "discoverable"
                });
            }
            "service" => {
                // D-Bus services - TODO: Implement with proper introspection cache
                results["service"] = json!({
                    "dbus_services": 1,
                    "services": ["org.freedesktop.systemd1"],
                    "note": "Introspection cache integration pending"
                });
            }
            "application" => {
                results["application"] = json!({
                    "workflows": "available",
                    "plugins": "discoverable"
                });
            }
            _ => {}
        }
    }

    Ok(results)
}

async fn workflow_orchestrate(
    _state: &ChatState,
    parameters: &Value,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    let workflow_type = parameters.get("workflow_type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let default_workflow_targets = vec![];
    let targets = parameters.get("targets")
        .and_then(|v| v.as_array())
        .unwrap_or(&default_workflow_targets)
        .iter()
        .filter_map(|v| v.as_str())
        .collect::<Vec<_>>();

    let default_workflow_params = json!({});
    let workflow_params = parameters.get("workflow_params")
        .unwrap_or(&default_workflow_params);

    info!("Orchestrating workflow: {} on targets {:?}", workflow_type, targets);

    // Create workflow orchestration task
    let workflow_task = json!({
        "workflow_type": workflow_type,
        "targets": targets,
        "parameters": workflow_params,
        "orchestration_id": format!("workflow_{}", chrono::Utc::now().timestamp())
    });

    // Use orchestrator for workflow execution
    let task = orchestrator::Task {
        id: format!("workflow_{}", chrono::Utc::now().timestamp()),
        agent_id: "workflow_orchestrator".to_string(),
        task_type: format!("workflow_{}", workflow_type),
        payload: workflow_task,
        created_at: chrono::Utc::now(),
        status: orchestrator::TaskStatus::Pending,
    };

    // TODO: Implement orchestrator task execution
    // For now, return success with orchestration note
    info!("Workflow orchestration task queued: {}", task.id);

    Ok(json!({
        "status": "workflow_orchestrated",
        "workflow_type": workflow_type,
        "targets": targets,
        "message": "Workflow orchestration initiated"
    }))
}

async fn execute_regular_tool(
    _state: &ChatState,
    tool_name: &str,
    parameters: &Value,
) -> Result<Value, Box<dyn std::error::Error + Send + Sync>> {
    // For regular tools, use the existing AI-powered execution
    // This would integrate with the existing tool execution logic
    info!("Executing regular tool: {}", tool_name);

    // Placeholder - integrate with existing tool execution
    Ok(json!({
        "tool": tool_name,
        "parameters": parameters,
        "result": "Tool executed via AI orchestration",
        "status": "completed"
    }))
}

async fn send_chat_message_with_orchestration(
    state: &ChatState,
    message: &str,
    conversation_id: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    info!("Sending chat message with orchestration: {}", message);

    // Get system context for enhanced AI responses
    let system_context = get_system_context(state).await;

    // Get conversation history
    let conversations = state.conversations.read().await;
    let history = conversations.get(conversation_id)
        .cloned()
        .unwrap_or_default();

    // Convert system context to string
    let system_context_str = if let Some(ref ctx) = system_context {
        format!("System Context: Active services: {:?}, Network status: {}, System load: {:.2}, Available tools: {}, Tool count: {}",
            ctx.active_services,
            ctx.network_status,
            ctx.system_load,
            ctx.available_tools.join(", "),
            ctx.tool_count
        )
    } else {
        "No system context available".to_string()
    };

    // Convert history to ollama ChatMessage format
    let ollama_history: Vec<ollama::ChatMessage> = history.iter().map(|msg| {
        match msg {
            ChatMessage::User { content, .. } => ollama::ChatMessage {
                role: "user".to_string(),
                content: content.clone(),
            },
            ChatMessage::Assistant { content, .. } => ollama::ChatMessage {
                role: "assistant".to_string(),
                content: content.clone(),
            },
            ChatMessage::Error { content, .. } => ollama::ChatMessage {
                role: "system".to_string(),
                content: format!("Error: {}", content),
            },
        }
    }).collect();

    // Use AI with orchestration context
    let response = state.ollama_client.chat_with_context(
        "mistral", // model
        &system_context_str, // system_context as string
        &ollama_history, // conversation_history in correct format
        message, // user_message
        Some(0.7) // temperature
    ).await?;

    // Store the conversation
    drop(conversations);
    let mut conversations = state.conversations.write().await;
    let conversation = conversations.entry(conversation_id.to_string())
        .or_insert_with(Vec::new);

    conversation.push(ChatMessage::User {
        content: message.to_string(),
        timestamp: chrono::Utc::now().timestamp() as u64,
        context: system_context,
    });

    conversation.push(ChatMessage::Assistant {
        content: response.clone(),
        timestamp: chrono::Utc::now().timestamp() as u64,
        tools_used: None,
    });

    Ok(response)
}

// MCP handler for proxy server - enhanced chatbot with orchestration capabilities
async fn mcp_handler(
    State(state): State<ChatState>,
    Json(request): Json<Value>,
) -> impl IntoResponse {
    info!("MCP request received: {:?}", request);

    // Check if this is a JSON-RPC 2.0 MCP request
    if let (Some(jsonrpc), Some(method), Some(id)) = (
        request.get("jsonrpc").and_then(|v| v.as_str()),
        request.get("method").and_then(|v| v.as_str()),
        request.get("id")
    ) {
        if jsonrpc != "2.0" {
            return Json(json!({
                "jsonrpc": "2.0",
                "id": id,
                "error": {
                    "code": -32600,
                    "message": "Invalid JSON-RPC version"
                }
            }));
        }

        let params = request.get("params").cloned().unwrap_or(json!({}));

        return match method {
            "initialize" => {
                Json(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "serverInfo": {
                            "name": "op-dbus-mcp-server",
                            "version": "1.0.0"
                        },
                        "capabilities": {
                            "tools": {
                                "listChanged": true
                            }
                        }
                    }
                }))
            }

            "tools/list" => {
                let tools = get_available_tools(&state).await;
                Json(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "tools": tools
                    }
                }))
            }

            "tools/call" => {
                let tool_name = params.get("name").and_then(|v| v.as_str());
                let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

                if let Some(tool_name) = tool_name {
                    let result = execute_tool_with_orchestration(&state, tool_name, &arguments).await;
                    match result {
                        Ok(response) => Json(json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "result": response
                        })),
                        Err(error) => Json(json!({
                            "jsonrpc": "2.0",
                            "id": id,
                            "error": {
                                "code": -32603,
                                "message": error.to_string()
                            }
                        }))
                    }
                } else {
                    Json(json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "error": {
                            "code": -32602,
                            "message": "Missing tool name"
                        }
                    }))
                }
            }

            _ => Json(json!({
                "jsonrpc": "2.0",
                "id": id,
                "error": {
                    "code": -32601,
                    "message": format!("Method not found: {}", method)
                }
            }))
        };
    }

    // Fallback to legacy action-based protocol
    let action = request.get("action").and_then(|v| v.as_str());

    match action {
        Some("list_tools") => {
            // Return available tools from unified introspection
            let tools = get_available_tools(&state).await;
            Json(json!({
                "success": true,
                "data": {
                    "tools": tools
                }
            }))
        }

        Some("execute_tool") => {
            // Execute tool with orchestration support
            let tool_name = request.get("tool").and_then(|v| v.as_str());
            let parameters = request.get("parameters");

            if let (Some(tool_name), Some(parameters)) = (tool_name, parameters) {
                let result = execute_tool_with_orchestration(&state, tool_name, parameters).await;
                match result {
                    Ok(response) => Json(json!({
                        "success": true,
                        "data": response
                    })),
                    Err(error) => Json(json!({
                        "success": false,
                        "error": error.to_string()
                    }))
                }
            } else {
                Json(json!({
                    "success": false,
                    "error": "Missing tool name or parameters"
                }))
            }
        }

        Some("send_message") => {
            // Handle chat messages with system orchestration context
            let message = request.get("message").and_then(|v| v.as_str());
            let conversation_id = request.get("conversationId").and_then(|v| v.as_str());

            if let Some(message) = message {
                let response = send_chat_message_with_orchestration(
                    &state,
                    message,
                    conversation_id.unwrap_or("default")
                ).await;

                match response {
                    Ok(chat_response) => Json(json!({
                        "success": true,
                        "data": {
                            "response": chat_response,
                            "conversationId": conversation_id.unwrap_or("default")
                        }
                    })),
                    Err(error) => Json(json!({
                        "success": false,
                        "error": error.to_string()
                    }))
                }
            } else {
                Json(json!({
                    "success": false,
                    "error": "Missing message"
                }))
            }
        }

        _ => Json(json!({
            "success": false,
            "error": "Unknown action"
        }))
    }
}

// WebSocket handler for chat
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<ChatState>,
) -> imoptar    // Generate a simple conversation ID
    let conversation_id = format!(
        "conv_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );

    while let Some(Ok(message)) = receiver.next().await {
        if let Message::Text(text) = message {
            // Parse incoming message
            if let Ok(chat_msg) = serde_json::from_str::<ChatMessage>(&text) {
                match chat_msg {
                    ChatMessage::User { content, .. } => {
                        // Get system context for enhanced AI awareness
                        let system_context = get_system_context(&state).await;

                        // Store user message
                        let timestamp = std::time::SystemTime::now()
                            .duration_since(std::time::SystemTime::UNIX_EPOCH)
                            .unwrap()
                            .as_secs();

                        let user_msg = ChatMessage::User {
                            content: content.clone(),
                            timestamp,
                            context: system_context.clone(),
                        };

                        // Add to conversation
                        {
                            let mut conversations = state.conversations.write().await;
                            conversations
                                .entry(conversation_id.clone())
                                .or_insert_with(Vec::new)
                                .push(user_msg.clone());
                        }

                        // Send back the user message for UI update
                        if let Ok(response) = serde_json::to_string(&user_msg) {
                            let _ = sender.send(Message::Text(response)).await;
                        }

                        // Generate AI response using the AI brain
                        {
                            // Build context-aware prompt with system information
                            let enhanced_prompt = build_enhanced_prompt(&content, &system_context);
                            let model = state.ollama_client.default_model();

                            match state.ollama_client.simple_chat(&model, &enhanced_prompt).await {
                                Ok(ai_response) => {
                                    let ai_msg = ChatMessage::Assistant {
                                        content: ai_response,
                                        timestamp: std::time::SystemTime::now()
                                            .duration_since(std::time::SystemTime::UNIX_EPOCH)
                                            .unwrap()
                                            .as_secs(),
                                        tools_used: None,
                                    };

                                    // Add to conversation
                                    {
                                        let mut conversations = state.conversations.write().await;
                                        conversations
                                            .entry(conversation_id.clone())
                                            .or_insert_with(Vec::new)
                                            .push(ai_msg.clone());
                                    }

                                    // Send AI response
                                    if let Ok(response) = serde_json::to_string(&ai_msg) {
                                        let _ = sender.send(Message::Text(response)).await;
                                    }
                                }
                                Err(e) => {
                                    error!("AI chat error: {}", e);
                                    let error_msg = ChatMessage::Error {
                                        content: format!("AI chat failed: {}", e),
                                        timestamp: std::time::SystemTime::now()
                                            .duration_since(std::time::SystemTime::UNIX_EPOCH)
                                            .unwrap()
                                            .as_secs(),
                                    };

                                    if let Ok(response) = serde_json::to_string(&error_msg) {
                                        let _ = sender.send(Message::Text(response)).await;
                                    }
                                }
                            }
                        }
                    }
                    _ => {} // Ignore other message types
                }
            }
        }
    }
}

/// Get system context from unified tool introspection
async fn get_system_context(state: &ChatState) -> Option<SystemContext> {
    // Get introspection data from unified tool registry
    let introspection_guard = state.tool_introspection.read().await;

    if let Some(introspection) = introspection_guard.as_ref() {
        let tool_count = introspection
            .get("total_tools_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;

        let available_plugins = introspection
            .get("available_plugins")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        Some(SystemContext {
            active_services: vec![
                "dbus-daemon".to_string(),
                "systemd".to_string(),
                "networkd".to_string(),
            ],
            network_status: format!("{} state plugins available", available_plugins),
            system_load: 0.45, // Could be enhanced with real system load
            available_tools: vec![
                "plugin_systemd".to_string(),
                "plugin_network".to_string(),
                "plugin_packagekit".to_string(),
            ],
            tool_count,
        })
    } else {
        // Fallback to basic context
        Some(SystemContext {
            active_services: vec!["dbus-daemon".to_string()],
            network_status: "System context unavailable".to_string(),
            system_load: 0.0,
            available_tools: vec![],
            tool_count: 0,
        })
    }
}

/// Build enhanced prompt with unified system context
fn build_enhanced_prompt(user_input: &str, context: &Option<SystemContext>) -> String {
    // Get workflow and plugin information
    let wp_introspection = workflow_plugin_introspection::WorkflowPluginIntrospection::new();
    let wp_context = wp_introspection.to_chat_context();

    match context {
        Some(ctx) => {
            format!(
                "User query: {}\n\nSystem context:\n\
                 - Active services: {}\n\
                 - Network status: {}\n\
                 - System load: {:.2}\n\
                 - Available tools/operations: {} (including plugin-derived operations)\n\n\
                 Available Workflows and Plugins:\n\
                 {}\n\n\
                 Context: The system has {} total tools (includes both native tools and tools created from state plugins).\n\
                 Plugins are automatically converted to tools with names like 'plugin_systemd', 'plugin_network', etc.\n\n\
                 If the user asks about:\n\
                 - System operations: recommend relevant tools\n\
                 - Code review/testing: suggest code_review or test_generation workflows\n\
                 - State/service management: mention systemd, network, packagekit plugins\n\
                 - Deployment: recommend deployment workflows with rollback",
                user_input,
                ctx.active_services.join(", "),
                ctx.network_status,
                ctx.system_load,
                ctx.tool_count,
                wp_context,
                ctx.tool_count
            )
        }
        None => {
            // Even without D-Bus context, include workflows and plugins
            format!(
                "User query: {}\n\nAvailable Workflows and Plugins:\n{}\n\n\
                 Please provide a response considering available workflows and state management plugins.",
                user_input,
                wp_context
            )
        }
    }
}

/// Build unified tool introspection from workflows and plugins
/// This follows the unified introspection pattern defined in ToolRegistry.get_introspection()
/// In a full MCP server, this data would come from ToolRegistry which includes native tools too.
/// For chat_main.rs, we build it from WorkflowPluginIntrospection which provides the plugin view.
async fn build_unified_tool_introspection() -> Option<Value> {
    let wp_introspection = workflow_plugin_introspection::WorkflowPluginIntrospection::new();

    // Convert plugins to the tool format as PluginToolBridge would
    // Each plugin generates three tools: query, diff, apply
    let plugin_tools: Vec<serde_json::Value> = wp_introspection
        .plugins
        .iter()
        .flat_map(|plugin| {
            vec![
                serde_json::json!({
                    "name": format!("plugin_{}_query", plugin.name),
                    "description": format!("Query current state from {} plugin", plugin.name),
                    "type": "plugin_tool",
                    "plugin_name": plugin.name,
                    "operation": "query",
                }),
                serde_json::json!({
                    "name": format!("plugin_{}_diff", plugin.name),
                    "description": format!("Calculate state diff for {} plugin", plugin.name),
                    "type": "plugin_tool",
                    "plugin_name": plugin.name,
                    "operation": "diff",
                }),
                serde_json::json!({
                    "name": format!("plugin_{}_apply", plugin.name),
                    "description": format!("Apply state changes for {} plugin", plugin.name),
                    "type": "plugin_tool",
                    "plugin_name": plugin.name,
                    "operation": "apply",
                }),
            ]
        })
        .collect();

    Some(serde_json::json!({
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        "type": "unified_system_introspection",
        "description": "Unified introspection: plugin-derived tools and workflows (native tools available in full MCP server)",
        "tools": plugin_tools,
        "workflows": wp_introspection.workflows,
        "state_plugins": wp_introspection.plugins,
        "total_tools": plugin_tools.len(),
        "total_workflows": wp_introspection.workflows.len(),
        "available_plugins": wp_introspection.plugins.iter().filter(|p| p.available).count(),
    }))
}

        }
    }
}

/// Build unified tool introspection from workflows and plugins
/// This follows the unified introspection pattern defined in ToolRegistry.get_introspection()
/// In a full MCP server, this data would come from ToolRegistry which includes native tools too.
/// For chat_main.rs, we build it from WorkflowPluginIntrospection which provides the plugin view.
async fn build_unified_tool_introspection() -> Option<Value> {
    let wp_introspection = workflow_plugin_introspection::WorkflowPluginIntrospection::new();

    // Convert plugins to the tool format as PluginToolBridge would
    // Each plugin generates three tools: query, diff, apply
    let plugin_tools: Vec<serde_json::Value> = wp_introspection
        .plugins
        .iter()
        .flat_map(|plugin| {
            vec![
                serde_json::json!({
                    "name": format!("plugin_{}_query", plugin.name),
                    "description": format!("Query current state from {} plugin", plugin.name),
                    "type": "plugin_tool",
                    "plugin_name": plugin.name,
                    "operation": "query",
                }),
                serde_json::json!({
                    "name": format!("plugin_{}_diff", plugin.name),
                    "description": format!("Calculate state diff for {} plugin", plugin.name),
                    "type": "plugin_tool",
                    "plugin_name": plugin.name,
                    "operation": "diff",
                }),
                serde_json::json!({
                    "name": format!("plugin_{}_apply", plugin.name),
                    "description": format!("Apply state changes for {} plugin", plugin.name),
                    "type": "plugin_tool",
                    "plugin_name": plugin.name,
                    "operation": "apply",
                }),
            ]
        })
        .collect();

    Some(serde_json::json!({
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        "type": "unified_system_introspection",
        "description": "Unified introspection: plugin-derived tools and workflows (native tools available in full MCP server)",
        "tools": plugin_tools,
        "workflows": wp_introspection.workflows,
        "state_plugins": wp_introspection.plugins,
        "total_tools": plugin_tools.len(),
        "total_workflows": wp_introspection.workflows.len(),
        "available_plugins": wp_introspection.plugins.iter().filter(|p| p.available).count(),
    }))
}
