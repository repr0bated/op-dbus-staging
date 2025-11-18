# MCP Web Interface - Workflow Tab Comprehensive Overview

## 1. PROJECT STRUCTURE

### Frontend
- **Location**: `/home/user/op-dbus-staging/src/mcp/web/`
- **Files**:
  - `index.html` - Main UI with all sections including Workflow tab
  - `app.js` - Frontend JavaScript application (53KB)
  - `styles.css` - Styling for all components (27KB)
  - `chat.html`, `chat.js`, `chat-styles.css` - Chat interface
  - `netmaker_chat.html` - Network-specific chat

### Backend
- **Main Server**: `/home/user/op-dbus-staging/chat-server.js` - Express.js server (port 8080)
- **Rust Modules**:
  - `/home/user/op-dbus-staging/src/mcp/workflows.rs` - MCP workflow definitions
  - `/home/user/op-dbus-staging/src/mcp/workflow_nodes.rs` - Workflow node discovery
  - `/home/user/op-dbus-staging/src/state/plugin_workflow.rs` - Plugin workflow system
  - `/home/user/op-dbus-staging/src/webui/server.rs` - Alternative web server (port 9573)

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6), HTML5, CSS3 (no frameworks)
- **Backend**: 
  - Node.js with Express.js for chat/API server
  - Rust (Axum) for the op-dbus control panel
  - PocketFlow library for workflow orchestration
- **Dependencies**: axios, cors, ws (WebSocket), @google/generative-ai

---

## 2. WORKFLOW TAB UI STRUCTURE

### HTML Section (index.html, lines 361-535)
The workflow builder consists of THREE main sections:

#### A. Header Controls (lines 363-404)
```
- "New Workflow" button (creates new)
- "Execute" button (disabled until workflow is valid)
- "Validate" button
- "Clear" button
- "Save" button
- "Load" button
- Zoom level dropdown (50%, 75%, 100%, 125%, 150%)
```

#### B. Three-Column Layout
```
┌─────────────────────────────────────────────────────┐
│  LEFT: Node Palette    │  CENTER: Canvas    │ RIGHT: Properties
├─────────────────────────────────────────────────────┤
│ • Categories (collapsible):    │ Grid-based    │ Node config
│   - ⚡ Triggers         │ workspace      │ form when node
│   - 📞 D-Bus Calls     │ with nodes    │ is selected
│   - 🔀 Logic            │ draggable     │
│   - 📤 Output           │ between       │
│                        │ ports         │
└─────────────────────────────────────────────────────┘
```

#### C. Left Sidebar: Node Palette
Contains draggable node types:

**Triggers**:
- Manual Start (▶️)
- D-Bus Signal (📡)

**D-Bus Calls**:
- Method Call (🔧)
- Get Property (📋)
- Set Property (✏️)

**Logic**:
- Condition (❓)
- Transform (🔄)
- Delay (⏱️)

**Output**:
- Log Output (📝)
- Notification (🔔)

#### D. Center: Canvas (SVG-based)
- Drag-and-drop workspace
- Grid background (20px cells)
- Shows placeholder when empty
- Contains:
  - `connections-layer`: Lines between nodes
  - `nodes-layer`: Actual node elements

#### E. Right Sidebar: Properties Panel
- Shows when a node is selected
- Displays node-specific configuration form
- Placeholder text when nothing selected

#### F. Execution Output Panel
- Initially hidden
- Shows logs/output when workflow executes

---

## 3. MISSING FUNCTIONALITY - FRONTEND (app.js)

### Methods NOT Implemented in app.js

The following methods are CALLED in HTML but NOT DEFINED:

