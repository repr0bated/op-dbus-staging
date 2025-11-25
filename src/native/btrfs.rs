// src/native/btrfs.rs - Btrfs filesystem utilities
//
// Provides wrappers for Btrfs subvolume management.

use anyhow::{Context, Result};
use std::path::Path;
use tokio::process::Command;
use tracing::{debug, info};

/// Create a Btrfs subvolume at the specified path
pub async fn create_subvolume(path: &Path) -> Result<()> {
    if path.exists() {
        // Check if it's already a BTRFS subvolume
        let output = Command::new("btrfs")
            .args(["subvolume", "show", &path.to_string_lossy()])
            .output()
            .await;

        if output.is_ok() && output.unwrap().status.success() {
            debug!("BTRFS subvolume already exists: {}", path.display());
            return Ok(());
        } else {
            // Path exists but is not a subvolume, remove it
            if path.is_dir() {
                tokio::fs::remove_dir_all(path).await?;
            } else {
                tokio::fs::remove_file(path).await?;
            }
        }
    }

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    // Create BTRFS subvolume
    let output = Command::new("btrfs")
        .args(["subvolume", "create", &path.to_string_lossy()])
        .output()
        .await
        .context("Failed to execute btrfs command")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("btrfs subvolume create failed: {}", stderr);
    }

    info!("Created BTRFS subvolume: {}", path.display());
    Ok(())
}

/// Delete a Btrfs subvolume
pub async fn delete_subvolume(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }

    let output = Command::new("btrfs")
        .args(["subvolume", "delete", &path.to_string_lossy()])
        .output()
        .await
        .context("Failed to execute btrfs command")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("btrfs subvolume delete failed: {}", stderr);
    }

    info!("Deleted BTRFS subvolume: {}", path.display());
    Ok(())
}

/// Create a read-only snapshot of a subvolume
pub async fn create_snapshot(source: &Path, dest: &Path) -> Result<()> {
    // Ensure parent directory of dest exists
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let output = Command::new("btrfs")
        .args(["subvolume", "snapshot", "-r"])
        .arg(source)
        .arg(dest)
        .output()
        .await
        .context("Failed to execute btrfs command")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("btrfs snapshot create failed: {}", stderr);
    }

    info!("Created BTRFS snapshot: {} -> {}", source.display(), dest.display());
    Ok(())
}
