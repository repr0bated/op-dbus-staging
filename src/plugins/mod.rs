// src/plugins/mod.rs - Plugin modules

pub mod dbus_auto;
pub mod network;
pub mod systemd;

#[cfg(feature = "packagekit")]
pub mod packagekit;

// Export plugin types
pub use network::NetworkPlugin;

#[cfg(feature = "packagekit")]
pub use packagekit::PackageKitPlugin;
