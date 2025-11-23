//! Introspective Gadget Demo
//!
//! Demonstrates the universal object inspector capabilities

use std::collections::HashMap;
use op_dbus::mcp::introspective_gadget::{IntrospectiveGadget, InspectionInput, InspectionSource};
use op_dbus::mcp::native_introspection::KnowledgeBase;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🕵️‍♂️ Introspective Gadget Demo - Universal Object Inspector");
    println!("========================================================");

    // Create knowledge base
    let knowledge_base = std::sync::Arc::new(tokio::sync::RwLock::new(KnowledgeBase {
        schemas: HashMap::new(),
        templates: HashMap::new(),
        patterns: vec![],
        validations: vec![],
    }));

    // Create the gadget
    let gadget = IntrospectiveGadget::new(knowledge_base).await?;

    println!("\n1️⃣ Inspecting Docker Container...");
    demo_docker_inspection(&gadget).await?;

    println!("\n2️⃣ Inspecting JSON Data...");
    demo_json_inspection(&gadget).await?;

    println!("\n3️⃣ Inspecting XML Data...");
    demo_xml_inspection(&gadget).await?;

    println!("\n4️⃣ Inspecting Legacy Binary Data...");
    demo_binary_inspection(&gadget).await?;

    println!("\n✨ Introspective Gadget Demo Complete!");
    println!("All inspected objects have been added to the knowledge base for future use.");

    Ok(())
}

async fn demo_docker_inspection(gadget: &IntrospectiveGadget) -> Result<(), Box<dyn std::error::Error>> {
    // Try to inspect a running container (if Docker is available)
    match gadget.inspect_docker_container("example_container").await {
        Ok(result) => {
            println!("✅ Successfully inspected Docker container!");
            println!("   Name: {}", result.inspection.name);
            println!("   Image: {}", result.inspection.image);
            println!("   Status: {}", result.inspection.status);
            println!("   Ports: {} mappings", result.inspection.ports.len());
            println!("   Processes: {} running", result.inspection.processes.len());
            println!("   Knowledge Base Entry: {}", result.knowledge_base_entry);
        }
        Err(e) => {
            println!("⚠️  Docker inspection failed (Docker may not be available): {}", e);
            println!("   This is expected if Docker isn't running or no containers exist.");
        }
    }

    Ok(())
}

async fn demo_json_inspection(gadget: &IntrospectiveGadget) -> Result<(), Box<dyn std::error::Error>> {
    // Example JSON data (like a configuration file)
    let json_data = r#"
    {
        "name": "example-service",
        "version": "1.0.0",
        "config": {
            "port": 8080,
            "host": "localhost",
            "features": ["auth", "metrics", "logging"]
        },
        "dependencies": [
            {"name": "database", "version": "2.1.0"},
            {"name": "cache", "version": "1.5.2"}
        ]
    }
    "#;

    let input = InspectionInput {
        source: InspectionSource::RawData {
            format_hint: Some("json".to_string()),
            description: "example service configuration".to_string(),
        },
        data: Some(json_data.to_string()),
        metadata: HashMap::new(),
    };

    let result = gadget.inspect_object(input).await?;

    println!("✅ Successfully inspected JSON configuration!");
    println!("   Detected Format: {}", result.detected_format);
    println!("   Inspection Time: {}ms", result.inspection_time_ms);
    println!("   Schema Properties: {}", result.schema.properties.len());
    println!("   Knowledge Base Entry: {}", result.knowledge_base_entry);

    // Show some schema details
    if let Some(config_prop) = result.schema.properties.get("config") {
        if let Some(nested) = &config_prop.nested_schema {
            println!("   Nested 'config' object has {} properties", nested.properties.len());
        }
    }

    Ok(())
}

async fn demo_xml_inspection(gadget: &IntrospectiveGadget) -> Result<(), Box<dyn std::error::Error>> {
    // Example XML data (like unknown XML from a random source)
    let xml_data = r#"
    <?xml version="1.0" encoding="UTF-8"?>
    <unknown-system xmlns:custom="http://example.com/custom">
        <metadata>
            <title>Unknown System Configuration</title>
            <version>3.14</version>
            <timestamp>2024-01-15T10:30:00Z</timestamp>
        </metadata>
        <components>
            <component id="comp1" type="processor" status="active">
                <settings mode="auto" priority="high"/>
            </component>
            <component id="comp2" type="storage" status="idle">
                <settings mode="manual" priority="low"/>
            </component>
        </components>
        <custom:extensions>
            <custom:feature name="advanced" enabled="true"/>
        </custom:extensions>
    </unknown-system>
    "#;

    let xml_inspection = gadget.inspect_xml_data(xml_data, "unknown XML configuration file").await?;

    println!("✅ Successfully inspected unknown XML data!");
    println!("   Root Element: {}", xml_inspection.root_element.as_deref().unwrap_or("unknown"));
    println!("   Namespaces Found: {}", xml_inspection.namespaces.len());
    println!("   Elements Analyzed: {}", xml_inspection.elements.len());
    println!("   Schema Generated: {} properties", xml_inspection.schema_generated.properties.len());
    println!("   Knowledge Base Entry: {}", xml_inspection.knowledge_base_entry);

    // Show namespace info
    for (prefix, uri) in &xml_inspection.namespaces {
        println!("   Namespace: {} -> {}", prefix, uri);
    }

    Ok(())
}

async fn demo_binary_inspection(gadget: &IntrospectiveGadget) -> Result<(), Box<dyn std::error::Error>> {
    // Create some example binary data (simulating legacy data like Apple Lisa disk)
    let mut binary_data = Vec::new();

    // Add some header bytes
    binary_data.extend_from_slice(&[0x4C, 0x49, 0x53, 0x41]); // "LISA" header
    binary_data.extend_from_slice(&[0x01, 0x00, 0x00, 0x00]); // Version

    // Add some ASCII strings
    binary_data.extend_from_slice(b"Hello from the Apple Lisa!");
    binary_data.push(0); // null terminator

    // Add some binary patterns
    let pattern = [0xAA, 0xBB, 0xCC, 0xDD];
    for _ in 0..5 {
        binary_data.extend_from_slice(&pattern);
    }

    // Add more strings
    binary_data.extend_from_slice(b"This is legacy data from 1983.");
    binary_data.push(0);

    let binary_inspection = gadget.inspect_legacy_data(&binary_data, "Apple Lisa disk image (1980s legacy)").await?;

    println!("✅ Successfully inspected legacy binary data!");
    println!("   File Size: {} bytes", binary_inspection.file_size);
    println!("   Entropy: {:.3}", binary_inspection.entropy);
    println!("   Strings Found: {}", binary_inspection.strings_found.len());
    println!("   Binary Patterns: {}", binary_inspection.patterns.len());
    println!("   Schema Generated: {} properties", binary_inspection.schema_generated.properties.len());
    println!("   Knowledge Base Entry: {}", binary_inspection.knowledge_base_entry);

    // Show some strings found
    println!("   Sample Strings:");
    for string in binary_inspection.strings_found.iter().take(3) {
        println!("     \"{}\"", string);
    }

    // Show patterns
    if let Some(first_pattern) = binary_inspection.patterns.first() {
        println!("   Most Common Pattern: {:02X?} (appears {} times)",
            &first_pattern.pattern, first_pattern.count);
    }

    Ok(())
}

