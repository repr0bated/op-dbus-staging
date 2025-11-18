# Workflow Tab - Implementation Reference Guide

## File Locations (Absolute Paths)

### Frontend Files
- **Main HTML**: `/home/user/op-dbus-staging/src/mcp/web/index.html`
- **Main JavaScript**: `/home/user/op-dbus-staging/src/mcp/web/app.js`
- **Styles**: `/home/user/op-dbus-staging/src/mcp/web/styles.css`

### Backend Files
- **Chat Server**: `/home/user/op-dbus-staging/chat-server.js`
- **Rust Workflows**: `/home/user/op-dbus-staging/src/mcp/workflows.rs`
- **Rust Workflow Nodes**: `/home/user/op-dbus-staging/src/mcp/workflow_nodes.rs`
- **Rust Plugin Workflows**: `/home/user/op-dbus-staging/src/state/plugin_workflow.rs`

---

## Frontend Implementation Checklist

### In app.js - MCPControlCenter Class

These methods need to be added to the `MCPControlCenter` class:

#### 1. Workflow Management Methods
```javascript
createNewWorkflow() {
    // Initialize new workflow object
    // Clear canvas
    // Reset node counter
    // Show canvas hint
}

executeWorkflow() {
    // Get current workflow
    // Validate connectivity
    // POST to /api/workflow/execute
    // Handle response
    // Display results
}

validateWorkflow() {
    // Check all nodes have required inputs connected
    // Check data type compatibility
    // Check for cycles
    // Display validation results
}

clearWorkflowCanvas() {
    // Reset canvas to empty state
    // Clear all nodes and edges
    // Reset workflow object
}

saveWorkflow() {
    // Get workflow name (prompt)
    // POST to /api/workflow/save
    // OR localStorage.setItem()
    // Show success message
}

loadWorkflow() {
    // Show file picker or list
    // GET from /api/workflow/list
    // OR localStorage.getItem()
    // Render loaded workflow
}

setWorkflowZoom(level) {
    // Apply CSS transform scale
    // Save zoom level
}
```

#### 2. Palette Methods
```javascript
togglePaletteCategory(categoryId) {
    // Find category div
    // Toggle display of items
    // Rotate toggle indicator
}

filterNodePalette(searchText) {
    // Filter nodes by text
    // Show/hide matching nodes
    // Update visibility
}
```

#### 3. Canvas Event Handlers
```javascript
onNodeDragStart(event) {
    // Store nodeType from data-node-type attribute
    // Set drag image
    // event.dataTransfer.setData()
}

onCanvasDrop(event) {
    // Get drop coordinates
    // Get node type from dataTransfer
    // Create node element
    // Render to canvas
    // Add to nodes array
}

onCanvasDragOver(event) {
    // event.preventDefault()
    // event.dataTransfer.dropEffect = "move"
    // Visual feedback (cursor change)
}

onCanvasMouseDown(event) {
    // Detect click on node vs port vs canvas
    // If node: start drag (update position)
    // If port: start connection (draw line)
    // If canvas: start selection box
}

onCanvasMouseMove(event) {
    // If dragging node: update node.x and node.y
    // If drawing connection: update line preview
    // Render updates
}

onCanvasMouseUp(event) {
    // Stop dragging/drawing
    // If connection ended on port: create edge
    // Otherwise: cancel
}
```

#### 4. Workflow Data Structure (add to constructor)
```javascript
this.currentWorkflow = {
    id: null,
    name: "Untitled Workflow",
    nodes: [],        // [{id, type, x, y, config, label}]
    edges: [],        // [{from, to, fromPort, toPort}]
    nodeCounter: 0
};

this.workflowNodes = [];  // Available node types from backend
this.selectedNode = null; // Currently selected for editing
```

#### 5. Node Rendering Helper Methods
```javascript
renderNode(node) {
    // Create SVG group with rect, text, ports
    // Add to nodes-layer
    // Add event listeners (click for select, drag to move)
}

renderEdge(edge) {
    // Create SVG line from source port to target port
    // Add to connections-layer
    // Add delete handler
}

renderNodeProperties(node) {
    // Generate form from node type config_schema
    // Populate properties-content div
    // Add change handlers
}

deleteNode(nodeId) {
    // Remove from nodes array
    // Remove edges connected to it
    // Remove from canvas
    // Render updates
}

deleteEdge(edgeId) {
    // Remove from edges array
    // Remove from canvas
    // Render updates
}
```

#### 6. Validation Methods
```javascript
validateWorkflow() {
    let valid = true;
    let errors = [];
    
    // Check each node has required inputs
    // Check data types match
    // Check no cycles
    // Check at least one trigger
    
    return {valid, errors};
}

checkNodeInputs(node) {
    // Get node type definition
    // Check all required inputs are connected
    // Return boolean
}

checkDataTypeCompatibility(fromPort, toPort) {
    // Get port types
    // Return boolean if compatible
}

detectCycles() {
    // DFS to detect cycles in graph
    // Return list of cycles if found
}
```

---

## Backend Implementation Checklist

### In chat-server.js - New API Endpoints

