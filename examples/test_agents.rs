use op_dbus::mcp::embedded_agents;

fn main() {
    let agents = embedded_agents::load_comprehensive_agents();
    println!("✅ Loaded {} comprehensive agents", agents.len());

    // Show first few agents
    let mut count = 0;
    for (uri, resource) in agents.iter() {
        if count < 5 {
            println!("  - {}: {}", uri, resource.name);
            count += 1;
        }
    }

    if agents.len() > 5 {
        println!("  ... and {} more agents", agents.len() - 5);
    }
}
