// Integration: Register introspection tools with existing MCP ToolRegistry
// This adds system discovery and hardware introspection to MCP

use anyhow::Result;
use serde_json::json;
use gethostname::gethostname;

use super::tool_registry::{DynamicToolBuilder, ToolContent, ToolRegistry, ToolResult};

/// Register all introspection tools with the MCP tool registry
pub async fn register_introspection_tools(registry: &ToolRegistry) -> Result<()> {
    // Tool 1: System introspection
    register_discover_system(registry).await?;

    // Tool 2: SSL certificate detection
    register_detect_ssl_certificates(registry).await?;

    Ok(())
}

/// Tool: discover_system - Full system introspection
async fn register_discover_system(registry: &ToolRegistry) -> Result<()> {
    let tool = DynamicToolBuilder::new("discover_system")
        .description("Introspect system hardware, CPU features, BIOS locks, D-Bus services, and configuration")
        .schema(json!({
            "type": "object",
            "properties": {
                "include_packages": {
                    "type": "boolean",
                    "description": "Include installed packages in discovery"
                },
                "detect_provider": {
                    "type": "boolean",
                    "description": "Detect and analyze ISP/cloud provider restrictions"
                }
            }
        }))
        .handler(|params| {
            Box::pin(async move {
                let include_packages = params
                    .get("include_packages")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                let detect_provider = params
                    .get("detect_provider")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);

                // Perform system introspection using system commands
                let result = json!({
                    "hostname": gethostname().to_string_lossy(),
                    "timestamp": chrono::Utc::now().timestamp(),
                    "system_info": "System introspection placeholder - implement actual discovery",
                    "include_packages": include_packages,
                    "detect_provider": detect_provider
                });

                Ok(ToolResult::success(ToolContent::json(result)))
            })
        })
        .build();

    registry.register_tool(Box::new(tool)).await?;
    Ok(())
}

/// Tool: detect_ssl_certificates - Detect SSL/TLS certificates via introspection
async fn register_detect_ssl_certificates(registry: &ToolRegistry) -> Result<()> {
    let tool = DynamicToolBuilder::new("detect_ssl_certificates")
        .description("Introspect system to detect SSL/TLS certificates (Cloudflare, Let's Encrypt, or self-signed). Returns certificate paths, domain, and HTTPS configuration.")
        .schema(json!({
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "description": "Optional domain name to check (defaults to system hostname/FQDN)"
                }
            }
        }))
        .handler(|params| {
            Box::pin(async move {
                // Get domain from params or detect from system
                let domain = params
                    .get("domain")
                    .and_then(|v| v.as_str())
                    .map(String::from)
                    .unwrap_or_else(|| {
                        // Detect FQDN from system
                        detect_fqdn().unwrap_or_else(|| {
                            gethostname().to_string_lossy().to_string()
                        })
                    });

                let (cert_path, key_path, https_enabled) = detect_ssl_certificates(&domain);

                let result = json!({
                    "domain": domain,
                    "certificate_path": cert_path,
                    "key_path": key_path,
                    "https_enabled": https_enabled,
                    "certificate_type": if cert_path.contains("letsencrypt") {
                        "letsencrypt"
                    } else if cert_path.contains("cloudflare") {
                        "cloudflare"
                    } else if cert_path.contains("ssl/certificate.crt") {
                        "self_signed"
                    } else {
                        "unknown"
                    },
                    "certificate_exists": std::path::Path::new(&cert_path).exists(),
                    "key_exists": std::path::Path::new(&key_path).exists(),
                });

                Ok(ToolResult::success(ToolContent::json(result)))
            })
        })
        .build();

    registry.register_tool(Box::new(tool)).await?;
    Ok(())
}

