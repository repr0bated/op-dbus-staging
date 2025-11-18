# Workflow Builder - Complete Feature Guide

## Overview

The Workflow Builder is a fully functional, visual node-based workflow editor integrated into the MCP Control Center. It allows you to create, edit, and execute custom automation workflows by connecting different types of nodes.

## Features

### Core Functionality

#### Visual Node Editor
- **Drag-and-Drop Interface**: Drag nodes from the palette onto the canvas
- **Visual Connections**: Click and drag between node ports to create data flow connections
- **Node Selection**: Click nodes to select and edit their properties
- **Node Movement**: Drag nodes around the canvas to reorganize your workflow
- **Real-time Validation**: Instant feedback on workflow structure and readiness

#### Node Types (10 Total)

**Triggers (2)**
- ⚡ **Manual Start**: Manual trigger to start workflow execution
- 📡 **D-Bus Signal**: Listen for D-Bus signals to trigger workflow

**D-Bus Operations (3)**
- 🔧 **Method Call**: Call D-Bus methods on system services
- 📋 **Get Property**: Retrieve D-Bus property values
- ✏️ **Set Property**: Modify D-Bus property values

**Logic & Control (3)**
- ❓ **Condition**: Branch workflow based on conditions
- 🔄 **Transform**: Transform data between nodes
- ⏱️ **Delay**: Add time delays in workflow execution

**Output (2)**
- 📝 **Log Output**: Log workflow data
- 🔔 **Notification**: Send notifications

### Workflow Management

#### Save/Load Operations
- **Local Storage Save**: Save workflows in browser localStorage by name
- **Export to JSON**: Download workflow as JSON file for sharing
- **Import from JSON**: Load workflows from JSON files
- **Templates**: Quick start with pre-built workflow templates
  - 📡 D-Bus Monitor Template
  - ⚙️ Simple Automation Template

#### Execution & Validation
- **Workflow Validation**: Check for required triggers and valid connections
- **BFS Execution Engine**: Execute workflows using breadth-first search algorithm
- **Real-time Execution Results**: View detailed execution output for each node
- **Error Handling**: Graceful error handling with detailed error messages

### User Interface

#### Canvas Features
- **Grid Background**: Visual grid for better node alignment
- **Zoom Controls**: 50%, 75%, 100%, 125%, 150% zoom levels
- **SVG Rendering**: Smooth, scalable vector graphics
- **Connection Highlighting**: Hover effects on connections
- **Right-click to Delete**: Right-click connections to delete them

#### Node Properties Panel
- **Dynamic Property Editor**: Auto-generates form fields based on node type
- **Type-specific Inputs**: Numbers, text, and JSON editors
- **Inline Actions**: Duplicate and delete buttons in property panel
- **Real-time Updates**: Changes apply immediately to workflow

#### Workflow Statistics
- **Node Count**: Total number of nodes in workflow
- **Connection Count**: Total number of connections
- **Status Indicator**: Shows workflow readiness (Empty/Ready/No Trigger)
- **Visual Feedback**: Color-coded status (green for ready, yellow for warnings)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save workflow |
| `Ctrl/Cmd + E` | Execute workflow |
| `Ctrl/Cmd + D` | Duplicate selected node |
| `Delete/Backspace` | Delete selected node |
| `Escape` | Deselect node |
| `?` | Show keyboard shortcuts help |
| `Right-click connection` | Delete connection |

### Help System

- **Keyboard Shortcuts Dialog**: Comprehensive shortcut reference with tips
- **Workflow Guide**: Complete guide covering all node types and usage
- **Inline Help Button**: Accessible from workflow toolbar
- **Contextual Tooltips**: Hover tooltips on all buttons

## Technical Implementation

### Frontend Architecture
- **Pure JavaScript**: No framework dependencies
- **SVG-based Canvas**: Scalable, hardware-accelerated rendering
- **Event-driven**: Responsive mouse/keyboard interactions
- **Modular Design**: Clean separation of concerns

