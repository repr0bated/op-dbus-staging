# 📖 MCP Memory Server - `open_nodes` Tool Help

## Overview

The `open_nodes` tool retrieves specific nodes (entities) and their relationships from the knowledge graph memory. This is useful when you know the exact entity names and want to see their details and connections.

## Tool: `open_nodes`

**Purpose**: Retrieve specific nodes and their relationships from the knowledge graph.

### Input Schema

```json
{
  "names": ["string (entity names)"]
}
```

- `names`: Array of entity names to retrieve (required)
- Each name must match an existing entity in the graph
- Returns the entity details plus all relationships (incoming and outgoing)

### Output

Returns an array of node objects, each containing:
- Entity information (name, type, observations)
- All relationships connected to that entity
- Related entities

## Usage Examples

### 1. Via MCP JSON-RPC (from browser console)

```javascript
// Open a single node
const result = await window.mcpClient.callTool('open_nodes', {
  names: ['Alice']
});

console.log(result);
```

### 2. Via MCP HTTP Request

```bash
curl -X POST http://localhost:8080/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "open_nodes",
      "arguments": {
        "names": ["Alice", "ProjectX"]
      }
    }
  }'
```

### 3. Via Chat Interface

In the chatbot web interface, you can ask:
```
"Open nodes for Alice and ProjectX"
```

Or use the MCP client directly:
```javascript
// In browser console
await window.mcpClient.callTool('open_nodes', {
  names: ['Alice', 'ProjectX', 'Seattle']
});
```

## Example Workflow

### Step 1: Create Entities

```javascript
// Create some entities first
await window.mcpClient.callTool('create_entities', {
  entities: [
    {
      name: 'Alice',
      entityType: 'person',
      observations: ['Lives in Seattle', 'Software engineer', 'Works on ProjectX']
    },
    {
      name: 'ProjectX',
      entityType: 'project',
      observations: ['Started in 2025', 'Uses Rust', 'Open source']
    },
    {
      name: 'Seattle',
      entityType: 'place',
      observations: ['City in Washington', 'Tech hub']
    }
  ]
});
```

### Step 2: Create Relations

```javascript
// Link entities together
await window.mcpClient.callTool('create_relations', {
  relations: [
    {
      from: 'Alice',
      to: 'Seattle',
      relationType: 'lives_in'
    },
    {
      from: 'Alice',
      to: 'ProjectX',
      relationType: 'works_on'
    }
  ]
});
```

### Step 3: Open Nodes

```javascript
// Retrieve Alice and all her relationships
const alice = await window.mcpClient.callTool('open_nodes', {
  names: ['Alice']
});

console.log('Alice details:', alice);
// Returns:
// - Alice's entity info (name, type, observations)
// - All relationships (lives_in Seattle, works_on ProjectX)
// - Related entities (Seattle, ProjectX)
```

### Step 4: Open Multiple Nodes

```javascript
// Open multiple nodes at once
const nodes = await window.mcpClient.callTool('open_nodes', {
  names: ['Alice', 'ProjectX', 'Seattle']
});

console.log('Multiple nodes:', nodes);
// Returns array with details for all three entities
```

## Comparison with Other Tools

| Tool | Use Case | Input |
|------|----------|-------|
| `open_nodes` | Get specific entities by name | Entity names (exact match) |
| `search_nodes` | Find entities by content | Search query (fuzzy match) |
| `read_graph` | Get entire graph | None |
| `create_entities` | Add new entities | Entity data |
| `add_observations` | Update existing entities | New facts |

## When to Use `open_nodes`

✅ **Use `open_nodes` when:**
- You know the exact entity name(s)
- You want to see all relationships for specific entities
- You need detailed information about known entities
- You're following up on previously created entities

❌ **Don't use `open_nodes` when:**
- You're searching for entities (use `search_nodes` instead)
- You want to see the entire graph (use `read_graph` instead)
- The entity names are unknown (use `search_nodes` first)

## Error Handling

```javascript
try {
  const result = await window.mcpClient.callTool('open_nodes', {
    names: ['NonExistentEntity']
  });
} catch (error) {
  console.error('Error:', error.message);
  // Entity not found or other error
}
```

## Integration with Chatbot

The chatbot can use `open_nodes` to recall information:

```
User: "What do we know about Alice?"
AI: [Uses open_nodes to retrieve Alice's details and relationships]
AI: "Alice is a software engineer who lives in Seattle and works on ProjectX..."
```

## Related Tools

- `search_nodes` - Find entities by search query
- `read_graph` - Get complete knowledge graph
- `create_entities` - Add new entities
- `create_relations` - Link entities together
- `add_observations` - Update entity facts

## Configuration

The memory server stores data in:
- **Default**: `memory.jsonl` in working directory
- **Custom**: Set `MEMORY_FILE_PATH` environment variable

## See Also

- `agents/AGENT-MEMORY-GRAPH.md` - Full memory agent documentation
- `MCP-CURSOR-SETUP.md` - MCP server setup guide
- `REMOTE_MCP_SERVER_RUST.md` - Remote server connection guide

