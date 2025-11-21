//! Combined Chat-Orchestrator Service
//!
//! Unified service that combines:
//! - Chat interface for human interaction
//! - Orchestration logic for system control
//! - Agent management for task execution
//! - Introspection cache for system awareness
//! - Tool registry for operations
//! - AI integration for intelligent decisions

use anyhow::Result;
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::Response,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, net::SocketAddr, path::PathBuf, sync::Arc, time::SystemTime};
use tokio::sync::{broadcast, RwLock};
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing::{error, info};

use crate::mcp::{
    agent_registry::{load_default_specs, AgentRegistry},
    introspection_cache::IntrospectionCache,
    ollama::OllamaClient,
    tool_registry::{ToolRegistry, ToolRegistryService},
};

// Chat message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ChatMessage {
    User { content: String, timestamp: u64 },
    Assistant { content: String, timestamp: u64, tools_used: Vec<String> },
    System { content: String, timestamp: u64 },
    Error { content: String, timestamp: u64 },
}

// Task for agent execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: String,
    pub agent_id: String,
    pub task_type: String,
    pub payload: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub status: TaskStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Running,
    Completed { result: serde_json::Value },
    Failed { error: String },
}

// Combined Chat-Orchestrator state
#[derive(Clone)]
pub struct ChatOrchestratorState {
    // Chat components
    pub conversations: Arc<RwLock<HashMap<String, Vec<ChatMessage>>>>,

    // Orchestration components
    pub agent_registry: Arc<AgentRegistry>,
    pub task_queues: Arc<RwLock<HashMap<String, Vec<AgentTask>>>>,

    // Tool Registry Service - provides introspection API
    pub registry_service: Arc<ToolRegistryService>,

    // AI integration
    pub ollama_client: Option<Arc<OllamaClient>>,

    // Event broadcasting
    pub event_tx: broadcast::Sender<ChatMessage>,
}

impl ChatOrchestratorState {
    pub async fn new() -> Result<Self> {
        info!("Initializing Chat-Orchestrator...");

        // Initialize agent registry
        let agent_registry = Arc::new(AgentRegistry::new());
        load_default_specs(&agent_registry).await?;
        info!("✅ Agent registry initialized");

        // Initialize introspection cache
        let cache_path = PathBuf::from("/var/cache/dbus-introspection.db");
        let introspection_cache = Arc::new(IntrospectionCache::new(&cache_path)?);
        info!("✅ Introspection cache initialized");

        // Initialize tool registry
        let tool_registry = Arc::new(ToolRegistry::new());
        // TODO: Register all tools here

        // Initialize Tool Registry Service (introspection cache is kept separate)
        let registry_service = Arc::new(ToolRegistryService::new(tool_registry));
        info!("✅ Tool Registry Service initialized");

        // Note: introspection cache is available separately for direct use

        // Initialize Ollama client
        let ollama_client = if let Ok(api_key) = std::env::var("OLLAMA_API_KEY") {
            info!("Using Ollama Cloud API");
            Some(Arc::new(OllamaClient::cloud(api_key)))
        } else {
            info!("OLLAMA_API_KEY not set - AI features limited");
            None
        };

        // Create event channel
        let (event_tx, _) = broadcast::channel(100);

        Ok(Self {
            conversations: Arc::new(RwLock::new(HashMap::new())),
            agent_registry,
            task_queues: Arc::new(RwLock::new(HashMap::new())),
            registry_service,
            ollama_client,
            event_tx,
        })
    }

    /// Process a chat message with full orchestration
    pub async fn process_message(&self, conversation_id: &str, content: &str) -> ChatMessage {
        // Store user message
        let user_msg = ChatMessage::User {
            content: content.to_string(),
            timestamp: Self::current_timestamp(),
        };

        // Add to conversation
        {
            let mut conversations = self.conversations.write().await;
            conversations
                .entry(conversation_id.to_string())
                .or_insert_with(Vec::new)
                .push(user_msg.clone());
        }

        // Analyze message and orchestrate response
        match self.orchestrate_response(conversation_id, content).await {
            Ok(response) => {
                // Store assistant response
                let mut conversations = self.conversations.write().await;
                if let Some(conv) = conversations.get_mut(conversation_id) {
                    conv.push(response.clone());
                }
                response
            }
            Err(e) => {
                let error_msg = ChatMessage::Error {
                    content: format!("Orchestration failed: {}", e),
                    timestamp: Self::current_timestamp(),
                };
                error_msg
            }
        }
    }

    /// Main orchestration logic - decides what to do based on content and system state
    async fn orchestrate_response(&self, conversation_id: &str, content: &str) -> Result<ChatMessage> {
        // Get current system state from introspection cache
        let system_state = self.get_system_context().await?;

        // Use AI to analyze intent and suggest actions
        if let Some(ollama) = &self.ollama_client {
            let ai_analysis = self.analyze_with_ai(content, &system_state).await?;

            // Execute orchestration based on AI analysis
            self.execute_orchestration(ai_analysis).await
        } else {
            // Fallback: Parse command directly
            self.parse_and_execute_command(content).await
        }
    }

    /// Get current system context from Tool Registry Service
    async fn get_system_context(&self) -> Result<serde_json::Value> {
        // Get full system summary from Tool Registry Service
        // This provides comprehensive system awareness for AI analysis
        let summary = self.registry_service.get_introspection_summary().await?;

        Ok(serde_json::to_value(summary)?)
    }