```javascript
// Workflow Builder Methods (MISSING)
window.mcp.createNewWorkflow()           // Line 366 in HTML
window.mcp.executeWorkflow()            // Line 372
window.mcp.validateWorkflow()           // Line 378
window.mcp.clearWorkflowCanvas()        // Line 384
window.mcp.saveWorkflow()               // Line 390
window.mcp.loadWorkflow()               // Line 393
window.mcp.setWorkflowZoom(value)       // Line 396 (onchange)

// Palette Operations (MISSING)
window.mcp.togglePaletteCategory(id)    // Line 415 (onclick)
window.mcp.filterNodePalette(value)     // Line 411 (oninput)

// Canvas Drag/Drop (MISSING)
window.mcp.onNodeDragStart(event)       // Line 420, 424, 437, etc.
window.mcp.onCanvasDrop(event)          // Line 495
window.mcp.onCanvasDragOver(event)      // Line 496
window.mcp.onCanvasMouseDown(event)     // Line 497
window.mcp.onCanvasMouseMove(event)     // Line 498
window.mcp.onCanvasMouseUp(event)       // Line 499
```

### Existing Workflow Code (Partial)

The app.js DOES have some workflow visualization code (lines 1073-1425):

```javascript
// PARTIALLY IMPLEMENTED
window.generateWorkflow()              // Line 1077 - Service visualization
window.resetWorkflowView()             // Line 1107 - Clear canvas
window.changeLayout()                  // Line 1123 - Layout switching
function generateWorkflowData(services) // Line 1129 - Node/edge generation
function applyLayout()                  // Line 1225 - Layout algorithms
function applyHierarchicalLayout()      // Line 1245
function applyCircularLayout()          // Line 1272
function applyForceLayout()             // Line 1284
function renderWorkflow()               // Line 1350 - SVG rendering
```

These functions are designed to VISUALIZE discovered services as a graph,
NOT to implement an interactive workflow builder.

---

## 4. UI ELEMENTS WITHOUT FUNCTIONALITY

The following UI elements exist but lack backend support:

| Element | Type | Current State | Needs |
|---------|------|---------------|-------|
| Node Palette (4 categories) | Sidebar | Styled, draggable | Drag handlers |
| Canvas (SVG) | Center | Grid visible, empty | Drop handlers, rendering |
| Properties Panel | Right sidebar | Styled, empty | Property form generation |
| Zoom Control | Dropdown | Styled | Zoom implementation |
| Validation Button | Button | Styled, no handler | Workflow validation logic |
| Save/Load Buttons | Buttons | Styled | Persistence layer |
| Execute Button | Button | Styled, disabled | Workflow execution |
| Output Panel | Hidden div | Styled | Execution result display |

---

## 5. BACKEND WORKFLOW INFRASTRUCTURE

### Rust Backend - Plugin Workflow System

**File**: `/home/user/op-dbus-staging/src/state/plugin_workflow.rs`

Provides:
- `PluginWorkflowState` enum (Started, Completed, Failed, WaitingForInput, Skipped, NeedsIntervention)
- `WorkflowPluginNode` - wraps StatePlugin for workflow participation
- `PluginWorkflowManager` - orchestrates workflow execution
- Methods:
  - `register_plugin()` - Register a plugin as workflow node
  - `execute_workflow()` - Execute with given context
  - `create_system_admin_workflow()` - Predefined workflow
  - `create_privacy_network_workflow()` - Predefined workflow
  - `create_container_networking_workflow()` - Predefined workflow
  - `create_development_workflow()` - Predefined workflow

### Workflow Node Discovery

**File**: `/home/user/op-dbus-staging/src/mcp/workflow_nodes.rs`

Provides:
- `WorkflowNode` struct (id, name, type, category, icon, description, inputs, outputs, config_schema)
- `NodePort` struct (id, name, data_type, required, description)
- `discover_workflow_nodes()` - Main discovery function that:
  1. Discovers plugins as nodes
  2. Discovers D-Bus services as nodes
  3. Discovers MCP agents as nodes
- `discover_plugin_nodes()` - Converts plugins to nodes with:
  - Input ports: "desired_state"
  - Output ports: "current_state", "diff", "apply_result"
  - Config schema with JSON schema format