Add these routes to the Express app:

#### 1. Node Discovery
```javascript
app.get('/api/workflow/nodes', async (req, res) => {
    // Call Rust discover_workflow_nodes()
    // Return array of WorkflowNode objects
    // {id, name, type, category, icon, inputs[], outputs[], config_schema}
});

app.get('/api/workflow/nodes/:type', async (req, res) => {
    // Get specific node type definition
    // Return WorkflowNode
});
```

#### 2. Workflow CRUD
```javascript
app.post('/api/workflow/create', async (req, res) => {
    // Create new workflow object
    // Assign UUID
    // Save to storage
    // Return workflow with id
});

app.get('/api/workflow/:id', async (req, res) => {
    // Load workflow from storage
    // Return workflow definition
});

app.post('/api/workflow/:id/save', async (req, res) => {
    // Save workflow definition
    // Validate JSON structure
    // Update timestamp
    // Return success
});

app.delete('/api/workflow/:id', async (req, res) => {
    // Delete workflow from storage
    // Return success
});

app.get('/api/workflow/list', async (req, res) => {
    // List all saved workflows
    // Return [{id, name, modified, ...}]
});
```

#### 3. Workflow Operations
```javascript
app.post('/api/workflow/:id/validate', async (req, res) => {
    // Check node connectivity
    // Check data type compatibility
    // Check for cycles
    // Return {valid: bool, errors: []}
});

app.post('/api/workflow/:id/execute', async (req, res) => {
    // Load workflow
    // Validate
    // Execute nodes in order
    // Stream results back
    // Collect node results
    // Return execution summary
});
```

#### 4. Workflow Storage Options
- Option A: localStorage in browser (simplest, no persistence across sessions)
- Option B: JSON files in `/home/user/op-dbus-staging/workflows/` directory
- Option C: In-memory map in Node.js (volatile, lost on restart)
- Option D: SQLite database (recommended for production)

---

## CSS Classes Reference

All these exist in styles.css and are ready to use:

```css
.workflow-builder              /* Main container */
.workflow-palette              /* Left sidebar */
.palette-category              /* Category section */
.palette-category-header       /* Category title (clickable) */
.palette-category-items        /* Nodes in category */
.palette-node                  /* Individual node in palette */
.workflow-canvas-container     /* Canvas wrapper */
.workflow-canvas               /* SVG element */
.canvas-hint                   /* Placeholder text */
.workflow-node                 /* Rendered node on canvas */
.workflow-node:hover           /* Hover effect */
.node-port                     /* Input/output port */
.workflow-connection           /* Line between nodes */
.workflow-properties           /* Right panel */
.properties-header             /* Header */
.properties-content            /* Form content */
.property-group                /* Individual property */
.workflow-output               /* Output panel */
.output-header                 /* Output header */
.output-content                /* Output logs */
```

---

## HTML Element IDs to Use

```html
<!-- Workflow section -->
id="workflow"                          <!-- Main section -->

<!-- Canvas -->
id="workflow-canvas"                   <!-- SVG element -->
id="connections-layer"                 <!-- SVG group for edges -->
id="nodes-layer"                       <!-- SVG group for nodes -->
id="canvas-hint"                       <!-- Placeholder div -->

<!-- Palette -->
id="node-palette"                      <!-- Palette container -->
id="node-filter"                       <!-- Search input -->
id="palette-triggers"                  <!-- Trigger category items -->
id="palette-dbus"                      <!-- D-Bus category items -->
id="palette-logic"                     <!-- Logic category items -->
id="palette-output"                    <!-- Output category items -->

<!-- Properties -->
id="node-properties"                   <!-- Properties panel -->

<!-- Buttons & Controls -->
id="btn-execute-workflow"              <!-- Execute button -->
id="workflow-zoom"                     <!-- Zoom dropdown -->

<!-- Output -->
id="workflow-output"                   <!-- Output panel -->
id="workflow-output-content"           <!-- Output content area -->
```

---

## Event Handlers to Implement

### HTML Attributes Already in Place
```html
onclick="window.mcp.createNewWorkflow()"
onclick="window.mcp.executeWorkflow()"
onclick="window.mcp.validateWorkflow()"
onclick="window.mcp.clearWorkflowCanvas()"
onclick="window.mcp.saveWorkflow()"
onclick="window.mcp.loadWorkflow()"
onchange="window.mcp.setWorkflowZoom(this.value)"

onclick="window.mcp.togglePaletteCategory('triggers')"
onclick="window.mcp.togglePaletteCategory('dbus')"
onclick="window.mcp.togglePaletteCategory('logic')"
onclick="window.mcp.togglePaletteCategory('output')"

oninput="window.mcp.filterNodePalette(this.value)"

ondragstart="window.mcp.onNodeDragStart(event)"
ondrop="window.mcp.onCanvasDrop(event)"
ondragover="window.mcp.onCanvasDragOver(event)"
onmousedown="window.mcp.onCanvasMouseDown(event)"
onmousemove="window.mcp.onCanvasMouseMove(event)"
onmouseup="window.mcp.onCanvasMouseUp(event)"
```