    /// Use AI to analyze user intent and suggest orchestration steps
    async fn analyze_with_ai(&self, content: &str, system_state: &serde_json::Value) -> Result<AIAnalysis> {
        // Build context for AI
        let context = format!(
            "User request: {}\nSystem state: {}\n\nAnalyze this request and suggest what tools and agents should be used. Respond with a brief explanation of the orchestration plan.",
            content,
            system_state
        );

        // Get AI analysis using simple chat
        if let Some(ollama) = &self.ollama_client {
            let ai_response = ollama.simple_chat("mistral", &context).await?;
            // Parse AI response (simplified - in real implementation would parse structured response)
            Ok(AIAnalysis {
                intent: "ai_orchestrated".to_string(),
                tools_needed: vec!["systemd_status".to_string()], // TODO: Parse from AI response
                agents_needed: vec![], // TODO: Parse from AI response
                explanation: ai_response,
            })
        } else {
            // Fallback analysis
            Ok(AIAnalysis {
                intent: "execute_command".to_string(),
                tools_needed: vec!["systemd_status".to_string()],
                agents_needed: vec![],
                explanation: "Direct command execution (no AI available)".to_string(),
            })
        }
    }

    /// Execute the orchestrated plan
    async fn execute_orchestration(&self, analysis: AIAnalysis) -> Result<ChatMessage> {
        let mut tools_used = Vec::new();
        let mut results = Vec::new();

        // Execute required tools
        for tool_name in analysis.tools_needed {
            if let Ok(result) = self.registry_service.registry().execute_tool(&tool_name, serde_json::json!({})).await {
                tools_used.push(tool_name);
                if let Some(text) = result.content.first().and_then(|c| c.text.as_ref()) {
                    results.push(text.clone());
                }
            }
        }

        // Spawn required agents
        for agent_type in analysis.agents_needed {
            if let Ok(agent_id) = self.agent_registry.spawn_agent(&agent_type, None).await {
                info!("Spawned agent: {} ({})", agent_type, agent_id);
            }
        }

        let response_content = if results.is_empty() {
            analysis.explanation
        } else {
            format!("{}\n\nResults:\n{}", analysis.explanation, results.join("\n"))
        };

        Ok(ChatMessage::Assistant {
            content: response_content,
            timestamp: Self::current_timestamp(),
            tools_used,
        })
    }

    /// Fallback: Parse and execute command directly
    async fn parse_and_execute_command(&self, content: &str) -> Result<ChatMessage> {
        // Simple command parsing (could be enhanced)
        if content.to_lowercase().contains("status") {
            let result = self.registry_service.registry().execute_tool("systemd_status", serde_json::json!({"service": "dbus-mcp"})).await?;
            let content = result.content.first()
                .and_then(|c| c.text.as_ref())
                .unwrap_or("Status check completed");

            Ok(ChatMessage::Assistant {
                content: content.to_string(),
                timestamp: Self::current_timestamp(),
                tools_used: vec!["systemd_status".to_string()],
            })
        } else {
            Ok(ChatMessage::Assistant {
                content: format!("I received: {}", content),
                timestamp: Self::current_timestamp(),
                tools_used: vec![],
            })
        }
    }

    fn current_timestamp() -> u64 {
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
}

#[derive(Debug)]
struct AIAnalysis {
    intent: String,
    tools_needed: Vec<String>,
    agents_needed: Vec<String>,
    explanation: String,
}

// WebSocket handler
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<ChatOrchestratorState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: ChatOrchestratorState) {
    let (mut sender, mut receiver) = socket.split();
    let mut event_rx = state.event_tx.subscribe();

    // Generate conversation ID
    let conversation_id = format!(
        "conv_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );

    loop {
        tokio::select! {
            Some(Ok(message)) = receiver.next() => {
                if let Message::Text(text) = message {
                    if let Ok(chat_msg) = serde_json::from_str::<ChatMessage>(&text) {
                        match chat_msg {
                            ChatMessage::User { content, .. } => {
                                // Process through orchestrator
                                let response = state.process_message(&conversation_id, &content).await;

                                // Send response
                                if let Ok(response_json) = serde_json::to_string(&response) {
                                    let _ = sender.send(Message::Text(response_json)).await;
                                }
                            }
                            _ => {} // Handle other message types if needed
                        }
                    }
                }
            }
            Ok(event) = event_rx.recv() => {
                // Broadcast events to client
                if let Ok(event_json) = serde_json::to_string(&event) {
                    let _ = sender.send(Message::Text(event_json)).await;
                }
            }
            else => break,
        }
    }
}

#[tokio::main]
pub async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    info!("🚀 Starting Chat-Orchestrator Service...");

    // Create unified state
    let state = ChatOrchestratorState::new().await?;
    info!("✅ Chat-Orchestrator initialized");

    // Setup web interface
    let web_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join("mcp")
        .join("web");

    // Create router
    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .route("/", get(|| async {
            axum::response::Redirect::permanent("/chat.html")
        }))
        .nest_service("/chat.html", ServeFile::new(web_dir.join("chat.html")))
        .nest_service("/chat.js", ServeFile::new(web_dir.join("chat.js")))
        .nest_service("/chat-styles.css", ServeFile::new(web_dir.join("chat-styles.css")))
        .nest_service("/", ServeDir::new(&web_dir))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("🌐 Chat-Orchestrator listening on http://{}", addr);
    info!("🤖 AI-powered orchestration ready");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}