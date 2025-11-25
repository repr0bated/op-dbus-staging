//! Introspection logic for the chat module
//!
//! This module handles system introspection, SSL detection, and server configuration discovery.

use anyhow::Result;
use tracing::info;

/// Server configuration detected via introspection
pub struct ServerConfig {
    pub http_port: u16,
    pub https_port: u16,
    pub bind_host: String,
    pub public_host: String,
    pub https_enabled: bool,
    pub ssl_cert_path: String,
    pub ssl_key_path: String,
}

/// Tool: discover_system - Full system introspection
pub async fn register_discover_system() -> Result<()> {
    // This would register with a tool registry, but for chat we just use it directly
    Ok(())
}

/// Tool: detect_ssl_certificates - Detect SSL/TLS certificates via introspection
pub async fn register_detect_ssl_certificates() -> Result<()> {
    // This would register with a tool registry, but for chat we just use it directly
    Ok(())
}

/// Introspect system to detect server configuration
pub async fn introspect_server_config() -> ServerConfig {
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
