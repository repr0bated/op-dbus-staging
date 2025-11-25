// src/plugins/systemd.rs - Systemd plugin
//
// This plugin manages systemd services using systemctl.

use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::process::Command;
use crate::plugin_system::{Plugin, Change, ValidationResult, PluginCapabilities, PluginMetadata, PluginContext};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemdPlugin {
    // Configuration could include specific services to manage
    #[serde(default)]
    pub services: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceState {
    pub name: String,
    pub active_state: String,
    pub sub_state: String,
    pub load_state: String,
}

#[async_trait]
impl Plugin for SystemdPlugin {
    fn name(&self) -> &str {
        "systemd"
    }

    fn description(&self) -> &str {
        "Systemd service management"
    }

    fn version(&self) -> &str {
        "1.0.0"
    }

    async fn get_state(&self) -> Result<Value> {
        // If services list is empty, list all units? Or maybe just return empty?
        // For safety, let's just return the status of configured services if any,
        // or a default set if none.
        
        let services_to_check = if self.services.is_empty() {
            // Default to checking some common services if none specified
            vec!["dbus", "NetworkManager", "sshd"]
        } else {
            self.services.iter().map(|s| s.as_str()).collect()
        };

        let mut states = Vec::new();

        for service in services_to_check {
            let output = tokio::process::Command::new("systemctl")
                .arg("show")
                .arg(service)
                .arg("--property=ActiveState,SubState,LoadState")
                .output()
                .await?;

            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut active = "unknown".to_string();
                let mut sub = "unknown".to_string();
                let mut load = "unknown".to_string();

                for line in stdout.lines() {
                    if let Some((key, value)) = line.split_once('=') {
                        match key {
                            "ActiveState" => active = value.to_string(),
                            "SubState" => sub = value.to_string(),
                            "LoadState" => load = value.to_string(),
                            _ => {}
                        }
                    }
                }

                states.push(ServiceState {
                    name: service.to_string(),
                    active_state: active,
                    sub_state: sub,
                    load_state: load,
                });
            }
        }

        Ok(json!({
            "services": states
        }))
    }

    async fn apply_state(&self, desired: Value) -> Result<()> {
        // Expect desired state to contain a list of services and their desired state (active/inactive)
        // For now, let's support simple start/stop/restart commands via a "commands" field
        // or by inferring from "active_state".
        
        let desired_obj = desired.as_object().context("Desired state must be an object")?;
        
        if let Some(services) = desired_obj.get("services").and_then(|v| v.as_array()) {
            for service_val in services {
                let name = service_val.get("name").and_then(|v| v.as_str()).context("Service name missing")?;
                let desired_active = service_val.get("active_state").and_then(|v| v.as_str());

                if let Some(state) = desired_active {
                    match state {
                        "active" => {
                            self.manage_service(name, "start").await?;
                        }
                        "inactive" => {
                            self.manage_service(name, "stop").await?;
                        }
                        "reloading" => {
                            self.manage_service(name, "restart").await?;
                        }
                        _ => {}
                    }
                }
            }
        }

        Ok(())
    }

    async fn diff(&self, current: Value, desired: Value) -> Result<Vec<Change>> {
        // TODO: Implement diff logic
        Ok(vec![])
    }

    async fn validate(&self, _config: Value) -> Result<ValidationResult> {
        Ok(ValidationResult::success())
    }

    fn capabilities(&self) -> PluginCapabilities {
        PluginCapabilities {
            can_read: true,
            can_write: true,
            can_delete: false,
            supports_dry_run: true,
            supports_rollback: true,
            supports_transactions: false,
            requires_root: true,
            supported_platforms: vec!["linux".to_string()],
        }
    }

    async fn initialize(&mut self, _context: PluginContext) -> Result<()> {
        Ok(())
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

impl SystemdPlugin {
    async fn manage_service(&self, name: &str, action: &str) -> Result<()> {
        let output = tokio::process::Command::new("systemctl")
            .arg(action)
            .arg(name)
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to {} service {}: {}", action, name, stderr));
        }
        Ok(())
    }
}