### MCP Workflows

**File**: `/home/user/op-dbus-staging/src/mcp/workflows.rs`

Provides:
- `McpWorkflowState` enum (Start, CodeAnalyzed, TestsGenerated, DocsUpdated, ReadyToDeploy, Success, Failure, AwaitingInput)
- Example nodes:
  - `CodeReviewNode` - Code analysis
  - `TestGenerationNode` - Test generation
  - `DocumentationNode` - Doc updates (implied)
  - Other nodes for deployment pipeline

Uses PocketFlow library for flow-based programming.

---

## 6. MISSING API ENDPOINTS

The Express.js chat server (chat-server.js) has these API endpoints:

**Existing**:
- `GET /api/tools` - List available tools
- `POST /api/tools/execute` - Execute a tool
- `POST /api/chat` - Chat message
- `POST /api/discovery/run` - Run D-Bus discovery
- `GET /api/discovery/services` - Get discovered services
- `GET /api/logs` - Get logs
- `GET /api/status` - System status
- `GET /api/agents` - List agents

**Missing for Workflow Support**:
```
POST   /api/workflow/create        - Create new workflow
GET    /api/workflow/list          - List saved workflows
GET    /api/workflow/:id           - Get workflow definition
POST   /api/workflow/:id/validate  - Validate workflow
POST   /api/workflow/:id/execute   - Execute workflow
POST   /api/workflow/:id/save      - Save workflow
DELETE /api/workflow/:id           - Delete workflow

GET    /api/workflow/nodes         - Get available node types
GET    /api/workflow/nodes/:type   - Get node definition
```

---

## 7. STYLING & CSS CLASSES

The CSS (styles.css, lines 1323-1520+) includes complete styling for:

```css
.workflow-builder              /* Main 3-column grid container */
.workflow-palette              /* Left sidebar */
.palette-header               /* Search/title area */
.palette-content              /* Scrollable node list */
.palette-category             /* Category sections */
.palette-category-header      /* Category titles (collapsible) */
.palette-node                 /* Individual draggable nodes */
.workflow-canvas-container    /* SVG canvas wrapper */
.workflow-canvas              /* SVG element with grid background */
.canvas-hint                  /* Placeholder text */
.workflow-node                /* Rendered node element */
.workflow-node:hover          /* Hover effects */
.node-port                    /* Input/output ports */
.workflow-connection          /* Lines between nodes */
.workflow-properties          /* Right properties panel */
.properties-header            /* Header */
.properties-content           /* Scrollable content */
.properties-placeholder       /* Empty state */
.property-group               /* Individual property */
.workflow-output              /* Execution output panel */
```

All CSS is already in place - styling is COMPLETE.

---