---

## Data Flow Diagrams

### Creating a Workflow Node
```
User drags node from palette
          ↓
onNodeDragStart(event)
  - Extract data-node-type
  - Store in event.dataTransfer
          ↓
onCanvasDrop(event)
  - Get drop coordinates (clientX/Y → canvas coords)
  - Create node object: {id, type, x, y, config, label}
  - Add to this.currentWorkflow.nodes
  - Call renderNode()
          ↓
renderNode()
  - Create SVG elements: <g><rect/><text/><circle/><circle/></g>
  - Add event listeners: click for select, mousedown for drag
  - Append to nodes-layer
```

### Connecting Nodes
```
User clicks on output port and drags to input port
          ↓
onCanvasMouseDown() - on port
  - Detect it's a port
  - Start connection drawing
          ↓
onCanvasMouseMove()
  - Draw line from source port to cursor
  - Highlight target ports (show they're valid destinations)
          ↓
onCanvasMouseUp() - on target port
  - Create edge object: {from, to, fromPort, toPort}
  - Add to this.currentWorkflow.edges
  - Call renderEdge()
          ↓
renderEdge()
  - Create SVG line <line/>
  - Add event listener for delete
  - Append to connections-layer
```

### Saving Workflow
```
User clicks Save button
          ↓
saveWorkflow()
  - Prompt for name
  - POST this.currentWorkflow to /api/workflow/save
          ↓
Backend receives
  - Validate JSON structure
  - Assign UUID if new
  - Save to storage (file, db, etc.)
          ↓
Frontend receives response
  - Update this.currentWorkflow.id
  - Show success toast
  - Update window title
```

---

## Testing Checklist

### Unit Tests (Frontend)
- [ ] Node creation from palette
- [ ] Node rendering on canvas
- [ ] Edge creation between ports
- [ ] Workflow serialization (to JSON)
- [ ] Workflow deserialization (from JSON)
- [ ] Validation logic
- [ ] Category filtering
- [ ] Zoom functionality

### Integration Tests
- [ ] Drag node from palette → renders on canvas
- [ ] Draw connection → creates edge
- [ ] Click node → shows properties
- [ ] Edit properties → updates node config
- [ ] Save → persists to storage
- [ ] Load → restores from storage
- [ ] Execute → runs on backend

### End-to-End Tests
- [ ] Create workflow with 2 nodes
- [ ] Connect them
- [ ] Save it
- [ ] Reload page
- [ ] Load workflow
- [ ] Execute it
- [ ] See results

---

## Common Pitfalls to Avoid

1. **Coordinate System**
   - Canvas coordinates != screen coordinates
   - Need to translate mouse events (screenX → canvasX)
   - account for scroll and zoom

2. **SVG Rendering**
   - SVG uses xmlns namespace
   - Elements need proper event listeners
   - Paths vs lines vs polygons have different behavior

3. **Data Consistency**
   - Keep nodes array and node elements in sync
   - When deleting, update both
   - When moving, update both

4. **Event Bubbling**
   - Stop propagation on canvas to prevent conflicts
   - Node events should not bubble to canvas
   - Port events should not bubble to node

5. **Performance**
   - Re-rendering everything on every mouse move is slow
   - Only update changed elements
   - Use requestAnimationFrame for smooth updates

6. **Type Checking**
   - Validate data types before connecting ports
   - Show user-friendly error messages
   - Don't allow invalid connections

---

## Example Node Type (from backend)

```json
{
  "id": "dbus-method-call",
  "name": "D-Bus Method Call",
  "type": "dbus-method",
  "category": "D-Bus Calls",
  "icon": "🔧",
  "description": "Call a method on a D-Bus service",
  "inputs": [
    {
      "id": "trigger",
      "name": "Trigger",
      "data_type": "trigger",
      "required": true,
      "description": "Signal to execute this method"
    }
  ],
  "outputs": [
    {
      "id": "result",
      "name": "Result",
      "data_type": "object",
      "required": false,
      "description": "Method return value"
    },
    {
      "id": "error",
      "name": "Error",
      "data_type": "string",
      "required": false,
      "description": "Error message if call failed"
    }
  ],
  "config_schema": {
    "type": "object",
    "properties": {
      "service": {
        "type": "string",
        "description": "D-Bus service name"
      },
      "object": {
        "type": "string",
        "description": "D-Bus object path"
      },
      "interface": {
        "type": "string",
        "description": "D-Bus interface name"
      },
      "method": {
        "type": "string",
        "description": "Method name"
      },
      "args": {
        "type": "array",
        "description": "Method arguments",
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "type": {"type": "string"},
            "value": {}
          }
        }
      }
    }
  },
  "default_config": {
    "service": "",
    "object": "",
    "interface": "",
    "method": "",
    "args": []
  }
}
```

---

## Next Steps

1. Read WORKFLOW-TAB-ANALYSIS.md for complete details
2. Start with Phase 1: Canvas & Node Rendering
3. Implement methods in order listed above
4. Test each phase before moving to next
5. Use browser DevTools to debug
6. Refer to existing code patterns in app.js for style consistency

