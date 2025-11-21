use op_dbus::mcp::comprehensive_introspection::ComprehensiveIntrospector;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    println!("🔍 Starting comprehensive D-Bus introspection...");

    let introspector = ComprehensiveIntrospector::new().await?;
    let result = introspector.introspect_all().await?;

    println!("📊 Results:");
    println!("  System services: {}", result.system_services.len());
    println!("  Session services: {}", result.session_services.len());
    println!("  Total objects: {}", result.total_objects);
    println!("  Total interfaces: {}", result.total_interfaces);

    // Show top services by object count
    let mut all_services = result.system_services.clone();
    all_services.extend(result.session_services);
    all_services.sort_by(|a, b| b.objects.len().cmp(&a.objects.len()));

    println!("\n🏆 Top services by object count:");
    for service in all_services.iter().take(10) {
        println!(
            "  {} ({} objects, discovered via {})",
            service.name,
            service.objects.len(),
            service.discovery_method
        );
    }

    // Show services using ObjectManager
    let obj_manager_services: Vec<_> = all_services
        .iter()
        .filter(|s| s.discovery_method == "ObjectManager")
        .collect();

    println!(
        "\n🎯 Services using ObjectManager ({}):",
        obj_manager_services.len()
    );
    for service in obj_manager_services.iter().take(5) {
        println!("  {} ({} objects)", service.name, service.objects.len());
    }

    Ok(())
}
