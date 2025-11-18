# WORKFLOW TAB - QUICK SUMMARY

## What Exists

**Frontend (95% Complete)**
- Beautiful 3-column UI with node palette, canvas, and properties panel
- Fully styled with CSS (all classes present)
- HTML with all necessary structure
- Some service visualization code (but not interactive workflow builder)

**Backend (40% Complete)**
- Express.js API server with basic endpoints
- Rust plugin system with workflow infrastructure
- PocketFlow library for orchestration
- D-Bus discovery and integration
- Example workflow definitions

## What's Missing - THE GAP

The Workflow tab is like a beautiful empty theatre - the stage and audience seating are built, but there's no play running.

**Frontend (app.js needs these 15+ methods)**:
```javascript
// Workflow management (7 methods)
createNewWorkflow()        // Create blank workflow
executeWorkflow()          // Run it
validateWorkflow()         // Check it
clearWorkflowCanvas()      // Reset
saveWorkflow()            // Persist
loadWorkflow()            // Retrieve
setWorkflowZoom()         // Zoom in/out

// Palette interaction (2 methods)
togglePaletteCategory()   // Expand/collapse categories
filterNodePalette()       // Search nodes

// Canvas interaction (6 methods)
onNodeDragStart()         // User drags node from palette
onCanvasDrop()           // User drops on canvas
onCanvasDragOver()       // Visual feedback while dragging
onCanvasMouseDown()      // Start moving node or drawing line
onCanvasMouseMove()      // Drag updates
onCanvasMouseUp()        // Release mouse
```

**Backend (API endpoints needed)**:
```
GET    /api/workflow/nodes           # List available node types
POST   /api/workflow/create          # Create new workflow
GET    /api/workflow/:id             # Get workflow
POST   /api/workflow/:id/validate    # Validate
POST   /api/workflow/:id/execute     # Run it
POST   /api/workflow/:id/save        # Save
DELETE /api/workflow/:id             # Delete
```

## Key Files

| File | Status | Action |
|------|--------|--------|
| src/mcp/web/index.html | ✓ Complete | No changes needed |
| src/mcp/web/styles.css | ✓ Complete | No changes needed |
| src/mcp/web/app.js | ✗ Incomplete | Add 15+ methods (~800 lines) |
| chat-server.js | ✓ Mostly complete | Add 8 workflow endpoints |
| src/mcp/workflows.rs | ✓ Exists | Can be leveraged |
| src/mcp/workflow_nodes.rs | ✓ Exists | Can be leveraged |
| src/state/plugin_workflow.rs | ✓ Exists | Can be leveraged |

## Architecture

```
Browser (app.js)              Express Server              Rust Backend
     ↓                              ↓                           ↓
[Workflow UI]    ──HTTP──>    [API endpoints]     ←–RPC/Event–→   [Execution]
  (needs code)               (needs endpoints)      (ready to use)
```

## Implementation Order

1. **Frontend Canvas** (2-3 days)
   - Drag nodes from palette to canvas
   - Render SVG nodes with ports
   - Draw connections between ports
   - Handle node properties form

2. **Frontend Storage** (1 day)
   - Save/load workflow to localStorage
   - Serialize node/edge data structure

3. **Backend Execution** (1-2 days)
   - REST endpoints for workflow CRUD
   - Validation logic
   - Execution handler
   - Result streaming

4. **Integration** (1 day)
   - Connect plugins as nodes
   - D-Bus service nodes
   - Agent integration

## Data Structure (what flows through the system)

```json
{
  "workflow": {
    "id": "uuid",
    "name": "My Workflow",
    "nodes": [
      { "id": "node-1", "type": "trigger", "x": 100, "y": 100, "config": {} },
      { "id": "node-2", "type": "dbus-method", "x": 300, "y": 100, "config": {} }
    ],
    "edges": [
      { "from": "node-1", "fromPort": "out", "to": "node-2", "toPort": "in" }
    ]
  }
}
```

## Available Node Types

**Pre-defined in HTML**:
- Triggers: Manual Start, D-Bus Signal
- D-Bus: Method Call, Get Property, Set Property
- Logic: Condition, Transform, Delay
- Output: Log Output, Notification

**Can be auto-generated from backend**:
- All registered plugins
- All discovered D-Bus services
- All available MCP agents

## Success Criteria

When complete, users should be able to:
1. Drag nodes from palette onto canvas
2. See them render as boxes with ports
3. Click ports and drag to connect nodes
4. Click a node to see/edit its properties
5. Click "Validate" to check the workflow
6. Click "Execute" to run it
7. See results in the output panel
8. Click "Save" to persist it
9. Click "Load" to retrieve it

## Bottom Line

The UI is a beautiful empty canvas. You need to fill it with functionality.
The good news: all the infrastructure is there, you're just filling in the JavaScript handlers and API endpoints.

Complexity: Medium (standard web UI work, no novel algorithms)
Time: 5-7 days total for one developer
Risk: Low (isolated feature, not affecting other parts)