// Helper: Detect FQDN from system files
fn detect_fqdn() -> Option<String> {
    // Try /etc/hostname first
    if let Ok(contents) = std::fs::read_to_string("/etc/hostname") {
        let fqdn = contents.trim();
        if !fqdn.is_empty() && fqdn.contains('.') {
            return Some(fqdn.to_string());
        }
    }

    // Try /etc/hosts for FQDN
    if let Ok(contents) = std::fs::read_to_string("/etc/hosts") {
        let hostname = gethostname().to_string_lossy().to_string();
        for line in contents.lines() {
            if line.contains(&hostname) && line.contains('.') {
                // Extract domain from line like "127.0.0.1 hostname.domain.com hostname"
                if let Some(domain_part) = line.split_whitespace().find(|s| s.contains('.') && s.contains(&hostname)) {
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

// Helper: Detect SSL certificates via introspection (same logic as chat_main.rs)
fn detect_ssl_certificates(domain: &str) -> (String, String, bool) {
    // Extract domain from FQDN (remove subdomain if needed, or use as-is)
    let cert_domain = if domain.contains('.') {
        domain.to_string()
    } else {
        format!("{}.local", domain)
    };

    // Try Cloudflare certificates first (common locations)
    // Check for domain-specific certificates in standard SSL directories (Proxmox pattern)
    if cert_domain.contains("proxmox") && cert_domain.contains("ghostbridge") {
        let proxmox_cert = "/etc/ssl/certs/proxmox-ghostbridge.crt";
        let proxmox_key = "/etc/ssl/private/proxmox-ghostbridge.key";
        if std::path::Path::new(proxmox_cert).exists() && std::path::Path::new(proxmox_key).exists() {
            return (proxmox_cert.to_string(), proxmox_key.to_string(), true);
        }
    }

    // Try standard Cloudflare paths
    let cloudflare_paths: Vec<(&str, &str, &str)> = vec![
        // Standard Cloudflare origin certificate locations
        ("/etc/ssl/cloudflare", "origin.pem", "origin.key"),
        ("/etc/cloudflare", "cert.pem", "key.pem"),
        ("/etc/ssl/certs/cloudflare", "origin.pem", "origin.key"),
        // Common alternative names
        ("/etc/ssl/cloudflare", "cert.pem", "key.pem"),
        ("/etc/ssl/cloudflare", "fullchain.pem", "privkey.pem"),
    ];

    for (base_path, cert_file, key_file) in cloudflare_paths {
        let cert_path = format!("{}/{}", base_path, cert_file);
        let key_path = format!("{}/{}", base_path, key_file);

        if std::path::Path::new(&cert_path).exists() && std::path::Path::new(&key_path).exists() {
            return (cert_path, key_path, true);
        }
    }

    // Try domain-specific Cloudflare paths
    let domain_paths = vec![
        format!("/etc/ssl/cloudflare/{}", cert_domain),
        format!("/etc/cloudflare/{}", cert_domain),
    ];

    for base_path in domain_paths {
        let cert_path = format!("{}/cert.pem", base_path);
        let key_path = format!("{}/key.pem", base_path);

        if std::path::Path::new(&cert_path).exists() && std::path::Path::new(&key_path).exists() {
            return (cert_path, key_path, true);
        }
    }

    // Try Let's Encrypt paths
    let letsencrypt_base = "/etc/letsencrypt/live";
    let cert_path = format!("{}/{}/fullchain.pem", letsencrypt_base, cert_domain);
    let key_path = format!("{}/{}/privkey.pem", letsencrypt_base, cert_domain);

    if std::path::Path::new(&cert_path).exists() && std::path::Path::new(&key_path).exists() {
        return (cert_path, key_path, true);
    }

    // Try alternative Let's Encrypt path (with subdomain)
    let parts: Vec<&str> = cert_domain.split('.').collect();
    if parts.len() > 1 {
        let main_domain = parts[1..].join(".");
        let alt_cert_path = format!("{}/{}/fullchain.pem", letsencrypt_base, main_domain);
        let alt_key_path = format!("{}/{}/privkey.pem", letsencrypt_base, main_domain);

        if std::path::Path::new(&alt_cert_path).exists() && std::path::Path::new(&alt_key_path).exists() {
            return (alt_cert_path, alt_key_path, true);
        }
    }

    // Check for self-signed certificates in common locations
    let self_signed_cert = "./ssl/certificate.crt";
    let self_signed_key = "./ssl/private.key";

    if std::path::Path::new(self_signed_cert).exists() && std::path::Path::new(self_signed_key).exists() {
        return (self_signed_cert.to_string(), self_signed_key.to_string(), true);
    }

    // No certificates found via introspection
    (self_signed_cert.to_string(), self_signed_key.to_string(), false)
}