//! MCP (Model Context Protocol) integration module
//!
//! This module provides MCP server functionality with D-Bus orchestration
//! for Linux system automation.

pub mod agents {
    pub mod executor;
    pub mod file;
    pub mod monitor;
    pub mod network;
    pub mod packagekit;
    pub mod systemd;
}

// Core MCP modules
// pub mod bridge; // Binary
pub mod discovery;
// pub mod discovery_enhanced;  // File not found
pub mod hybrid_dbus_bridge;
pub mod hybrid_scanner;
pub mod introspection_parser;
pub mod json_introspection;
// pub mod orchestrator; // Binary
pub mod system_introspection;

// Refactored modules for loose coupling
pub mod agent_registry;
pub mod tool_registry;
pub mod external_mcp_client;  // External MCP server integration
pub mod sse_streaming;  // SSE support for long-running operations
pub mod client_config_generator;  // Auto-generate client configs



// MCP tools
pub mod tools {
    pub mod introspection;
}

// Chat interface
pub mod ai_context_provider;
pub mod chat_server;
pub mod ollama;

// Chat module - The Brains
pub mod chat;

// Flow-based workflows
pub mod workflows;

// MCP client for discovering and connecting to hosted MCP servers
pub mod mcp_client;
pub mod mcp_discovery;

// Bridge between plugin registry and tool registry
pub mod plugin_tool_bridge;

// D-Bus indexer for hierarchical abstraction
pub mod dbus_indexer;

// Introspection cache with JSON/SQLite storage (now Send+Sync with RwLock)
pub mod introspection_cache;

// Introspection tools for MCP
pub mod introspection_tools;

// Workflow and plugin introspection for AI context
pub mod workflow_plugin_introspection;

// Embedded resources for MCP
pub mod resources;

// Comprehensive native introspection (no wrappers)
pub mod comprehensive_introspection;
pub mod native_introspection;

// Introspective Gadget - Universal object inspector (like Inspector Gadget!)
pub mod introspective_gadget;

// Bundled comprehensive agents
pub mod embedded_agents;

#[cfg(feature = "mcp")]
pub mod web_bridge;
#[cfg(feature = "mcp")]
pub mod web_bridge_improved;

// lib.rs is a small utility module for re-exports
pub mod lib;
