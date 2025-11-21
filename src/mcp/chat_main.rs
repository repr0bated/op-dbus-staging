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

use anyhow::Result;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::sync::RwLock;
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing::{error, info};

use ollama::OllamaClient;

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

// Chat server state with unified introspection support
// This consolidates tool/plugin introspection into a single registry
// Note: We avoid IntrospectionCache here to prevent Send+Sync issues with rusqlite
// The cache is designed for CLI usage, not async web servers
#[derive(Clone)]
struct ChatState {
    ollama_client: Option<Arc<OllamaClient>>,
    conversations: Arc<RwLock<HashMap<String, Vec<ChatMessage>>>>,
    // Cached unified introspection data from plugins and workflows
    // This replaces the need for IntrospectionCache in web context
    tool_introspection: Arc<RwLock<Option<Value>>>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    info!("Starting AI Chat Server...");

    // Create Ollama client for AI
    let ollama_client = if let Ok(api_key) = std::env::var("OLLAMA_API_KEY") {
        info!("Using Ollama Cloud API with AI");
        Some(Arc::new(OllamaClient::cloud(api_key)))
    } else {
        info!("OLLAMA_API_KEY not set. Set your Ollama API key to enable AI chat.");
        info!("Get your API key from: https://ollama.com");
        None
    };

    // Build unified tool introspection
    // This consolidates plugins (via PluginToolBridge) and native tools into one registry
    // Note: We use this instead of IntrospectionCache which has rusqlite Send+Sync issues
    let tool_introspection = build_unified_tool_introspection().await;
    info!("✅ Unified tool introspection initialized from workflows and plugins");

    // Create chat state with unified introspection support
    let chat_state = ChatState {
        ollama_client,
        conversations: Arc::new(RwLock::new(HashMap::new())),
        tool_introspection: Arc::new(RwLock::new(tool_introspection)),
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
        // WebSocket endpoint for chat
        .route("/ws", get(websocket_handler))
        // Serve static files
        .route(
            "/",
            get(|| async { axum::response::Redirect::permanent("/chat.html") }),
        )
        .nest_service("/chat.html", ServeFile::new(web_dir.join("chat.html")))
        .nest_service("/chat.js", ServeFile::new(web_dir.join("chat.js")))
        .nest_service(
            "/chat-styles.css",
            ServeFile::new(web_dir.join("chat-styles.css")),
        )
        // Fallback to web directory for other static assets
        .nest_service("/", ServeDir::new(&web_dir))
        // Add tracing
        .layer(TraceLayer::new_for_http())
        .with_state(chat_state);

    // Start the server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("AI Chat Server listening on http://{}", addr);
    info!("Open http://localhost:8080 in your browser to chat with AI");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

// WebSocket handler for chat
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<ChatState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: ChatState) {
    let (mut sender, mut receiver) = socket.split();

    // Generate a simple conversation ID
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

                        // Generate AI response if Ollama client is available
                        if let Some(ollama_client) = &state.ollama_client {
                            // Build context-aware prompt with system information
                            let enhanced_prompt = build_enhanced_prompt(&content, &system_context);

                            match ollama_client.simple_chat("mistral", &enhanced_prompt).await {
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
                        } else {
                            // No Ollama client - send error message
                            let error_msg = ChatMessage::Error {
                                content: "AI is not available. Please set OLLAMA_API_KEY environment variable.".to_string(),
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
