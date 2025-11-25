//! Independent Shared Rust HTTP/TLS Server
//!
//! This is a standalone HTTP/TLS server library that can be shared across
//! different services (MCP, agents, web interfaces, etc.). It provides:
//!
//! - HTTP/1.1 and HTTP/2 support
//! - Automatic TLS certificate detection and management
//! - Pluggable routing system for different services
//! - WebSocket support
//! - Static file serving
//! - CORS, tracing, and security middleware
//! - Health checks and metrics endpoints
//! - Graceful shutdown handling
//!
//! ## Usage
//!
//! ```rust
//! use http_tls_server::{ServerBuilder, ServiceRouter};
//!
//! // Create service router for your service
//! let router = ServiceRouter::new("/api/my-service")
//!     .route("/health", get(health_handler))
//!     .route("/data", post(data_handler));
//!
//! // Build and start server
//! let server = ServerBuilder::new()
//!     .service_router(router)
//!     .bind_addr("0.0.0.0:8443")
//!     .build()
//!     .await?;
//!
//! server.serve().await?;
//! ```

pub mod server;
pub mod router;
pub mod tls;
pub mod request_filters;
pub mod health;
pub mod metrics;

// Re-export main types for convenience
pub use server::{Server, ServerBuilder};
pub use router::ServiceRouter;
pub use tls::{TlsConfig, CertificateSource};

// Common imports for users
pub use axum::{
    routing::{get, post, put, delete, patch},
    extract::{Query, Path, State, Json},
    response::{IntoResponse, Json as JsonResponse},
    http::{StatusCode, HeaderMap},
};

// Error types
#[derive(Debug, thiserror::Error)]
pub enum ServerError {
    #[error("TLS configuration error: {0}")]
    TlsError(#[from] tls::TlsError),
    #[error("Server binding error: {0}")]
    BindError(std::io::Error),
    #[error("Router configuration error: {0}")]
    RouterError(String),
    #[error("Request filter error: {0}")]
    RequestFilterError(String),
}

pub type Result<T> = std::result::Result<T, ServerError>;
