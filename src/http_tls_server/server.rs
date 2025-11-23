//! Shared HTTP/TLS Server Implementation
//!
//! Based on the chat_main.rs implementation, this provides a configurable
//! HTTP/TLS server that can be shared across different services.

use axum::{Router, response::Redirect};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{info, warn};

use super::router::{RouterRegistry, ServiceRouter};
use super::tls::{TlsConfig, CertificateSource};
use super::{ServerError, Result};

/// Server configuration detected via introspection
#[derive(Clone, Debug)]
pub struct ServerConfig {
    pub http_port: u16,
    pub https_port: u16,
    pub bind_host: String,
    pub public_host: String,
    pub https_enabled: bool,
    pub ssl_cert_path: String,
    pub ssl_key_path: String,
}

/// TLS certificate configuration
#[derive(Clone, Debug)]
pub enum TlsMode {
    /// No TLS, HTTP only
    Disabled,
    /// TLS enabled with certificate files
    Enabled { cert_path: String, key_path: String },
    /// Auto-detect certificates
    Auto,
}

/// Server builder for configuring the HTTP/TLS server
#[derive(Clone)]
pub struct ServerBuilder {
    bind_addr: Option<String>,
    public_host: Option<String>,
    tls_mode: TlsMode,
    router_registry: RouterRegistry,
    cors_enabled: bool,
    tracing_enabled: bool,
}

impl ServerBuilder {
    /// Create a new server builder
    pub fn new() -> Self {
        Self {
            bind_addr: None,
            public_host: None,
            tls_mode: TlsMode::Disabled,
            router_registry: RouterRegistry::new(),
            cors_enabled: true,
            tracing_enabled: true,
        }
    }

    /// Set the bind address (host:port)
    pub fn bind_addr(mut self, addr: impl Into<String>) -> Self {
        self.bind_addr = Some(addr.into());
        self
    }

    /// Set the public host for URLs
    pub fn public_host(mut self, host: impl Into<String>) -> Self {
        self.public_host = Some(host.into());
        self
    }

    /// Enable HTTPS with certificate paths
    pub fn https(mut self, cert_path: impl Into<String>, key_path: impl Into<String>) -> Self {
        self.tls_mode = TlsMode::Enabled {
            cert_path: cert_path.into(),
            key_path: key_path.into(),
        };
        self
    }

    /// Auto-detect HTTPS certificates
    pub fn https_auto(mut self) -> Self {
        self.tls_mode = TlsMode::Auto;
        self
    }

    /// Register a service router
    pub fn service_router(mut self, router: ServiceRouter) -> Self {
        let service_name = router.base_path().trim_start_matches('/').to_string();
        self.router_registry.register_service(service_name, router);
        self
    }

    /// Register multiple service routers
    pub fn service_routers(mut self, routers: Vec<ServiceRouter>) -> Self {
        for router in routers {
            let service_name = router.base_path().trim_start_matches('/').to_string();
            self.router_registry.register_service(service_name, router);
        }
        self
    }

    /// Enable/disable CORS
    pub fn cors(mut self, enabled: bool) -> Self {
        self.cors_enabled = enabled;
        self
    }

    /// Enable/disable tracing middleware
    pub fn tracing(mut self, enabled: bool) -> Self {
        self.tracing_enabled = enabled;
        self
    }

    /// Build the server
    pub async fn build(self) -> Result<Server> {
        let config = self.detect_config().await?;

        // Build the complete router
        let mut app = self.router_registry.build_complete_router();

        // Add global middleware
        if self.cors_enabled {
            app = app.layer(CorsLayer::permissive());
        }

        if self.tracing_enabled {
            app = app.layer(TraceLayer::new_for_http());
        }

        // Add health check endpoint
        app = app.route("/health", axum::routing::get(health_check));

        // Add root redirect if web service exists
        if self.router_registry.get_service("web").is_some() {
            app = app.route("/", axum::routing::get(|| async {
                Redirect::to("/web/")
            }));
        }

        Ok(Server {
            config,
            app,
            tls_mode: self.tls_mode,
        })
    }

