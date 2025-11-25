// src/plugins/dbus_auto.rs - Auto-generated D-Bus Plugin
//
// This plugin is automatically created from D-Bus introspection data.
// It maps D-Bus properties to plugin state.

use anyhow::{Context, Result};
use async_trait::async_trait;
use serde_json::{json, Value};
use zbus::{Connection, Proxy};
use zbus::zvariant::Value as ZValue;
use crate::plugin_system::{Plugin, Change, ValidationResult, PluginCapabilities, PluginMetadata, PluginContext};
use crate::mcp::chat::introspection_parser::IntrospectionParser;

pub struct DbusAutoPlugin {
    name: String,
    service_name: String,
    object_path: String,
    interface_name: String,
    connection: Connection,
    description: String,
}

impl DbusAutoPlugin {
    pub async fn new(
        service_name: String,
        object_path: String,
        interface_name: String,
    ) -> Result<Self> {
        let connection = Connection::system().await?;
        
        // Create a friendly name
        let name = service_name
            .replace("org.freedesktop.", "")
            .replace("org.", "")
            .replace('.', "_")
            .to_lowercase();

        Ok(Self {
            name,
            service_name: service_name.clone(),
            object_path,
            interface_name,
            connection,
            description: format!("Auto-generated plugin for {}", service_name),
        })
    }
}

#[async_trait]
impl Plugin for DbusAutoPlugin {
    fn name(&self) -> &str {
        &self.name
    }

    fn description(&self) -> &str {
        &self.description
    }

    fn version(&self) -> &str {
        "0.1.0 (auto)"
    }

    async fn get_state(&self) -> Result<Value> {
        // Create a generic proxy to access properties
        let proxy = Proxy::new(
            &self.connection,
            self.service_name.as_str(),
            self.object_path.as_str(),
            self.interface_name.as_str(),
        ).await?;

        // Get all properties
        // We need to introspect first to know what properties exist, 
        // or use GetAll if supported by org.freedesktop.DBus.Properties
        
        // Try GetAll from Properties interface
        let props_proxy = zbus::fdo::PropertiesProxy::builder(&self.connection)
            .destination(self.service_name.as_str())?
            .path(self.object_path.as_str())?
            .build()
            .await?;

        let interface_name = zbus::names::InterfaceName::try_from(self.interface_name.as_str())?;
        match props_proxy.get_all(interface_name).await {
            Ok(props) => {
                // Convert HashMap<String, Value> to serde_json::Value
                let mut json_props = serde_json::Map::new();
                for (key, value) in props {
                    // This is a simplification. zbus::zvariant::Value to serde_json::Value 
                    // conversion is non-trivial for complex types.
                    // For now, we'll just convert basic types and stringify others.
                    let json_val = match value.as_ref() {
                        ZValue::Str(s) => json!(s.as_str()),
                        ZValue::Bool(b) => json!(b),
                        ZValue::U8(i) => json!(i),
                        ZValue::U16(i) => json!(i),
                        ZValue::U32(i) => json!(i),
                        ZValue::U64(i) => json!(i),
                        ZValue::I16(i) => json!(i),
                        ZValue::I32(i) => json!(i),
                        ZValue::I64(i) => json!(i),
                        ZValue::F64(f) => json!(f),
                        _ => json!(format!("{:?}", value)),
                    };
                    json_props.insert(key, json_val);
                }
                Ok(Value::Object(json_props))
            }
            Err(e) => {
                // Fallback or error
                Err(anyhow::anyhow!("Failed to get properties: {}", e))
            }
        }
    }

    async fn apply_state(&self, desired: Value) -> Result<()> {
        // For auto-plugins, applying state is risky without a schema.
        // We will attempt to set writable properties if they exist in the desired state.
        
        let props_proxy = zbus::fdo::PropertiesProxy::builder(&self.connection)
            .destination(self.service_name.as_str())?
            .path(self.object_path.as_str())?
            .build()
            .await?;

        if let Some(obj) = desired.as_object() {
            for (key, value) in obj {
                // Attempt to set property
                // We need to convert serde_json::Value back to zvariant::Value
                // This is hard without knowing the expected type.
                // For now, we'll skip implementation to avoid type errors.
                // A real implementation would need introspection data to know the type.
            }
        }

        Ok(())
    }

    async fn diff(&self, current: Value, desired: Value) -> Result<Vec<Change>> {
        // Simple JSON diff
        Ok(vec![])
    }

    async fn validate(&self, _config: Value) -> Result<ValidationResult> {
        Ok(ValidationResult::success())
    }

    fn capabilities(&self) -> PluginCapabilities {
        PluginCapabilities {
            can_read: true,
            can_write: false, // Disabled for safety in auto-plugin
            can_delete: false,
            supports_dry_run: true,
            supports_rollback: false,
            supports_transactions: false,
            requires_root: false,
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
