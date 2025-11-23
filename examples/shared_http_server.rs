//! Example: Using the Shared HTTP/TLS Server
//!
//! This example demonstrates how to use the shared HTTP/TLS server
//! for different services (MCP, agents, web interfaces, etc.).

use op_dbus::http_tls_server::*;
use axum::response::Json;
use serde_json::json;

/// Example service handler
async fn example_handler() -> impl IntoResponse {
    Json(json!({
        "service": "example",
        "status": "running",
        "message": "Hello from the shared HTTP/TLS server!"
    }))
}

/// Another example handler
async fn api_status() -> impl IntoResponse {
    Json(json!({
        "api_version": "1.0",
        "uptime": "unknown", // Would track in real implementation
        "services": ["mcp", "agents", "web"]
    }))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Starting Example Shared HTTP/TLS Server...");

    // Create service routers for different services
    let api_router = ServiceRouter::new("/api/v1")
        .route("/status", get(api_status))
        .route("/example", get(example_handler));

    let web_router = ServiceRouter::new("/web")
        .static_dir("/", "examples/web");

    // Build and start the server
    let server = ServerBuilder::new()
        .bind_addr("0.0.0.0:8080")
        .public_host("localhost")
        .https_auto() // Auto-detect HTTPS certificates
        .service_router(api_router)
        .service_router(web_router)
        .cors(true)
        .tracing(true)
        .build()
        .await?;

    println!("✅ Server configured with:");
    println!("   • API endpoints at /api/v1/*");
    println!("   • Web interface at /web/*");
    println!("   • Health check at /health");
    println!("   • Auto-detected HTTPS certificates");

    server.serve().await?;

    Ok(())
}
