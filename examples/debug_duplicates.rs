use op_dbus::mcp::embedded_agents::ComprehensiveAgents;
use std::collections::HashMap;

fn main() {
    let mut agent_names: HashMap<String, String> = HashMap::new();
    let mut duplicates = Vec::new();

    println!("🔍 Checking for duplicate agent names...");

    for file in ComprehensiveAgents::iter() {
        let file_path = file.as_ref();

        if file_path.ends_with(".md") && file_path.contains("/agents/") {
            let agent_name = file_path
                .split('/')
                .last()
                .unwrap_or("unknown")
                .strip_suffix(".md")
                .unwrap_or("unknown");

            if let Some(existing_path) = agent_names.get(agent_name) {
                duplicates.push((
                    agent_name.to_string(),
                    existing_path.clone(),
                    file_path.to_string(),
                ));
            } else {
                agent_names.insert(agent_name.to_string(), file_path.to_string());
            }
        }
    }

    println!("📊 Results:");
    println!("  Unique agent names: {}", agent_names.len());
    println!(
        "  Total agent files: {}",
        agent_names.len() + duplicates.len()
    );
    println!("  Duplicates found: {}", duplicates.len());

    if !duplicates.is_empty() {
        println!("\n🔄 Duplicate agent names:");
        for (name, path1, path2) in duplicates {
            println!("  '{}' appears in:", name);
            println!("    - {}", path1);
            println!("    - {}", path2);
        }
    }
}