    /// Detect server configuration via introspection
    async fn detect_config(&self) -> Result<ServerConfig> {
        // Get hostname via introspection
        let hostname = gethostname::gethostname()
            .to_string_lossy()
            .to_string();

        // Try to get FQDN from /etc/hostname or /etc/hosts
        let public_host = detect_fqdn(&hostname).unwrap_or_else(|| {
            self.public_host.clone()
                .unwrap_or_else(|| hostname.clone())
        });

        let bind_host = self.bind_addr.as_ref()
            .map(|addr| {
                addr.split(':').next()
                    .unwrap_or("0.0.0.0")
                    .to_string()
            })
            .unwrap_or_else(|| std::env::var("BIND_HOST")
                .unwrap_or_else(|_| "0.0.0.0".to_string()));

        let http_port = self.bind_addr.as_ref()
            .and_then(|addr| addr.split(':').nth(1))
            .and_then(|port| port.parse().ok())
            .unwrap_or_else(|| std::env::var("HTTP_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .unwrap_or(8080));

        let https_port = std::env::var("HTTPS_PORT")
            .unwrap_or_else(|_| "8443".to_string())
            .parse()
            .unwrap_or(8443);

        let (https_enabled, ssl_cert_path, ssl_key_path) = match &self.tls_mode {
            TlsMode::Disabled => (false, "".to_string(), "".to_string()),
            TlsMode::Enabled { cert_path, key_path } => {
                (true, cert_path.clone(), key_path.clone())
            }
            TlsMode::Auto => {
                // Auto-detect certificates
                let cert_path = detect_ssl_certificates().unwrap_or_else(|_| "".to_string());
                let key_path = std::env::var("SSL_KEY_PATH")
                    .unwrap_or_else(|_| cert_path.replace(".pem", ".key"));

                (!cert_path.is_empty() && std::path::Path::new(&cert_path).exists(), cert_path, key_path)
            }
        };

        Ok(ServerConfig {
            http_port,
            https_port,
            bind_host,
            public_host,
            https_enabled,
            ssl_cert_path,
            ssl_key_path,
        })
    }
}

impl Default for ServerBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// The HTTP/TLS server
pub struct Server {
    config: ServerConfig,
    app: Router,
    tls_mode: TlsMode,
}

impl Server {
    /// Start the server
    pub async fn serve(self) -> Result<()> {
        let config = self.config;
        let app = self.app;

        let http_addr: SocketAddr = format!("{}:{}", config.bind_host, config.http_port)
            .parse()
            .map_err(|_| ServerError::BindError(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid HTTP bind address"
            )))?;

        let https_addr: SocketAddr = format!("{}:{}", config.bind_host, config.https_port)
            .parse()
            .map_err(|_| ServerError::BindError(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid HTTPS bind address"
            )))?;

        match self.tls_mode {
            TlsMode::Disabled => {
                // HTTP only
                let listener = TcpListener::bind(http_addr).await
                    .map_err(ServerError::BindError)?;
                info!("🌐 HTTP server listening on http://{}", http_addr);
                info!("⚠️  HTTP is not secure - use HTTPS for production");
                log_endpoints(&config, false);
                axum::serve(listener, app).await
                    .map_err(|e| ServerError::BindError(std::io::Error::new(
                        std::io::ErrorKind::Other, e
                    )))?;
            }
            TlsMode::Enabled { cert_path, key_path } => {
                // Try HTTPS first, fallback to HTTP
                self.serve_with_tls_fallback(http_addr, https_addr, cert_path, key_path, app).await?;
            }
            TlsMode::Auto => {
                // Auto-detect certificates
                let cert_path = detect_ssl_certificates().unwrap_or_else(|_| "".to_string());
                let key_path = std::env::var("SSL_KEY_PATH")
                    .unwrap_or_else(|_| cert_path.replace(".pem", ".key"));
                self.serve_with_tls_fallback(http_addr, https_addr, &cert_path, &key_path, app).await?;
            }
        }

        Ok(())
    }

