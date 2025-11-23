// Workflow Canvas Controls
// Advanced canvas manipulation, navigation, and layout features

class WorkflowCanvasControls {
    constructor(mcp) {
        this.mcp = mcp;
        this.panOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.gridSize = 20;
        this.snapToGrid = false;
        this.showGrid = true;
        this.minimapVisible = false;
    }

    // Initialize canvas controls
    init() {
        this.setupPanControls();
        this.setupGridSystem();
        this.setupMinimap();
        this.setupAlignmentTools();
        this.setupAutoLayout();

        console.log('Canvas controls initialized');
    }

    // Setup pan controls
    setupPanControls() {
        const canvas = document.getElementById('workflow-canvas');
        if (!canvas) return;

        // Middle mouse button or Space+drag for panning
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                this.isPanning = true;
                this.panStart = { x: e.clientX - this.panOffset.x, y: e.clientY - this.panOffset.y };
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panOffset.x = e.clientX - this.panStart.x;
                this.panOffset.y = e.clientY - this.panStart.y;
                this.mcp.renderWorkflowCanvas();
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                canvas.style.cursor = 'default';
            }
        });

        // Reset pan on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isPanning) {
                this.resetPan();
            }
        });
    }

    // Reset pan to origin
    resetPan() {
        this.panOffset = { x: 0, y: 0 };
        this.mcp.renderWorkflowCanvas();
    }

    // Setup grid system
    setupGridSystem() {
        this.drawGrid = (ctx, canvas) => {
            if (!this.showGrid) return;

            ctx.save();
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;

            // Draw vertical lines
            for (let x = 0; x < canvas.width; x += this.gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            // Draw horizontal lines
            for (let y = 0; y < canvas.height; y += this.gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            ctx.restore();
        };
    }

    // Toggle grid visibility
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.mcp.renderWorkflowCanvas();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Grid ${this.showGrid ? 'enabled' : 'disabled'}`, {
                type: 'info',
                duration: 2000
            });
        }
    }

    // Toggle snap to grid
    toggleSnapToGrid() {
        this.snapToGrid = !this.snapToGrid;

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Snap to grid ${this.snapToGrid ? 'enabled' : 'disabled'}`, {
                type: 'info',
                duration: 2000
            });
        }
    }

    // Snap position to grid
    snapPosition(x, y) {
        if (!this.snapToGrid) return { x, y };

        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    // Setup minimap
    setupMinimap() {
        this.renderMinimap = () => {
            if (!this.minimapVisible) return;

            const canvas = document.getElementById('workflow-canvas');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const minimapWidth = 200;
            const minimapHeight = 150;
            const minimapX = canvas.width - minimapWidth - 20;
            const minimapY = 20;

            // Draw minimap background
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.fillRect(minimapX, minimapY, minimapWidth, minimapHeight);
            ctx.strokeRect(minimapX, minimapY, minimapWidth, minimapHeight);

            // Calculate scale
            const bounds = this.getWorkflowBounds();
            const scaleX = minimapWidth / (bounds.maxX - bounds.minX + 200);
            const scaleY = minimapHeight / (bounds.maxY - bounds.minY + 200);
            const scale = Math.min(scaleX, scaleY, 1);

            // Draw nodes on minimap
            this.mcp.workflowNodes.forEach(node => {
                const x = minimapX + (node.x - bounds.minX) * scale + 10;
                const y = minimapY + (node.y - bounds.minY) * scale + 10;
                const w = node.width * scale;
                const h = node.height * scale;

                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(x, y, w, h);
            });

            ctx.restore();
        };
    }

    // Get workflow bounds
    getWorkflowBounds() {
        if (this.mcp.workflowNodes.length === 0) {
            return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
        }

        const minX = Math.min(...this.mcp.workflowNodes.map(n => n.x));
        const minY = Math.min(...this.mcp.workflowNodes.map(n => n.y));
        const maxX = Math.max(...this.mcp.workflowNodes.map(n => n.x + n.width));
        const maxY = Math.max(...this.mcp.workflowNodes.map(n => n.y + n.height));

        return { minX, minY, maxX, maxY };
    }

    // Toggle minimap
    toggleMinimap() {
        this.minimapVisible = !this.minimapVisible;
        this.mcp.renderWorkflowCanvas();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Minimap ${this.minimapVisible ? 'enabled' : 'disabled'}`, {
                type: 'info',
                duration: 2000
            });
        }
    }

    // Setup alignment tools
    setupAlignmentTools() {
        this.selectedNodes = [];
    }

    // Align selected nodes
    alignNodes(alignment) {
        if (this.selectedNodes.length < 2) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Select at least 2 nodes to align', {
                    type: 'warning',
                    duration: 3000
                });
            }
            return;
        }

        const nodes = this.mcp.workflowNodes.filter(n => this.selectedNodes.includes(n.id));

        switch (alignment) {
            case 'left':
                const minX = Math.min(...nodes.map(n => n.x));
                nodes.forEach(n => n.x = minX);
                break;

            case 'right':
                const maxX = Math.max(...nodes.map(n => n.x + n.width));
                nodes.forEach(n => n.x = maxX - n.width);
                break;

            case 'top':
                const minY = Math.min(...nodes.map(n => n.y));
                nodes.forEach(n => n.y = minY);
                break;

            case 'bottom':
                const maxY = Math.max(...nodes.map(n => n.y + n.height));
                nodes.forEach(n => n.y = maxY - n.height);
                break;

            case 'center-h':
                const centerX = nodes.reduce((sum, n) => sum + n.x + n.width / 2, 0) / nodes.length;
                nodes.forEach(n => n.x = centerX - n.width / 2);
                break;

            case 'center-v':
                const centerY = nodes.reduce((sum, n) => sum + n.y + n.height / 2, 0) / nodes.length;
                nodes.forEach(n => n.y = centerY - n.height / 2);
                break;
        }

        this.mcp.renderWorkflowCanvas();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Aligned ${nodes.length} nodes`, {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Distribute nodes evenly
    distributeNodes(direction) {
        if (this.selectedNodes.length < 3) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Select at least 3 nodes to distribute', {
                    type: 'warning',
                    duration: 3000
                });
            }
            return;
        }

        const nodes = this.mcp.workflowNodes.filter(n => this.selectedNodes.includes(n.id));

        if (direction === 'horizontal') {
            nodes.sort((a, b) => a.x - b.x);
            const totalWidth = nodes[nodes.length - 1].x - nodes[0].x;
            const spacing = totalWidth / (nodes.length - 1);

            nodes.forEach((node, i) => {
                node.x = nodes[0].x + spacing * i;
            });
        } else {
            nodes.sort((a, b) => a.y - b.y);
            const totalHeight = nodes[nodes.length - 1].y - nodes[0].y;
            const spacing = totalHeight / (nodes.length - 1);

            nodes.forEach((node, i) => {
                node.y = nodes[0].y + spacing * i;
            });
        }

        this.mcp.renderWorkflowCanvas();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Distributed ${nodes.length} nodes`, {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Setup auto-layout
    setupAutoLayout() {
        // Hierarchical layout algorithm
        this.autoLayoutHierarchical = () => {
            const triggers = this.mcp.workflowNodes.filter(n =>
                n.type.startsWith('trigger-') || n.type === 'timer' || n.type === 'webhook'
            );

            if (triggers.length === 0) {
                if (window.notificationSystem) {
                    window.notificationSystem.showNotification('No trigger nodes found', {
                        type: 'warning',
                        duration: 3000
                    });
                }
                return;
            }

            // BFS to assign levels
            const levels = new Map();
            const visited = new Set();
            const queue = triggers.map(t => ({ node: t, level: 0 }));

            triggers.forEach(t => {
                levels.set(t.id, 0);
                visited.add(t.id);
            });

            while (queue.length > 0) {
                const { node, level } = queue.shift();

                const connections = this.mcp.workflowConnections.filter(c => c.from === node.id);
                connections.forEach(conn => {
                    if (!visited.has(conn.to)) {
                        const nextNode = this.mcp.workflowNodes.find(n => n.id === conn.to);
                        if (nextNode) {
                            levels.set(conn.to, level + 1);
                            visited.add(conn.to);
                            queue.push({ node: nextNode, level: level + 1 });
                        }
                    }
                });
            }

            // Group nodes by level
            const nodesByLevel = new Map();
            levels.forEach((level, nodeId) => {
                if (!nodesByLevel.has(level)) {
                    nodesByLevel.set(level, []);
                }
                const node = this.mcp.workflowNodes.find(n => n.id === nodeId);
                if (node) nodesByLevel.get(level).push(node);
            });

            // Position nodes
            const levelWidth = 250;
            const nodeSpacing = 100;

            nodesByLevel.forEach((nodes, level) => {
                const x = 100 + level * levelWidth;
                const totalHeight = nodes.length * nodeSpacing;
                const startY = 100;

                nodes.forEach((node, i) => {
                    node.x = x;
                    node.y = startY + i * nodeSpacing;
                });
            });

            this.mcp.renderWorkflowCanvas();

            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Auto-layout applied', {
                    type: 'success',
                    duration: 3000
                });
            }
        };
    }

    // Show canvas controls dialog
    showCanvasControls() {
        const controlsHTML = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">🎛️ Canvas Controls</h3>

                <div style="display: grid; gap: 15px; margin-top: 20px;">
                    <div>
                        <h4 style="margin: 0 0 10px 0;">Grid & Snapping</h4>
                        <div style="display: grid; gap: 8px;">
                            <button class="btn btn-sm" onclick="window.canvasControls.toggleGrid(); this.textContent = window.canvasControls.showGrid ? '✓ Grid Enabled' : 'Grid Disabled';" style="text-align: left;">
                                ${this.showGrid ? '✓' : ''} Grid ${this.showGrid ? 'Enabled' : 'Disabled'}
                            </button>
                            <button class="btn btn-sm" onclick="window.canvasControls.toggleSnapToGrid(); this.textContent = window.canvasControls.snapToGrid ? '✓ Snap Enabled' : 'Snap Disabled';" style="text-align: left;">
                                ${this.snapToGrid ? '✓' : ''} Snap to Grid ${this.snapToGrid ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 10px 0;">Navigation</h4>
                        <div style="display: grid; gap: 8px;">
                            <button class="btn btn-sm" onclick="window.canvasControls.resetPan(); this.closest('.toast').remove();" style="text-align: left;">
                                🎯 Reset View
                            </button>
                            <button class="btn btn-sm" onclick="window.canvasControls.toggleMinimap();" style="text-align: left;">
                                🗺️ Toggle Minimap
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 10px 0;">Alignment</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                            <button class="btn btn-sm" onclick="window.canvasControls.alignNodes('left');">⬅️ Align Left</button>
                            <button class="btn btn-sm" onclick="window.canvasControls.alignNodes('right');">➡️ Align Right</button>
                            <button class="btn btn-sm" onclick="window.canvasControls.alignNodes('top');">⬆️ Align Top</button>
                            <button class="btn btn-sm" onclick="window.canvasControls.alignNodes('bottom');">⬇️ Align Bottom</button>
                            <button class="btn btn-sm" onclick="window.canvasControls.alignNodes('center-h');">↔️ Center H</button>
                            <button class="btn btn-sm" onclick="window.canvasControls.alignNodes('center-v');">↕️ Center V</button>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 10px 0;">Distribution</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                            <button class="btn btn-sm" onclick="window.canvasControls.distributeNodes('horizontal');">
                                ↔️ Distribute Horizontally
                            </button>
                            <button class="btn btn-sm" onclick="window.canvasControls.distributeNodes('vertical');">
                                ↕️ Distribute Vertically
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 10px 0;">Auto Layout</h4>
                        <button class="btn btn-sm btn-primary" onclick="window.canvasControls.autoLayoutHierarchical(); this.closest('.toast').remove();" style="width: 100%;">
                            🔄 Apply Hierarchical Layout
                        </button>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 6px; font-size: 13px;">
                    <strong>💡 Tips:</strong>
                    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                        <li>Middle-click or Shift+Drag to pan the canvas</li>
                        <li>Enable grid for visual alignment</li>
                        <li>Use snap-to-grid for precise positioning</li>
                        <li>Auto-layout organizes nodes hierarchically</li>
                    </ul>
                </div>
            </div>
        `;

        this.mcp.showToast(controlsHTML, 'info', 60000);
    }
}

// Initialize canvas controls when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.canvasControls = new WorkflowCanvasControls(window.mcp);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.canvasControls.init();
        });
    } else {
        window.canvasControls.init();
    }

    // Add method to global mcp object
    window.mcp.showCanvasControls = () => window.canvasControls.showCanvasControls();
}
