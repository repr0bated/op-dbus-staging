//! TLS Configuration Management
//!
//! Handles certificate detection, loading, and TLS configuration.

use std::path::Path;
use thiserror::Error;

/// TLS configuration errors
#[derive(Debug, Error)]
pub enum TlsError {
    #[error("Certificate file not found: {0}")]
    CertNotFound(String),
    #[error("Key file not found: {0}")]
    KeyNotFound(String),
    #[error("Invalid certificate: {0}")]
    InvalidCert(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Rustls error: {0}")]
    Rustls(#[from] rustls::Error),
}

/// TLS certificate source
#[derive(Clone, Debug)]
pub enum CertificateSource {
    /// File-based certificates
    Files { cert_path: String, key_path: String },
    /// Auto-detected certificates
    Auto,
    /// Let's Encrypt ACME
    LetsEncrypt { domain: String, email: String },
}

/// TLS configuration
#[derive(Clone, Debug)]
pub struct TlsConfig {
    pub cert_source: CertificateSource,
    pub min_tls_version: rustls::ProtocolVersion,
    pub cipher_suites: Vec<rustls::SupportedCipherSuite>,
}

impl TlsConfig {
    /// Create TLS config from certificate files
    pub fn from_files(cert_path: impl Into<String>, key_path: impl Into<String>) -> Self {
        Self {
            cert_source: CertificateSource::Files {
                cert_path: cert_path.into(),
                key_path: key_path.into(),
            },
            min_tls_version: rustls::version::TLS12,
            cipher_suites: rustls::DEFAULT_CIPHER_SUITES.to_vec(),
        }
    }

    /// Create auto-detecting TLS config
    pub fn auto() -> Self {
        Self {
            cert_source: CertificateSource::Auto,
            min_tls_version: rustls::version::TLS12,
            cipher_suites: rustls::DEFAULT_CIPHER_SUITES.to_vec(),
        }
    }

    /// Create Let's Encrypt TLS config
    pub fn lets_encrypt(domain: impl Into<String>, email: impl Into<String>) -> Self {
        Self {
            cert_source: CertificateSource::LetsEncrypt {
                domain: domain.into(),
                email: email.into(),
            },
            min_tls_version: rustls::version::TLS12,
            cipher_suites: rustls::DEFAULT_CIPHER_SUITES.to_vec(),
        }
    }

    /// Set minimum TLS version
    pub fn min_tls_version(mut self, version: rustls::ProtocolVersion) -> Self {
        self.min_tls_version = version;
        self
    }

    /// Build rustls config for axum-server
    pub async fn build_rustls_config(&self) -> Result<axum_server::tls_rustls::RustlsConfig, TlsError> {
        match &self.cert_source {
            CertificateSource::Files { cert_path, key_path } => {
                if !Path::new(cert_path).exists() {
                    return Err(TlsError::CertNotFound(cert_path.clone()));
                }
                if !Path::new(key_path).exists() {
                    return Err(TlsError::KeyNotFound(key_path.clone()));
                }

                axum_server::tls_rustls::RustlsConfig::from_pem_file(
                    Path::new(cert_path),
                    Path::new(key_path),
                ).await.map_err(TlsError::Rustls)
            }
            CertificateSource::Auto => {
                // Auto-detect certificates
                let cert_path = detect_ssl_certificates()?;
                let key_path = std::env::var("SSL_KEY_PATH")
                    .unwrap_or_else(|_| cert_path.replace(".pem", ".key"));

                if !Path::new(&cert_path).exists() {
                    return Err(TlsError::CertNotFound(cert_path));
                }
                if !Path::new(&key_path).exists() {
                    return Err(TlsError::KeyNotFound(key_path));
                }

                axum_server::tls_rustls::RustlsConfig::from_pem_file(
                    Path::new(&cert_path),
                    Path::new(&key_path),
                ).await.map_err(TlsError::Rustls)
            }
            CertificateSource::LetsEncrypt { domain, email } => {
                // TODO: Implement Let's Encrypt ACME
                // For now, fall back to auto-detection
                tracing::warn!("Let's Encrypt not yet implemented, falling back to auto-detection");
                self.build_rustls_config().await
            }
        }
    }

    /// Check if TLS certificates are available
    pub fn certificates_available(&self) -> bool {
        match &self.cert_source {
            CertificateSource::Files { cert_path, key_path } => {
                Path::new(cert_path).exists() && Path::new(key_path).exists()
            }
            CertificateSource::Auto => detect_ssl_certificates().is_ok(),
            CertificateSource::LetsEncrypt { .. } => false, // Not implemented yet
        }
    }
}

impl Default for TlsConfig {
    fn default() -> Self {
        Self::auto()
    }
}

/// Detect SSL certificates via introspection
fn detect_ssl_certificates() -> Result<String, TlsError> {
    let cert_paths = [
        "/etc/ssl/certs/ssl-cert-snakeoil.pem",
        "/etc/ssl/certs/localhost.pem",
        "/etc/letsencrypt/live/localhost/cert.pem",
        "/etc/letsencrypt/live/localhost/fullchain.pem",
    ];

    for path in &cert_paths {
        if Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }

    // Try environment variables
    if let Ok(path) = std::env::var("SSL_CERT_PATH") {
        if Path::new(&path).exists() {
            return Ok(path);
        }
    }

    Err(TlsError::CertNotFound("No SSL certificates found".to_string()))
}

/// Certificate utilities
pub mod cert_utils {
    use super::*;

    /// Generate self-signed certificate for development
    pub fn generate_self_signed_cert(
        domain: &str,
        cert_path: &Path,
        key_path: &Path,
    ) -> Result<(), TlsError> {
        // This would use rcgen or similar to generate certs
        // For now, just return an error
        Err(TlsError::Io(std::io::Error::new(
            std::io::ErrorKind::Unsupported,
            "Self-signed certificate generation not yet implemented"
        )))
    }

    /// Validate certificate
    pub fn validate_certificate(cert_path: &Path) -> Result<(), TlsError> {
        if !cert_path.exists() {
            return Err(TlsError::CertNotFound(cert_path.display().to_string()));
        }

        // Basic validation - check if it's a valid PEM file
        let content = std::fs::read(cert_path)?;
        let content_str = String::from_utf8_lossy(&content);

        if !content_str.contains("-----BEGIN CERTIFICATE-----") {
            return Err(TlsError::InvalidCert("Not a valid PEM certificate".to_string()));
        }

        Ok(())
    }

    /// Get certificate expiration date
    pub fn get_cert_expiration(cert_path: &Path) -> Result<std::time::SystemTime, TlsError> {
        // This would parse the certificate and extract expiration
        // For now, just return an error
        Err(TlsError::Io(std::io::Error::new(
            std::io::ErrorKind::Unsupported,
            "Certificate expiration checking not yet implemented"
        )))
    }
}
