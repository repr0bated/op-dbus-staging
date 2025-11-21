use op_dbus::mcp::embedded_agents::ComprehensiveAgents;

fn main() {
    let mut total_files = 0;
    let mut md_files = 0;
    let mut agent_md_files = 0;
    let mut loaded_agents = 0;

    println!("🔍 Debugging embedded agents...");

    for file in ComprehensiveAgents::iter() {
        let file_path = file.as_ref();
        total_files += 1;

        if file_path.ends_with(".md") {
            md_files += 1;

            if file_path.contains("/agents/") {
                agent_md_files += 1;

                if let Some(_content) = ComprehensiveAgents::get(file_path) {
                    loaded_agents += 1;
                } else {
                    println!("❌ Failed to load: {}", file_path);
                }
            }
        }
    }

    println!("📊 Results:");
    println!("  Total files embedded: {}", total_files);
    println!("  Markdown files: {}", md_files);
    println!("  Agent markdown files: {}", agent_md_files);
    println!("  Successfully loaded: {}", loaded_agents);

    if agent_md_files != loaded_agents {
        println!(
            "⚠️  {} files failed to load",
            agent_md_files - loaded_agents
        );
    }
}
