# 📝 Creating Observations in MCP Memory Server

## Quick Command

To create the observation "default programming language is rust":

### Option 1: Via Browser Console (Recommended)

Open `http://localhost:8080` in your browser, open the console (F12), and run:

```javascript
// First, check if "User Preferences" entity exists
const search = await window.mcpClient.callTool('search_nodes', {
  query: 'User Preferences'
});

if (search && search.nodes && search.nodes.length > 0) {
  // Entity exists - add observation
  await window.mcpClient.callTool('add_observations', {
    observations: [{
      entityName: 'User Preferences',
      contents: ['default programming language is rust']
    }]
  });
  console.log('✅ Observation added to existing entity');
} else {
  // Create new entity with observation
  await window.mcpClient.callTool('create_entities', {
    entities: [{
      name: 'User Preferences',
      entityType: 'concept',
      observations: ['default programming language is rust']
    }]
  });
  console.log('✅ New entity created with observation');
}
```

### Option 2: Via Node.js Script

```bash
node create-observation.js "default programming language is rust" "User Preferences"
```

### Option 3: Via MCP HTTP Request

```bash
curl -X POST http://localhost:8080/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_entities",
      "arguments": {
        "entities": [{
          "name": "User Preferences",
          "entityType": "concept",
          "observations": ["default programming language is rust"]
        }]
      }
    }
  }'
```

## One-Liner for Browser Console

```javascript
// Quick one-liner - creates entity if it doesn't exist, adds observation if it does
(async () => {
  const entityName = 'User Preferences';
  const observation = 'default programming language is rust';
  
  try {
    // Try to add to existing entity
    await window.mcpClient.callTool('add_observations', {
      observations: [{ entityName, contents: [observation] }]
    });
    console.log('✅ Added to existing entity');
  } catch (e) {
    // Entity doesn't exist, create it
    await window.mcpClient.callTool('create_entities', {
      entities: [{ name: entityName, entityType: 'concept', observations: [observation] }]
    });
    console.log('✅ Created new entity');
  }
})();
```

## Verify the Observation

```javascript
// Check if the observation was saved
const result = await window.mcpClient.callTool('open_nodes', {
  names: ['User Preferences']
});

console.log('Entity:', result);
```

## Alternative Entity Names

You can use different entity names:

- `"User Preferences"` - General preferences
- `"Programming Preferences"` - Programming-specific
- `"Default Settings"` - System defaults
- `"Project Settings"` - Project-specific settings

## Example: Multiple Observations

```javascript
await window.mcpClient.callTool('add_observations', {
  observations: [{
    entityName: 'User Preferences',
    contents: [
      'default programming language is rust',
      'prefers functional programming style',
      'uses cargo for package management'
    ]
  }]
});
```