## 8. OVERALL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                             │
├────────────────────────┬────────────────────────────────────┤
│ MCP Control Center     │ Chat Server                         │
│ (Vanilla JS)           │ (Express.js)                        │
│                        │                                     │
│ .js Files:             │ Endpoints:                          │
│ ├─ app.js (MAIN)      │ ├─ /api/tools                      │
│ ├─ chat.js            │ ├─ /api/chat                       │
│ ├─ index.html         │ ├─ /api/discovery/*                │
│ └─ styles.css         │ ├─ /api/logs                       │
│                        │ ├─ /api/status                     │
│ UI Sections:           │ ├─ /api/agents                     │
│ ├─ Dashboard           │ └─ /api/models                     │
│ ├─ Tools               │                                    │
│ ├─ Agents              │ AI Integration:                    │
│ ├─ Chat ✓              │ ├─ Ollama (local)                 │
│ ├─ Discovery ✓         │ ├─ Gemini (Google)                │
│ ├─ Workflow ✗ (80%)    │ ├─ Grok (X.ai)                   │
│ └─ Logs ✓              │ └─ HuggingFace                    │
└────────────────────────┴────────────────────────────────────┘
                        │
                        │ HTTP/WebSocket
                        │
┌────────────────────────────────────────────────────────────┐
│         BACKEND SERVICES                                    │
├────────────────────────────────────────────────────────────┤
│ Rust Application (src/)                                     │
│                                                             │
│ State Management:                                           │
│ ├─ StateManager (manages plugins)                          │
│ ├─ Plugins:                                                │
│ │  ├─ net (network)                                       │
│ │  ├─ lxc (containers)                                    │
│ │  ├─ systemd                                             │
│ │  ├─ netmaker                                            │
│ │  ├─ privacy                                             │
│ │  └─ [11 more...]                                        │
│                                                             │
│ MCP Integration:                                            │
│ ├─ chat_server.rs (main MCP server)                       │
│ ├─ workflows.rs (MCP workflow definitions) ✗              │
│ ├─ workflow_nodes.rs (node discovery) ✗                   │
│ ├─ tool_registry.rs (tool discovery)                      │
│ └─ bridge.rs (D-Bus/plugin integration)                   │
│                                                             │
│ Plugin Workflows:                                           │
│ └─ plugin_workflow.rs (workflow orchestration) ✗           │
│                                                             │
│ D-Bus Integration:                                          │
│ ├─ dbus_server.rs                                          │
│ ├─ hybrid_dbus_bridge.rs                                   │
│ ├─ hybrid_scanner.rs                                       │
│ └─ dbus_indexer.rs                                         │
└────────────────────────────────────────────────────────────┘
```

---

## 9. WHAT NEEDS TO BE IMPLEMENTED

### Priority 1: Core Workflow Builder (90% of work)

1. **Frontend Workflow Manager Class Methods** (app.js)
   - `createNewWorkflow()` - Initialize empty workflow
   - `executeWorkflow()` - Send to backend, handle execution
   - `validateWorkflow()` - Check node connectivity, required inputs
   - `clearWorkflowCanvas()` - Reset canvas
   - `saveWorkflow()` - Save to localStorage or backend
   - `loadWorkflow()` - Load from storage
   - `setWorkflowZoom(level)` - Apply zoom transformation

2. **Node Palette Methods** (app.js)
   - `togglePaletteCategory(categoryId)` - Expand/collapse categories
   - `filterNodePalette(searchText)` - Filter nodes by name/type
   - `onNodeDragStart(event)` - Store dragged node type

3. **Canvas Interaction Methods** (app.js)
   - `onCanvasDrop(event)` - Drop node on canvas, create node element
   - `onCanvasDragOver(event)` - Visual feedback during drag
   - `onCanvasMouseDown(event)` - Start node move/connection
   - `onCanvasMouseMove(event)` - Drag node or draw connection line
   - `onCanvasMouseUp(event)` - End move/connection, create edge

4. **Node Rendering System**
   - Node visual representation (SVG circles/rectangles)
   - Port circles for input/output
   - Connection lines between nodes
   - Node selection highlighting
   - Context menu or double-click for properties

5. **Properties Panel**
   - Dynamic form generation based on node config_schema
   - Input validation
   - Real-time updates to node config

### Priority 2: Backend API Endpoints (10% of work)

1. **Workflow CRUD** (chat-server.js or new Rust module)
   - Create, read, update, delete workflows
   - Persist to database or filesystem

2. **Workflow Execution**
   - Execute workflow with context
   - Stream results back to frontend
   - Error handling and rollback

3. **Node Discovery API**
   - Return available node types
   - Return node definitions (inputs, outputs, config schema)
   - Leverage existing `discover_workflow_nodes()` from Rust backend

4. **Workflow Validation**
   - Check all nodes have required inputs connected
   - Validate data type compatibility
   - Check for circular dependencies

### Priority 3: Integration Features

1. **D-Bus Method Calls**
   - Dynamically create nodes for discovered D-Bus services
   - Map D-Bus methods to input/output ports

2. **Plugin Integration**
   - Execute plugin state transitions in workflow
   - Map plugin inputs/outputs to ports

3. **Agent Integration**
   - Use MCP agents as workflow nodes
   - Handle async operations

---

## 10. DEVELOPMENT ROADMAP

### Phase 1: Canvas & Node Rendering
- [ ] Implement canvas drop handler
- [ ] Create node rendering system (SVG)
- [ ] Implement node dragging (position updates)
- [ ] Implement port rendering
- [ ] Implement connection line drawing

### Phase 2: Workflow Definition & Storage
- [ ] Design workflow data structure (JSON)
- [ ] Implement save/load functions
- [ ] Add localStorage persistence
- [ ] Backend API for persistence

### Phase 3: Node Palette & Selection
- [ ] Implement node type selection from palette
- [ ] Implement palette filtering
- [ ] Implement category collapse/expand
- [ ] Implement node properties panel
- [ ] Property form generation from schema

### Phase 4: Execution & Validation
- [ ] Implement workflow validation logic
- [ ] Create backend execution endpoint
- [ ] Stream execution results to frontend
- [ ] Handle errors and failures
- [ ] Display execution output

### Phase 5: Advanced Features
- [ ] Node duplication
- [ ] Connection deletion
- [ ] Workflow templates/presets
- [ ] Execution history
- [ ] Workflow variables/parameters

---

## 11. KEY FILES TO MODIFY

### Frontend
- `/home/user/op-dbus-staging/src/mcp/web/app.js` - Add ~30 methods (500+ lines)
- `/home/user/op-dbus-staging/src/mcp/web/index.html` - Already complete, just needs JS
- `/home/user/op-dbus-staging/src/mcp/web/styles.css` - Already complete

### Backend
- `/home/user/op-dbus-staging/chat-server.js` - Add 6-8 API endpoints
- OR create new Rust module for workflow API endpoints
- Leverage existing: `/home/user/op-dbus-staging/src/mcp/workflow_nodes.rs`
- Leverage existing: `/home/user/op-dbus-staging/src/state/plugin_workflow.rs`

---

## 12. DATA STRUCTURES NEEDED

### Workflow JSON Format
```json
{
  "id": "workflow-uuid",
  "name": "My Workflow",
  "description": "...",
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger-manual",
      "x": 100,
      "y": 100,
      "config": {}
    },
    {
      "id": "node-2", 
      "type": "dbus-method",
      "x": 300,
      "y": 100,
      "config": { "service": "...", "method": "..." }
    }
  ],
  "edges": [
    {
      "from": "node-1",
      "to": "node-2",
      "fromPort": "trigger",
      "toPort": "execute"
    }
  ],
  "created": "2024-11-18T00:00:00Z",
  "modified": "2024-11-18T00:00:00Z"
}
```

### Workflow Execution Context
```json
{
  "workflowId": "...",
  "executionId": "...",
  "status": "running|completed|failed",
  "nodeResults": {
    "node-1": {
      "status": "completed",
      "output": {}
    }
  },
  "errors": [],
  "startTime": "...",
  "endTime": "..."
}
```

---

## SUMMARY

**Current State**: 80% Complete UI with NO backend functionality
- HTML structure: ✓ Complete
- CSS styling: ✓ Complete  
- Node palette UI: ✓ Complete
- Canvas UI: ✓ Complete (empty)
- Properties panel: ✓ Complete (empty)

**What's Missing**: 
- All JavaScript event handlers & logic (~500-1000 lines of code)
- API endpoints for workflow management (~200-300 lines)
- Integration with plugin/D-Bus workflows (~300-500 lines)

**Estimated Implementation Time**: 
- Frontend: 3-5 days (single developer)
- Backend: 1-2 days
- Testing & Integration: 1-2 days