### Backend Integration
- **RESTful API**: `/api/workflow/execute` endpoint
- **JSON Workflow Format**: Portable workflow definition
- **Async Execution**: Non-blocking workflow execution
- **Result Tracking**: Detailed execution logs and outputs

### Data Structures

#### Workflow Format
```json
{
  "name": "workflow-name",
  "nodes": [
    {
      "id": "node_0",
      "type": "trigger-manual",
      "x": 100,
      "y": 100,
      "width": 120,
      "height": 60,
      "label": "Manual Start",
      "icon": "▶️",
      "inputs": 0,
      "outputs": 1,
      "config": {}
    }
  ],
  "connections": [
    {
      "from": "node_0",
      "to": "node_1",
      "fromPort": "0",
      "toPort": "0"
    }
  ]
}
```

## Usage Examples

### Creating a Simple Workflow

1. Click "New Workflow" to start fresh
2. Drag "Manual Start" trigger from palette to canvas
3. Drag "Method Call" node onto canvas
4. Drag "Log Output" node onto canvas
5. Connect nodes: Manual Start → Method Call → Log Output
6. Configure each node's properties
7. Click "Validate" to check workflow
8. Click "Execute" to run workflow

### Using Templates

1. Click "Templates" dropdown in toolbar
2. Select "D-Bus Monitor" or "Simple Automation"
3. Template loads with pre-configured nodes
4. Customize node configurations as needed
5. Save or execute template workflow

### Exporting Workflows

1. Build your workflow
2. Click "Export" button
3. JSON file downloads automatically
4. Share file with others

### Importing Workflows

1. Click "Import" button
2. Select JSON workflow file
3. Workflow loads onto canvas
4. Ready to execute or modify

## Advanced Features

### Node Duplication
- Select a node
- Press `Ctrl/Cmd + D` or click "Duplicate" in properties panel
- Duplicate appears offset from original
- All configuration copied

### Connection Management
- Click and drag from output port to input port
- Right-click any connection to delete
- Hover over connections for visual feedback
- Auto-validates connection compatibility

### Workflow Validation
- Automatic trigger detection
- Disconnected node warnings
- Real-time status updates
- Visual feedback for issues

### Execution Output
- Color-coded results (green for success, red for errors)
- Detailed output per node
- Execution summary with timing
- Expandable result details

## Best Practices

1. **Always Start with a Trigger**: Workflows require at least one trigger node
2. **Test Incrementally**: Build and test small workflow sections
3. **Use Meaningful Names**: Save workflows with descriptive names
4. **Export Regularly**: Backup important workflows by exporting
5. **Validate Before Execute**: Always validate before running workflows
6. **Check Execution Output**: Review results after each execution

## Keyboard Workflow Tips

- Use keyboard shortcuts for faster workflow building
- `?` shows all available shortcuts
- Practice keyboard shortcuts to improve speed
- Combine mouse and keyboard for efficiency

## Accessibility Features

- ARIA labels on all interactive elements
- Keyboard-only navigation support
- Screen reader compatible
- High contrast support in dark mode
- Clear visual indicators for all states

## Performance

- Optimized SVG rendering
- Efficient event handling
- Minimal re-renders
- Smooth animations
- Fast execution engine

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript support required
- SVG 2.0 rendering support
- LocalStorage for workflow persistence
- File API for import/export

## Future Enhancements

Potential future additions:
- Undo/Redo functionality
- Mini-map for large workflows
- Auto-layout algorithms
- Workflow versioning
- Collaborative editing
- Custom node creation
- Workflow scheduling
- More node types
- Advanced error handling
- Performance metrics

## Support & Documentation

For more information:
- Press `?` in the workflow builder for keyboard shortcuts
- Click the Help button for the complete guide
- Check the codebase exploration documents
- Review the implementation guide

## Credits

Built for the MCP Control Center as part of the Operation D-Bus project.
Features full dark mode support, comprehensive keyboard shortcuts, and professional-grade workflow execution.
