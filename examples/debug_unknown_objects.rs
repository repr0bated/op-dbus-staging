use op_dbus::mcp::comprehensive_introspection::ComprehensiveIntrospector;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    let introspector = ComprehensiveIntrospector::new().await?;
    let result = introspector.introspect_all().await?;

    // Find non-introspectable objects
    let mut unknown_objects = Vec::new();

    for service in &result.system_services {
        for object in &service.objects {
            if !object.introspectable || object.interfaces.is_empty() {
                unknown_objects.push((
                    service.name.clone(),
                    object.path.clone(),
                    object.introspectable,
                ));
            }
        }
    }

    for service in &result.session_services {
        for object in &service.objects {
            if !object.introspectable || object.interfaces.is_empty() {
                unknown_objects.push((
                    service.name.clone(),
                    object.path.clone(),
                    object.introspectable,
                ));
            }
        }
    }

    println!(
        "🔍 Unknown/Non-introspectable objects: {}",
        unknown_objects.len()
    );

    if !unknown_objects.is_empty() {
        println!("\n❓ First 20 unknown objects:");
        for (service, path, introspectable) in unknown_objects.iter().take(20) {
            let status = if *introspectable {
                "no interfaces"
            } else {
                "not introspectable"
            };
            println!("  {} {} ({})", service, path, status);
        }

        // Group by service
        let mut by_service = std::collections::HashMap::new();
        for (service, _path, _) in &unknown_objects {
            *by_service.entry(service.clone()).or_insert(0) += 1;
        }

        println!("\n📊 Unknown objects by service:");
        let mut sorted: Vec<_> = by_service.into_iter().collect();
        sorted.sort_by(|a, b| b.1.cmp(&a.1));

        for (service, count) in sorted.iter().take(10) {
            println!("  {}: {} unknown objects", service, count);
        }
    }

    Ok(())
}