    async fn serve_with_tls_fallback(
        &self,
        http_addr: SocketAddr,
        https_addr: SocketAddr,
        cert_path: &str,
        key_path: &str,
        app: Router,
    ) -> Result<()> {
        // Use axum-server for HTTPS (Rust-only, no Node.js)
        use axum_server::tls_rustls::RustlsConfig;

        match RustlsConfig::from_pem_file(
            std::path::Path::new(cert_path),
            std::path::Path::new(key_path),
        ).await {
            Ok(rustls_config) => {
                info!("🔒 HTTPS enabled - Loading TLS configuration...");

                // Start HTTP server (redirect or fallback)
                let http_listener = TcpListener::bind(http_addr).await
                    .map_err(ServerError::BindError)?;
                let http_app = app.clone();
                tokio::spawn(async move {
                    info!("🌐 HTTP server listening on http://{} (redirects to HTTPS)", http_addr);
                    let _ = axum::serve(http_listener, http_app).await;
                });

                info!("🔒 HTTPS server listening on https://{}", https_addr);
                log_endpoints(&self.config, true);

                axum_server::bind_rustls(https_addr, rustls_config)
                    .serve(app.into_make_service())
                    .await
                    .map_err(|e| ServerError::BindError(std::io::Error::new(
                        std::io::ErrorKind::Other, e
                    )))?;
            }
            Err(e) => {
                warn!("⚠️  HTTPS enabled but certificates not found, falling back to HTTP");
                warn!("   Error: {}", e);
                warn!("   Generate certificates: ./generate-ssl-cert.sh");
                warn!("   Or set SSL_CERT_PATH and SSL_KEY_PATH environment variables");

                let listener = TcpListener::bind(http_addr).await
                    .map_err(ServerError::BindError)?;
                info!("🌐 HTTP server listening on http://{}", http_addr);
                info!("⚠️  HTTP is not secure - use HTTPS for production");
                log_endpoints(&self.config, false);
                axum::serve(listener, app).await
                    .map_err(|e| ServerError::BindError(std::io::Error::new(
                        std::io::ErrorKind::Other, e
                    )))?;
            }
        }

        Ok(())
    }

    /// Get server configuration
    pub fn config(&self) -> &ServerConfig {
        &self.config
    }

    /// Get registered services
    pub fn services(&self) -> Vec<String> {
        // This would need to be stored in Server if we want to expose it
        vec![]
    }
}

/// Health check handler
async fn health_check() -> &'static str {
    "OK"
}

/// Log available endpoints
fn log_endpoints(config: &ServerConfig, https: bool) {
    let scheme = if https { "https" } else { "http" };
    let port = if https { config.https_port } else { config.http_port };

    info!("📡 Available endpoints:");
    info!("   - {scheme}://{}:{}/health", config.public_host, port);
    info!("   - {scheme}://{}:{}/", config.public_host, port);
}

/// Detect FQDN from system files
fn detect_fqdn(hostname: &str) -> Option<String> {
    // Try /etc/hostname first
    if let Ok(content) = std::fs::read_to_string("/etc/hostname") {
        let fqdn = content.trim();
        if fqdn.contains('.') && fqdn != hostname {
            return Some(fqdn.to_string());
        }
    }

    // Try /etc/hosts
    if let Ok(content) = std::fs::read_to_string("/etc/hosts") {
        for line in content.lines() {
            let line = line.trim();
            if line.starts_with('#') || line.is_empty() {
                continue;
            }
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 && parts[1].contains('.') && parts[1] != hostname {
                return Some(parts[1].to_string());
            }
        }
    }

    None
}

/// Detect SSL certificates via introspection
fn detect_ssl_certificates() -> Result<String> {
    let cert_paths = [
        "/etc/ssl/certs/ssl-cert-snakeoil.pem",
        "/etc/ssl/certs/localhost.pem",
        "/etc/letsencrypt/live/localhost/cert.pem",
        "/etc/letsencrypt/live/localhost/fullchain.pem",
    ];

    for path in &cert_paths {
        if std::path::Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }

    // Try environment variables
    if let Ok(path) = std::env::var("SSL_CERT_PATH") {
        if std::path::Path::new(&path).exists() {
            return Ok(path);
        }
    }

    Err(ServerError::RouterError("No SSL certificates found".to_string()))
}
