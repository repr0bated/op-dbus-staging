// Workflow Builder Enhancements
// Advanced workflow features, debugging, and execution control

class WorkflowEnhancements {
    constructor(mcp) {
        this.mcp = mcp;
        this.executionHistory = [];
        this.autoSaveInterval = null;
        this.debugMode = false;
        this.breakpoints = new Set();
        this.executionState = null;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.currentExecutingNode = null;
        this.nodeGroups = [];
        this.workflowComments = [];
        this.executionPath = [];
    }

    // Initialize enhancements
    init() {
        this.setupAutoSave();
        this.setupDebugControls();
        this.addAdvancedNodeTypes();
        this.addMoreAdvancedNodes();
        this.setupExecutionMonitor();
        this.addMoreTemplates();
        this.setupUndoRedo();
        this.setupKeyboardShortcuts();
        this.setupNodeValidation();
        this.setupNodeSearch();
        this.setupWorkflowVersioning();
        this.setupNodeGrouping();
        this.setupWorkflowComments();
        this.setupExecutionPathTracing();
        this.updateWorkflowStats();

        console.log('Workflow enhancements initialized');
    }

    // Setup auto-save
    setupAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            if (this.mcp.workflowNodes.length > 0) {
                const autoSaveData = {
                    name: '__autosave__',
                    nodes: this.mcp.workflowNodes,
                    connections: this.mcp.workflowConnections,
                    timestamp: new Date().toISOString()
                };

                localStorage.setItem('workflow_autosave', JSON.stringify(autoSaveData));
                console.log('Workflow auto-saved');
            }
        }, 30000);
    }

    // Recover from auto-save
    recoverAutoSave() {
        const autoSave = localStorage.getItem('workflow_autosave');
        if (!autoSave) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('No auto-save found', {
                    type: 'info',
                    duration: 3000
                });
            }
            return;
        }

        const data = JSON.parse(autoSave);
        const timestamp = new Date(data.timestamp).toLocaleString();

        if (confirm(`Recover auto-saved workflow from ${timestamp}?`)) {
            this.mcp.workflowNodes = data.nodes;
            this.mcp.workflowConnections = data.connections;
            this.mcp.renderWorkflowCanvas();
            document.getElementById('canvas-hint').style.display = 'none';
            document.getElementById('btn-execute-workflow').disabled = false;

            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Workflow recovered from auto-save', {
                    type: 'success',
                    duration: 3000
                });
            }
        }
    }

    // Setup debug controls
    setupDebugControls() {
        // Add debug panel to workflow section
        const workflowSection = document.getElementById('workflow');
        if (!workflowSection) return;

        const debugPanelHTML = `
            <div id="workflow-debug-panel" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 15px;
                display: none;
                z-index: 1000;
                min-width: 300px;
                box-shadow: var(--shadow-lg);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 14px;">🐛 Debug Mode</h4>
                    <button class="btn btn-xs" onclick="window.workflowEnhancements.toggleDebugMode()">✕</button>
                </div>
                <div style="display: grid; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <input type="checkbox" id="debug-step-mode">
                        <span>Step-by-step execution</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <input type="checkbox" id="debug-log-all">
                        <span>Log all node executions</span>
                    </label>
                    <button class="btn btn-sm" onclick="window.workflowEnhancements.showExecutionHistory()">
                        📊 View Execution History
                    </button>
                    <button class="btn btn-sm" onclick="window.workflowEnhancements.exportExecutionLog()">
                        💾 Export Debug Log
                    </button>
                </div>
                <div id="debug-current-node" style="margin-top: 12px; padding: 8px; background: var(--bg-primary); border-radius: 4px; font-size: 11px; display: none;">
                    <strong>Current Node:</strong> <span id="debug-node-id"></span>
                </div>
            </div>
        `;

        workflowSection.insertAdjacentHTML('beforeend', debugPanelHTML);
    }

    // Toggle debug mode
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        const debugPanel = document.getElementById('workflow-debug-panel');

        if (this.debugMode) {
            debugPanel.style.display = 'block';
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Debug mode enabled', {
                    type: 'info',
                    duration: 2000
                });
            }
        } else {
            debugPanel.style.display = 'none';
        }
    }

    // Add advanced node types
    addAdvancedNodeTypes() {
        // These will extend the existing node types in getNodeConfig
        this.advancedNodeTypes = {
            'http-request': {
                label: 'HTTP Request',
                icon: '🌐',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    url: 'https://api.example.com',
                    method: 'GET',
                    headers: '{}',
                    body: ''
                }
            },
            'file-read': {
                label: 'Read File',
                icon: '📖',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    path: '/path/to/file',
                    encoding: 'utf8'
                }
            },
            'file-write': {
                label: 'Write File',
                icon: '💾',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    path: '/path/to/file',
                    encoding: 'utf8',
                    append: false
                }
            },
            'timer': {
                label: 'Timer',
                icon: '⏰',
                inputs: 0,
                outputs: 1,
                defaultConfig: {
                    interval: 60000,
                    repeat: true
                }
            },
            'loop': {
                label: 'Loop',
                icon: '🔁',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    iterations: 10,
                    variable: 'i'
                }
            },
            'filter': {
                label: 'Filter',
                icon: '🔍',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    condition: 'item > 0'
                }
            },
            'map': {
                label: 'Map',
                icon: '🗺️',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    transform: 'item * 2'
                }
            },
            'reduce': {
                label: 'Reduce',
                icon: '📉',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    accumulator: 'sum',
                    initial: 0
                }
            },
            'split': {
                label: 'Split',
                icon: '✂️',
                inputs: 1,
                outputs: 2,
                defaultConfig: {
                    condition: 'value > 50',
                    trueOutput: '0',
                    falseOutput: '1'
                }
            },
            'merge': {
                label: 'Merge',
                icon: '🔀',
                inputs: 2,
                outputs: 1,
                defaultConfig: {
                    strategy: 'combine'
                }
            },
            'email': {
                label: 'Send Email',
                icon: '📧',
                inputs: 1,
                outputs: 0,
                defaultConfig: {
                    to: '',
                    subject: '',
                    body: ''
                }
            },
            'webhook': {
                label: 'Webhook',
                icon: '🪝',
                inputs: 0,
                outputs: 1,
                defaultConfig: {
                    url: '/webhook',
                    method: 'POST'
                }
            },
            'database': {
                label: 'Database Query',
                icon: '💾',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    query: 'SELECT * FROM table',
                    connection: 'default'
                }
            },
            'cache': {
                label: 'Cache',
                icon: '🗄️',
                inputs: 1,
                outputs: 1,
                defaultConfig: {
                    key: 'cache_key',
                    ttl: 3600
                }
            },
            'error-handler': {
                label: 'Error Handler',
                icon: '🚨',
                inputs: 1,
                outputs: 2,
                defaultConfig: {
                    onError: 'log',
                    retry: 3
                }
            }
        };
    }

    // Add more workflow templates
    addMoreTemplates() {
        this.workflowTemplates = {
            'http-api-workflow': {
                name: 'HTTP API Workflow',
                description: 'Fetch data from API, transform, and notify',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 150, width: 120, height: 60, label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'http-request', x: 300, y: 150, width: 120, height: 60, label: 'HTTP Request', icon: '🌐', inputs: 1, outputs: 1, config: { url: 'https://api.github.com/repos/nodejs/node', method: 'GET', headers: '{}', body: '' } },
                    { id: 'node_2', type: 'transform', x: 500, y: 150, width: 120, height: 60, label: 'Transform', icon: '🔄', inputs: 1, outputs: 1, config: { script: 'return input.data.stargazers_count;' } },
                    { id: 'node_3', type: 'output-notification', x: 700, y: 150, width: 120, height: 60, label: 'Notification', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'Stars Count', message: 'GitHub stars' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' }
                ]
            },
            'file-processing': {
                name: 'File Processing',
                description: 'Read file, process, and write output',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 150, width: 120, height: 60, label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'file-read', x: 300, y: 150, width: 120, height: 60, label: 'Read File', icon: '📖', inputs: 1, outputs: 1, config: { path: '/tmp/input.txt', encoding: 'utf8' } },
                    { id: 'node_2', type: 'transform', x: 500, y: 150, width: 120, height: 60, label: 'Transform', icon: '🔄', inputs: 1, outputs: 1, config: { script: 'return input.toUpperCase();' } },
                    { id: 'node_3', type: 'file-write', x: 700, y: 150, width: 120, height: 60, label: 'Write File', icon: '💾', inputs: 1, outputs: 1, config: { path: '/tmp/output.txt', encoding: 'utf8' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' }
                ]
            },
            'conditional-workflow': {
                name: 'Conditional Flow',
                description: 'Split execution based on condition',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 200, width: 120, height: 60, label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'condition', x: 300, y: 200, width: 120, height: 60, label: 'Condition', icon: '❓', inputs: 1, outputs: 2, config: { expression: 'value > 50' } },
                    { id: 'node_2', type: 'output-notification', x: 500, y: 100, width: 120, height: 60, label: 'High Value', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'High', message: 'Value is high' } },
                    { id: 'node_3', type: 'output-notification', x: 500, y: 300, width: 120, height: 60, label: 'Low Value', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'Low', message: 'Value is low' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_3', fromPort: '1', toPort: '0' }
                ]
            },
            'loop-workflow': {
                name: 'Loop Processing',
                description: 'Process items in a loop',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 150, width: 120, height: 60, label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'loop', x: 300, y: 150, width: 120, height: 60, label: 'Loop', icon: '🔁', inputs: 1, outputs: 1, config: { iterations: 10, variable: 'i' } },
                    { id: 'node_2', type: 'transform', x: 500, y: 150, width: 120, height: 60, label: 'Transform', icon: '🔄', inputs: 1, outputs: 1, config: { script: 'return i * 2;' } },
                    { id: 'node_3', type: 'output-log', x: 700, y: 150, width: 120, height: 60, label: 'Log Output', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' }
                ]
            },
            'error-handling': {
                name: 'Error Handling',
                description: 'Handle errors gracefully',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 200, width: 120, height: 60, label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'http-request', x: 300, y: 200, width: 120, height: 60, label: 'HTTP Request', icon: '🌐', inputs: 1, outputs: 1, config: { url: 'https://api.example.com/data', method: 'GET' } },
                    { id: 'node_2', type: 'error-handler', x: 500, y: 200, width: 120, height: 60, label: 'Error Handler', icon: '🚨', inputs: 1, outputs: 2, config: { onError: 'retry', retry: 3 } },
                    { id: 'node_3', type: 'output-log', x: 700, y: 100, width: 120, height: 60, label: 'Success Log', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } },
                    { id: 'node_4', type: 'output-notification', x: 700, y: 300, width: 120, height: 60, label: 'Error Notify', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'Error', message: 'Request failed' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_4', fromPort: '1', toPort: '0' }
                ]
            },
            'data-pipeline': {
                name: 'Data Pipeline',
                description: 'ETL pipeline with filter, map, reduce',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 200, width: 120, height: 60, label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'http-request', x: 300, y: 200, width: 120, height: 60, label: 'Fetch Data', icon: '🌐', inputs: 1, outputs: 1, config: { url: 'https://api.example.com/items', method: 'GET' } },
                    { id: 'node_2', type: 'filter', x: 500, y: 200, width: 120, height: 60, label: 'Filter', icon: '🔍', inputs: 1, outputs: 1, config: { condition: 'item.value > 100' } },
                    { id: 'node_3', type: 'map', x: 700, y: 200, width: 120, height: 60, label: 'Map', icon: '🗺️', inputs: 1, outputs: 1, config: { transform: 'item.value * 2' } },
                    { id: 'node_4', type: 'reduce', x: 900, y: 200, width: 120, height: 60, label: 'Reduce', icon: '📉', inputs: 1, outputs: 1, config: { accumulator: 'sum', initial: 0 } },
                    { id: 'node_5', type: 'output-log', x: 1100, y: 200, width: 120, height: 60, label: 'Log Result', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' },
                    { from: 'node_3', to: 'node_4', fromPort: '0', toPort: '0' },
                    { from: 'node_4', to: 'node_5', fromPort: '0', toPort: '0' }
                ]
            },
            'scheduled-backup': {
                name: 'Scheduled Backup',
                description: 'Timer-based file backup workflow',
                nodes: [
                    { id: 'node_0', type: 'timer', x: 100, y: 150, width: 120, height: 60, label: 'Timer', icon: '⏰', inputs: 0, outputs: 1, config: { interval: 3600000, repeat: true } },
                    { id: 'node_1', type: 'file-read', x: 300, y: 150, width: 120, height: 60, label: 'Read File', icon: '📖', inputs: 1, outputs: 1, config: { path: '/data/original.txt', encoding: 'utf8' } },
                    { id: 'node_2', type: 'file-write', x: 500, y: 150, width: 120, height: 60, label: 'Write Backup', icon: '💾', inputs: 1, outputs: 1, config: { path: '/backup/backup.txt', encoding: 'utf8' } },
                    { id: 'node_3', type: 'output-notification', x: 700, y: 150, width: 120, height: 60, label: 'Notify', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'Backup Complete', message: 'File backed up successfully' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' }
                ]
            },
            'webhook-processor': {
                name: 'Webhook Processor',
                description: 'Receive webhook, validate, and process',
                nodes: [
                    { id: 'node_0', type: 'webhook', x: 100, y: 200, width: 120, height: 60, label: 'Webhook', icon: '🪝', inputs: 0, outputs: 1, config: { url: '/webhook/incoming', method: 'POST' } },
                    { id: 'node_1', type: 'condition', x: 300, y: 200, width: 120, height: 60, label: 'Validate', icon: '❓', inputs: 1, outputs: 2, config: { expression: 'input.token === "valid"' } },
                    { id: 'node_2', type: 'transform', x: 500, y: 100, width: 120, height: 60, label: 'Process', icon: '🔄', inputs: 1, outputs: 1, config: { script: 'return JSON.stringify(input);' } },
                    { id: 'node_3', type: 'output-log', x: 700, y: 100, width: 120, height: 60, label: 'Log Success', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } },
                    { id: 'node_4', type: 'output-notification', x: 500, y: 300, width: 120, height: 60, label: 'Invalid', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'Invalid Webhook', message: 'Token validation failed' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_4', fromPort: '1', toPort: '0' }
                ]
            },
            'multi-api-aggregator': {
                name: 'Multi-API Aggregator',
                description: 'Fetch from multiple APIs and merge results',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 200, width: 120, height: 60, label: 'Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'http-request', x: 300, y: 100, width: 120, height: 60, label: 'API 1', icon: '🌐', inputs: 1, outputs: 1, config: { url: 'https://api.example.com/data1', method: 'GET' } },
                    { id: 'node_2', type: 'http-request', x: 300, y: 300, width: 120, height: 60, label: 'API 2', icon: '🌐', inputs: 1, outputs: 1, config: { url: 'https://api.example.com/data2', method: 'GET' } },
                    { id: 'node_3', type: 'merge', x: 500, y: 200, width: 120, height: 60, label: 'Merge', icon: '🔀', inputs: 2, outputs: 1, config: { strategy: 'combine' } },
                    { id: 'node_4', type: 'output-log', x: 700, y: 200, width: 120, height: 60, label: 'Log Result', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_0', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_3', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '1' },
                    { from: 'node_3', to: 'node_4', fromPort: '0', toPort: '0' }
                ]
            },
            'database-etl': {
                name: 'Database ETL',
                description: 'Extract, transform, and load database records',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 150, width: 120, height: 60, label: 'Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'database', x: 300, y: 150, width: 120, height: 60, label: 'Extract', icon: '💾', inputs: 1, outputs: 1, config: { query: 'SELECT * FROM users', connection: 'default' } },
                    { id: 'node_2', type: 'filter', x: 500, y: 150, width: 120, height: 60, label: 'Filter Active', icon: '🔍', inputs: 1, outputs: 1, config: { condition: 'user.active === true' } },
                    { id: 'node_3', type: 'map', x: 700, y: 150, width: 120, height: 60, label: 'Transform', icon: '🗺️', inputs: 1, outputs: 1, config: { transform: '{ id: user.id, name: user.name.toUpperCase() }' } },
                    { id: 'node_4', type: 'database', x: 900, y: 150, width: 120, height: 60, label: 'Load', icon: '💾', inputs: 1, outputs: 1, config: { query: 'INSERT INTO processed_users', connection: 'default' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' },
                    { from: 'node_3', to: 'node_4', fromPort: '0', toPort: '0' }
                ]
            },
            'cache-optimization': {
                name: 'Cache Optimization',
                description: 'Cache API responses for performance',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 200, width: 120, height: 60, label: 'Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'cache', x: 300, y: 200, width: 120, height: 60, label: 'Check Cache', icon: '🗄️', inputs: 1, outputs: 1, config: { key: 'api_data', ttl: 3600 } },
                    { id: 'node_2', type: 'condition', x: 500, y: 200, width: 120, height: 60, label: 'Cache Hit?', icon: '❓', inputs: 1, outputs: 2, config: { expression: 'input !== null' } },
                    { id: 'node_3', type: 'output-log', x: 700, y: 100, width: 120, height: 60, label: 'Use Cache', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } },
                    { id: 'node_4', type: 'http-request', x: 700, y: 300, width: 120, height: 60, label: 'Fetch Fresh', icon: '🌐', inputs: 1, outputs: 1, config: { url: 'https://api.example.com/data', method: 'GET' } },
                    { id: 'node_5', type: 'cache', x: 900, y: 300, width: 120, height: 60, label: 'Store Cache', icon: '🗄️', inputs: 1, outputs: 1, config: { key: 'api_data', ttl: 3600 } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_4', fromPort: '1', toPort: '0' },
                    { from: 'node_4', to: 'node_5', fromPort: '0', toPort: '0' }
                ]
            },
            'notification-router': {
                name: 'Notification Router',
                description: 'Route notifications based on priority',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 250, width: 120, height: 60, label: 'Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'condition', x: 300, y: 250, width: 120, height: 60, label: 'Check Priority', icon: '❓', inputs: 1, outputs: 2, config: { expression: 'input.priority === "high"' } },
                    { id: 'node_2', type: 'output-notification', x: 500, y: 150, width: 120, height: 60, label: 'Urgent Alert', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'URGENT', message: 'High priority alert' } },
                    { id: 'node_3', type: 'email', x: 700, y: 150, width: 120, height: 60, label: 'Email Alert', icon: '📧', inputs: 1, outputs: 0, config: { to: 'admin@example.com', subject: 'Urgent Alert' } },
                    { id: 'node_4', type: 'output-log', x: 500, y: 350, width: 120, height: 60, label: 'Log Normal', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' },
                    { from: 'node_2', to: 'node_3', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_4', fromPort: '1', toPort: '0' }
                ]
            }
        };
    }

    // Load template from enhanced templates
    loadEnhancedTemplate(templateId) {
        const template = this.workflowTemplates[templateId];
        if (!template) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Template not found', {
                    type: 'error',
                    duration: 3000
                });
            }
            return;
        }

        this.mcp.workflowNodes = template.nodes;
        this.mcp.workflowConnections = template.connections;
        this.mcp.nodeIdCounter = template.nodes.length;
        this.mcp.renderWorkflowCanvas();
        document.getElementById('canvas-hint').style.display = 'none';
        document.getElementById('btn-execute-workflow').disabled = false;

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Template "${template.name}" loaded`, {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Show enhanced template browser
    showTemplateBrowser() {
        const templatesHTML = `
            <div style="padding: 20px; max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">📋 Workflow Templates</h3>
                <div style="display: grid; gap: 12px; margin-top: 20px;">
                    ${Object.entries(this.workflowTemplates).map(([id, template]) => `
                        <div style="
                            padding: 15px;
                            background: var(--bg-secondary);
                            border: 1px solid var(--border-color);
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.2s;
                        "
                        onmouseover="this.style.borderColor='var(--color-primary)'"
                        onmouseout="this.style.borderColor='var(--border-color)'"
                        onclick="window.workflowEnhancements.loadEnhancedTemplate('${id}'); this.closest('.toast').remove();">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                <h4 style="margin: 0; font-size: 14px;">${template.name}</h4>
                                <span style="
                                    padding: 2px 8px;
                                    background: var(--bg-primary);
                                    border-radius: 12px;
                                    font-size: 11px;
                                ">${template.nodes.length} nodes</span>
                            </div>
                            <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">
                                ${template.description}
                            </p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.mcp.showToast(templatesHTML, 'info', 30000);
    }

    // Setup execution monitor
    setupExecutionMonitor() {
        // Intercept workflow executions and log them
        this.originalExecuteWorkflow = this.mcp.executeWorkflow.bind(this.mcp);

        this.mcp.executeWorkflow = async () => {
            const startTime = Date.now();

            try {
                await this.originalExecuteWorkflow();

                const execution = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime,
                    nodes: this.mcp.workflowNodes.length,
                    connections: this.mcp.workflowConnections.length,
                    success: true
                };

                this.executionHistory.push(execution);
                this.saveExecutionHistory();
            } catch (error) {
                const execution = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime,
                    nodes: this.mcp.workflowNodes.length,
                    connections: this.mcp.workflowConnections.length,
                    success: false,
                    error: error.message
                };

                this.executionHistory.push(execution);
                this.saveExecutionHistory();
            }
        };
    }

    // Show execution history
    showExecutionHistory() {
        if (this.executionHistory.length === 0) {
            this.mcp.showToast('No execution history', 'info');
            return;
        }

        const historyHTML = `
            <div style="padding: 20px; max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">📊 Execution History</h3>
                <div style="display: grid; gap: 10px; margin-top: 15px;">
                    ${this.executionHistory.slice(-20).reverse().map(exec => `
                        <div style="
                            padding: 12px;
                            background: ${exec.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
                            border-left: 3px solid ${exec.success ? '#10b981' : '#ef4444'};
                            border-radius: 6px;
                            font-size: 12px;
                        ">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <strong>${exec.success ? '✓' : '✗'} Execution #${exec.id}</strong>
                                <span style="color: var(--text-secondary);">${new Date(exec.timestamp).toLocaleString()}</span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; color: var(--text-secondary);">
                                <span>Duration: ${exec.duration}ms</span>
                                <span>Nodes: ${exec.nodes}</span>
                                <span>Connections: ${exec.connections}</span>
                            </div>
                            ${exec.error ? `<div style="margin-top: 8px; color: #ef4444;">Error: ${exec.error}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.mcp.showToast(historyHTML, 'info', 20000);
    }

    // Export execution log
    exportExecutionLog() {
        const log = {
            exportDate: new Date().toISOString(),
            totalExecutions: this.executionHistory.length,
            executions: this.executionHistory
        };

        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `workflow-execution-log-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Execution log exported', {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Save execution history
    saveExecutionHistory() {
        try {
            // Keep only last 100 executions
            if (this.executionHistory.length > 100) {
                this.executionHistory = this.executionHistory.slice(-100);
            }
            localStorage.setItem('workflow_execution_history', JSON.stringify(this.executionHistory));
        } catch (error) {
            console.error('Failed to save execution history:', error);
        }
    }

    // Load execution history
    loadExecutionHistory() {
        try {
            const saved = localStorage.getItem('workflow_execution_history');
            if (saved) {
                this.executionHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load execution history:', error);
        }
    }

    // Setup undo/redo
    setupUndoRedo() {
        // Save state for undo
        this.saveStateForUndo = () => {
            const state = {
                nodes: JSON.parse(JSON.stringify(this.mcp.workflowNodes)),
                connections: JSON.parse(JSON.stringify(this.mcp.workflowConnections)),
                timestamp: Date.now()
            };

            this.undoStack.push(state);

            // Limit undo stack size
            if (this.undoStack.length > this.maxUndoSteps) {
                this.undoStack.shift();
            }

            // Clear redo stack when new action is performed
            this.redoStack = [];
        };

        // Intercept node adding
        const originalAddNodeToCanvas = this.mcp.addNodeToCanvas.bind(this.mcp);
        this.mcp.addNodeToCanvas = (nodeType, x, y) => {
            this.saveStateForUndo();
            return originalAddNodeToCanvas(nodeType, x, y);
        };
    }

    // Undo last action
    undo() {
        if (this.undoStack.length === 0) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Nothing to undo', {
                    type: 'info',
                    duration: 2000
                });
            }
            return;
        }

        // Save current state to redo stack
        const currentState = {
            nodes: JSON.parse(JSON.stringify(this.mcp.workflowNodes)),
            connections: JSON.parse(JSON.stringify(this.mcp.workflowConnections)),
            timestamp: Date.now()
        };
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack.pop();
        this.mcp.workflowNodes = previousState.nodes;
        this.mcp.workflowConnections = previousState.connections;
        this.mcp.renderWorkflowCanvas();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Undo successful', {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Redo last undone action
    redo() {
        if (this.redoStack.length === 0) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('Nothing to redo', {
                    type: 'info',
                    duration: 2000
                });
            }
            return;
        }

        // Save current state to undo stack
        this.saveStateForUndo();

        // Restore next state
        const nextState = this.redoStack.pop();
        this.mcp.workflowNodes = nextState.nodes;
        this.mcp.workflowConnections = nextState.connections;
        this.mcp.renderWorkflowCanvas();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Redo successful', {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z or Cmd+Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }

            // Ctrl+Shift+Z or Cmd+Shift+Z for redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.redo();
            }

            // Ctrl+S or Cmd+S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.mcp.saveWorkflow();
            }

            // Delete key to remove selected node
            if (e.key === 'Delete' && this.mcp.selectedNode) {
                e.preventDefault();
                this.saveStateForUndo();
                this.mcp.workflowNodes = this.mcp.workflowNodes.filter(n => n.id !== this.mcp.selectedNode.id);
                this.mcp.workflowConnections = this.mcp.workflowConnections.filter(c =>
                    c.from !== this.mcp.selectedNode.id && c.to !== this.mcp.selectedNode.id
                );
                this.mcp.selectedNode = null;
                this.mcp.renderWorkflowCanvas();
            }

            // Ctrl+D or Cmd+D for duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && this.mcp.selectedNode) {
                e.preventDefault();
                this.mcp.duplicateNode(this.mcp.selectedNode);
            }
        });
    }

    // Setup node validation
    setupNodeValidation() {
        this.validateWorkflow = () => {
            const errors = [];
            const warnings = [];

            // Check for disconnected nodes
            const connectedNodeIds = new Set();
            this.mcp.workflowConnections.forEach(conn => {
                connectedNodeIds.add(conn.from);
                connectedNodeIds.add(conn.to);
            });

            this.mcp.workflowNodes.forEach(node => {
                // Check if node is disconnected (except triggers)
                if (node.inputs > 0 && !connectedNodeIds.has(node.id)) {
                    warnings.push(`Node "${node.label}" (${node.id}) is not connected`);
                }

                // Check for missing required config
                if (node.type === 'http-request' && !node.config.url) {
                    errors.push(`HTTP Request node "${node.label}" is missing URL`);
                }
                if (node.type === 'file-read' && !node.config.path) {
                    errors.push(`File Read node "${node.label}" is missing file path`);
                }
                if (node.type === 'file-write' && !node.config.path) {
                    errors.push(`File Write node "${node.label}" is missing file path`);
                }
            });

            // Check for cycles (simple detection)
            const hasCycle = this.detectCycle();
            if (hasCycle) {
                errors.push('Workflow contains a cycle - this may cause infinite loops');
            }

            // Check for no trigger nodes
            const hasTrigger = this.mcp.workflowNodes.some(n =>
                n.type.startsWith('trigger-') || n.type === 'timer' || n.type === 'webhook'
            );
            if (!hasTrigger) {
                warnings.push('Workflow has no trigger node - it cannot start automatically');
            }

            return { errors, warnings, valid: errors.length === 0 };
        };
    }

    // Detect cycles in workflow
    detectCycle() {
        const graph = new Map();

        // Build adjacency list
        this.mcp.workflowNodes.forEach(node => {
            graph.set(node.id, []);
        });

        this.mcp.workflowConnections.forEach(conn => {
            if (graph.has(conn.from)) {
                graph.get(conn.from).push(conn.to);
            }
        });

        // DFS cycle detection
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycleDFS = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);

            const neighbors = graph.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycleDFS(neighbor)) {
                        return true;
                    }
                } else if (recursionStack.has(neighbor)) {
                    return true;
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        for (const nodeId of graph.keys()) {
            if (!visited.has(nodeId)) {
                if (hasCycleDFS(nodeId)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Validate and show results
    showValidationResults() {
        const result = this.validateWorkflow();

        let html = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">🔍 Workflow Validation</h3>
        `;

        if (result.valid) {
            html += `
                <div style="padding: 15px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 6px; margin-top: 15px;">
                    <strong style="color: #10b981;">✓ Workflow is valid</strong>
                    <p style="margin: 8px 0 0 0; font-size: 13px;">No errors found. Ready to execute.</p>
                </div>
            `;
        } else {
            html += `
                <div style="padding: 15px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 6px; margin-top: 15px;">
                    <strong style="color: #ef4444;">✗ Workflow has errors</strong>
                </div>
            `;
        }

        if (result.errors.length > 0) {
            html += '<div style="margin-top: 15px;"><strong>Errors:</strong><ul style="margin: 8px 0; padding-left: 20px;">';
            result.errors.forEach(error => {
                html += `<li style="color: #ef4444; font-size: 13px; margin: 4px 0;">${error}</li>`;
            });
            html += '</ul></div>';
        }

        if (result.warnings.length > 0) {
            html += '<div style="margin-top: 15px;"><strong>Warnings:</strong><ul style="margin: 8px 0; padding-left: 20px;">';
            result.warnings.forEach(warning => {
                html += `<li style="color: #f59e0b; font-size: 13px; margin: 4px 0;">${warning}</li>`;
            });
            html += '</ul></div>';
        }

        html += '</div>';

        this.mcp.showToast(html, result.valid ? 'success' : 'error', 10000);
    }

    // Highlight execution path in real-time
    highlightExecutingNode(nodeId) {
        this.currentExecutingNode = nodeId;

        // Add visual indicator to canvas
        const canvas = document.getElementById('workflow-canvas');
        if (!canvas) return;

        // Find node and add highlight
        const node = this.mcp.workflowNodes.find(n => n.id === nodeId);
        if (!node) return;

        // Re-render canvas with highlight
        this.mcp.renderWorkflowCanvas();

        // Add pulsing highlight effect
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.strokeRect(node.x - 2, node.y - 2, node.width + 4, node.height + 4);
        ctx.restore();

        // Update debug panel
        const debugNodeId = document.getElementById('debug-node-id');
        if (debugNodeId) {
            debugNodeId.textContent = `${node.label} (${nodeId})`;
            document.getElementById('debug-current-node').style.display = 'block';
        }
    }

    // Clear execution highlight
    clearExecutionHighlight() {
        this.currentExecutingNode = null;
        this.mcp.renderWorkflowCanvas();

        const debugCurrentNode = document.getElementById('debug-current-node');
        if (debugCurrentNode) {
            debugCurrentNode.style.display = 'none';
        }
    }

    // Setup node search
    setupNodeSearch() {
        this.searchNodes = (query) => {
            if (!query || query.trim() === '') {
                // Reset all nodes visibility
                this.mcp.workflowNodes.forEach(node => {
                    node.filtered = false;
                });
                this.mcp.renderWorkflowCanvas();
                return;
            }

            const lowerQuery = query.toLowerCase();
            let matchCount = 0;

            this.mcp.workflowNodes.forEach(node => {
                const matches =
                    node.label.toLowerCase().includes(lowerQuery) ||
                    node.type.toLowerCase().includes(lowerQuery) ||
                    JSON.stringify(node.config).toLowerCase().includes(lowerQuery);

                node.filtered = !matches;
                if (matches) matchCount++;
            });

            this.mcp.renderWorkflowCanvas();

            if (window.notificationSystem) {
                window.notificationSystem.showNotification(`Found ${matchCount} matching nodes`, {
                    type: 'info',
                    duration: 2000
                });
            }
        };
    }

    // Show node search dialog
    showNodeSearch() {
        const searchHTML = `
            <div style="padding: 20px; max-width: 500px;">
                <h3 style="margin-top: 0;">🔍 Search Nodes</h3>
                <input
                    type="text"
                    id="node-search-input"
                    class="form-control"
                    placeholder="Search by label, type, or config..."
                    style="width: 100%; margin-top: 15px;"
                    onkeyup="window.workflowEnhancements.searchNodes(this.value)"
                >
                <div style="margin-top: 15px; display: flex; gap: 8px;">
                    <button class="btn btn-sm" onclick="window.workflowEnhancements.searchNodes(''); this.closest('.toast').remove();">
                        Clear Filter
                    </button>
                    <button class="btn btn-sm" onclick="this.closest('.toast').remove();">
                        Close
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(searchHTML, 'info', 30000);

        // Focus input after a short delay
        setTimeout(() => {
            const input = document.getElementById('node-search-input');
            if (input) input.focus();
        }, 100);
    }

    // Setup workflow versioning
    setupWorkflowVersioning() {
        this.workflowVersions = [];
        this.loadWorkflowVersions();
    }

    // Save workflow version
    saveWorkflowVersion(name) {
        const version = {
            id: Date.now(),
            name: name || `Version ${this.workflowVersions.length + 1}`,
            timestamp: new Date().toISOString(),
            nodes: JSON.parse(JSON.stringify(this.mcp.workflowNodes)),
            connections: JSON.parse(JSON.stringify(this.mcp.workflowConnections)),
            nodeCount: this.mcp.workflowNodes.length,
            connectionCount: this.mcp.workflowConnections.length
        };

        this.workflowVersions.push(version);

        // Keep only last 20 versions
        if (this.workflowVersions.length > 20) {
            this.workflowVersions.shift();
        }

        localStorage.setItem('workflow_versions', JSON.stringify(this.workflowVersions));

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Version "${version.name}" saved`, {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Load workflow versions
    loadWorkflowVersions() {
        try {
            const saved = localStorage.getItem('workflow_versions');
            if (saved) {
                this.workflowVersions = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load workflow versions:', error);
        }
    }

    // Show version browser
    showVersionBrowser() {
        if (this.workflowVersions.length === 0) {
            this.mcp.showToast('No versions saved yet', 'info', 3000);
            return;
        }

        const versionsHTML = `
            <div style="padding: 20px; max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">📚 Workflow Versions</h3>
                <div style="display: grid; gap: 10px; margin-top: 15px;">
                    ${this.workflowVersions.slice().reverse().map(version => `
                        <div style="
                            padding: 12px;
                            background: var(--bg-secondary);
                            border: 1px solid var(--border-color);
                            border-radius: 6px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <div>
                                <strong style="font-size: 14px;">${version.name}</strong>
                                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                    ${new Date(version.timestamp).toLocaleString()} ·
                                    ${version.nodeCount} nodes, ${version.connectionCount} connections
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-xs" onclick="window.workflowEnhancements.restoreVersion(${version.id}); this.closest('.toast').remove();">
                                    Restore
                                </button>
                                <button class="btn btn-xs" onclick="window.workflowEnhancements.deleteVersion(${version.id}); this.closest('.toast').remove(); window.workflowEnhancements.showVersionBrowser();">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <input
                        type="text"
                        id="new-version-name"
                        class="form-control"
                        placeholder="Version name..."
                        style="margin-bottom: 8px;"
                    >
                    <button class="btn btn-sm btn-primary" onclick="
                        const name = document.getElementById('new-version-name').value;
                        window.workflowEnhancements.saveWorkflowVersion(name);
                        this.closest('.toast').remove();
                        window.workflowEnhancements.showVersionBrowser();
                    ">
                        Save Current as New Version
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(versionsHTML, 'info', 60000);
    }

    // Restore workflow version
    restoreVersion(versionId) {
        const version = this.workflowVersions.find(v => v.id === versionId);
        if (!version) return;

        this.saveStateForUndo();

        this.mcp.workflowNodes = JSON.parse(JSON.stringify(version.nodes));
        this.mcp.workflowConnections = JSON.parse(JSON.stringify(version.connections));
        this.mcp.renderWorkflowCanvas();
        this.updateWorkflowStats();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Restored version "${version.name}"`, {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Delete workflow version
    deleteVersion(versionId) {
        this.workflowVersions = this.workflowVersions.filter(v => v.id !== versionId);
        localStorage.setItem('workflow_versions', JSON.stringify(this.workflowVersions));

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Version deleted', {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Update workflow statistics
    updateWorkflowStats() {
        const nodeCount = this.mcp.workflowNodes.length;
        const connectionCount = this.mcp.workflowConnections.length;

        // Update stats display
        const nodeCountEl = document.getElementById('workflow-node-count');
        const connectionCountEl = document.getElementById('workflow-connection-count');
        const statusEl = document.getElementById('workflow-status');

        if (nodeCountEl) nodeCountEl.textContent = nodeCount;
        if (connectionCountEl) connectionCountEl.textContent = connectionCount;

        if (statusEl) {
            if (nodeCount === 0) {
                statusEl.textContent = 'Empty';
                statusEl.style.color = 'var(--text-secondary)';
            } else {
                const validation = this.validateWorkflow();
                if (validation.valid) {
                    statusEl.textContent = 'Valid';
                    statusEl.style.color = '#10b981';
                } else {
                    statusEl.textContent = `${validation.errors.length} errors`;
                    statusEl.style.color = '#ef4444';
                }
            }
        }
    }

    // Show workflow statistics dashboard
    showStatsDashboard() {
        const stats = {
            totalNodes: this.mcp.workflowNodes.length,
            totalConnections: this.mcp.workflowConnections.length,
            totalExecutions: this.executionHistory.length,
            successfulExecutions: this.executionHistory.filter(e => e.success).length,
            failedExecutions: this.executionHistory.filter(e => !e.success).length,
            averageDuration: this.executionHistory.length > 0
                ? Math.round(this.executionHistory.reduce((sum, e) => sum + e.duration, 0) / this.executionHistory.length)
                : 0,
            nodeTypes: {},
            savedVersions: this.workflowVersions.length,
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length
        };

        // Count node types
        this.mcp.workflowNodes.forEach(node => {
            stats.nodeTypes[node.type] = (stats.nodeTypes[node.type] || 0) + 1;
        });

        const statsHTML = `
            <div style="padding: 20px; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">📊 Workflow Statistics</h3>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                    <div style="padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${stats.totalNodes}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Total Nodes</div>
                    </div>

                    <div style="padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${stats.totalConnections}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Connections</div>
                    </div>

                    <div style="padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.successfulExecutions}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Successful Runs</div>
                    </div>

                    <div style="padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${stats.failedExecutions}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Failed Runs</div>
                    </div>

                    <div style="padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${stats.averageDuration}ms</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Avg Duration</div>
                    </div>

                    <div style="padding: 15px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${stats.savedVersions}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Saved Versions</div>
                    </div>
                </div>

                ${Object.keys(stats.nodeTypes).length > 0 ? `
                    <div style="margin-top: 25px;">
                        <h4 style="margin-bottom: 12px;">Node Types Distribution</h4>
                        <div style="display: grid; gap: 8px;">
                            ${Object.entries(stats.nodeTypes)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => `
                                    <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px; font-size: 13px;">
                                        <span>${type}</span>
                                        <span style="font-weight: bold;">${count}</span>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="margin-top: 25px;">
                    <h4 style="margin-bottom: 12px;">Recent Activity</h4>
                    <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; font-size: 13px;">
                        <div>Undo Stack: ${stats.undoStackSize} actions</div>
                        <div style="margin-top: 4px;">Redo Stack: ${stats.redoStackSize} actions</div>
                        <div style="margin-top: 4px;">Auto-save: ${this.autoSaveInterval ? 'Active' : 'Inactive'}</div>
                    </div>
                </div>
            </div>
        `;

        this.mcp.showToast(statsHTML, 'info', 30000);
    }

    // Setup node grouping
    setupNodeGrouping() {
        this.createNodeGroup = (name, nodeIds) => {
            const group = {
                id: 'group_' + Date.now(),
                name: name || `Group ${this.nodeGroups.length + 1}`,
                nodeIds: nodeIds || [],
                color: this.getRandomColor(),
                collapsed: false
            };

            this.nodeGroups.push(group);
            this.renderNodeGroups();

            if (window.notificationSystem) {
                window.notificationSystem.showNotification(`Group "${group.name}" created`, {
                    type: 'success',
                    duration: 2000
                });
            }

            return group;
        };
    }

    // Get random color for groups
    getRandomColor() {
        const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
            '#10b981', '#06b6d4', '#f97316', '#14b8a6'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Render node groups on canvas
    renderNodeGroups() {
        const canvas = document.getElementById('workflow-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        this.nodeGroups.forEach(group => {
            if (group.nodeIds.length === 0) return;

            // Find bounding box of all nodes in group
            const nodes = this.mcp.workflowNodes.filter(n => group.nodeIds.includes(n.id));
            if (nodes.length === 0) return;

            const minX = Math.min(...nodes.map(n => n.x)) - 20;
            const minY = Math.min(...nodes.map(n => n.y)) - 40;
            const maxX = Math.max(...nodes.map(n => n.x + n.width)) + 20;
            const maxY = Math.max(...nodes.map(n => n.y + n.height)) + 20;

            // Draw group background
            ctx.save();
            ctx.fillStyle = group.color + '20';
            ctx.strokeStyle = group.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            ctx.setLineDash([]);

            // Draw group label
            ctx.fillStyle = group.color;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(group.name, minX + 10, minY + 15);
            ctx.restore();
        });
    }

    // Show group management dialog
    showGroupManagement() {
        const groupsHTML = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">📦 Node Groups</h3>

                ${this.nodeGroups.length === 0 ? `
                    <p style="color: var(--text-secondary); text-align: center; padding: 30px 0;">
                        No groups created yet
                    </p>
                ` : `
                    <div style="display: grid; gap: 10px; margin-top: 15px;">
                        ${this.nodeGroups.map(group => `
                            <div style="
                                padding: 12px;
                                background: var(--bg-secondary);
                                border-left: 4px solid ${group.color};
                                border-radius: 6px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            ">
                                <div>
                                    <strong>${group.name}</strong>
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                        ${group.nodeIds.length} nodes
                                    </div>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-xs" onclick="window.workflowEnhancements.deleteGroup('${group.id}'); this.closest('.toast').remove(); window.workflowEnhancements.showGroupManagement();">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}

                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <input
                        type="text"
                        id="new-group-name"
                        class="form-control"
                        placeholder="Group name..."
                        style="margin-bottom: 8px;"
                    >
                    <button class="btn btn-sm btn-primary" onclick="
                        const name = document.getElementById('new-group-name').value;
                        window.workflowEnhancements.createGroupFromSelected(name);
                        this.closest('.toast').remove();
                    ">
                        Create Group from Selected Nodes
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(groupsHTML, 'info', 60000);
    }

    // Create group from selected nodes
    createGroupFromSelected(name) {
        // For now, just create an empty group - would need selection tracking
        this.createNodeGroup(name, []);
        this.showGroupManagement();
    }

    // Delete group
    deleteGroup(groupId) {
        this.nodeGroups = this.nodeGroups.filter(g => g.id !== groupId);
        this.mcp.renderWorkflowCanvas();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Group deleted', {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Setup workflow comments
    setupWorkflowComments() {
        this.addComment = (x, y, text) => {
            const comment = {
                id: 'comment_' + Date.now(),
                x: x,
                y: y,
                text: text,
                width: 200,
                height: 100,
                color: '#f59e0b'
            };

            this.workflowComments.push(comment);
            this.renderWorkflowComments();

            return comment;
        };
    }

    // Render workflow comments
    renderWorkflowComments() {
        const canvas = document.getElementById('workflow-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        this.workflowComments.forEach(comment => {
            ctx.save();

            // Draw comment box
            ctx.fillStyle = comment.color + '30';
            ctx.strokeStyle = comment.color;
            ctx.lineWidth = 2;
            ctx.fillRect(comment.x, comment.y, comment.width, comment.height);
            ctx.strokeRect(comment.x, comment.y, comment.width, comment.height);

            // Draw comment text
            ctx.fillStyle = '#000';
            ctx.font = '12px sans-serif';
            const lines = this.wrapText(comment.text, comment.width - 20);
            lines.forEach((line, i) => {
                ctx.fillText(line, comment.x + 10, comment.y + 25 + i * 15);
            });

            ctx.restore();
        });
    }

    // Wrap text to fit width
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (testLine.length * 7 < maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });

        if (currentLine) lines.push(currentLine);
        return lines;
    }

    // Show comment dialog
    showAddComment() {
        const commentHTML = `
            <div style="padding: 20px; max-width: 500px;">
                <h3 style="margin-top: 0;">💬 Add Comment</h3>
                <textarea
                    id="comment-text"
                    class="form-control"
                    placeholder="Enter comment text..."
                    rows="4"
                    style="width: 100%; margin-top: 15px; resize: vertical;"
                ></textarea>
                <div style="margin-top: 15px; display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-primary" onclick="
                        const text = document.getElementById('comment-text').value;
                        if (text) {
                            window.workflowEnhancements.addComment(100, 100, text);
                            window.mcp.renderWorkflowCanvas();
                        }
                        this.closest('.toast').remove();
                    ">
                        Add Comment
                    </button>
                    <button class="btn btn-sm" onclick="this.closest('.toast').remove();">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(commentHTML, 'info', 60000);
    }

    // Setup execution path tracing
    setupExecutionPathTracing() {
        this.traceExecutionPath = (startNodeId) => {
            this.executionPath = [];

            // BFS to find execution path
            const visited = new Set();
            const queue = [startNodeId];

            while (queue.length > 0) {
                const nodeId = queue.shift();
                if (visited.has(nodeId)) continue;

                visited.add(nodeId);
                this.executionPath.push(nodeId);

                // Find connected nodes
                const connections = this.mcp.workflowConnections.filter(c => c.from === nodeId);
                connections.forEach(conn => {
                    if (!visited.has(conn.to)) {
                        queue.push(conn.to);
                    }
                });
            }

            this.renderExecutionPath();
        };
    }

    // Render execution path
    renderExecutionPath() {
        const canvas = document.getElementById('workflow-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Highlight path nodes
        this.executionPath.forEach((nodeId, index) => {
            const node = this.mcp.workflowNodes.find(n => n.id === nodeId);
            if (!node) return;

            ctx.save();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);

            // Draw order number
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(`${index + 1}`, node.x - 25, node.y + 30);

            // Highlight node border
            ctx.strokeRect(node.x - 3, node.y - 3, node.width + 6, node.height + 6);
            ctx.restore();
        });
    }

    // Clear execution path
    clearExecutionPath() {
        this.executionPath = [];
        this.mcp.renderWorkflowCanvas();
    }

    // Show execution path dialog
    showExecutionPath() {
        const triggers = this.mcp.workflowNodes.filter(n =>
            n.type.startsWith('trigger-') || n.type === 'timer' || n.type === 'webhook'
        );

        if (triggers.length === 0) {
            this.mcp.showToast('No trigger nodes found in workflow', 'error', 3000);
            return;
        }

        const pathHTML = `
            <div style="padding: 20px; max-width: 500px;">
                <h3 style="margin-top: 0;">🛤️ Execution Path</h3>
                <p style="font-size: 13px; color: var(--text-secondary);">
                    Select a trigger node to visualize the execution path:
                </p>

                <div style="display: grid; gap: 8px; margin-top: 15px;">
                    ${triggers.map(trigger => `
                        <button class="btn btn-sm" style="text-align: left;" onclick="
                            window.workflowEnhancements.traceExecutionPath('${trigger.id}');
                            window.mcp.renderWorkflowCanvas();
                            this.closest('.toast').remove();
                        ">
                            ${trigger.icon} ${trigger.label}
                        </button>
                    `).join('')}
                </div>

                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button class="btn btn-sm" onclick="
                        window.workflowEnhancements.clearExecutionPath();
                        this.closest('.toast').remove();
                    ">
                        Clear Path Visualization
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(pathHTML, 'info', 60000);
    }

    // Export workflow in different formats
    exportWorkflowAdvanced(format) {
        const workflow = {
            name: 'workflow',
            nodes: this.mcp.workflowNodes,
            connections: this.mcp.workflowConnections,
            groups: this.nodeGroups,
            comments: this.workflowComments,
            metadata: {
                created: new Date().toISOString(),
                version: '2.0',
                nodeCount: this.mcp.workflowNodes.length,
                connectionCount: this.mcp.workflowConnections.length
            }
        };

        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(workflow, null, 2);
                filename = `workflow-${Date.now()}.json`;
                mimeType = 'application/json';
                break;

            case 'yaml':
                // Simple YAML conversion
                content = this.convertToYAML(workflow);
                filename = `workflow-${Date.now()}.yaml`;
                mimeType = 'text/yaml';
                break;

            case 'markdown':
                content = this.convertToMarkdown(workflow);
                filename = `workflow-${Date.now()}.md`;
                mimeType = 'text/markdown';
                break;

            default:
                content = JSON.stringify(workflow, null, 2);
                filename = `workflow-${Date.now()}.json`;
                mimeType = 'application/json';
        }

        // Download file
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Workflow exported as ${format.toUpperCase()}`, {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Convert workflow to YAML
    convertToYAML(workflow) {
        let yaml = `# Workflow Export\n`;
        yaml += `name: ${workflow.name}\n`;
        yaml += `created: ${workflow.metadata.created}\n\n`;

        yaml += `nodes:\n`;
        workflow.nodes.forEach(node => {
            yaml += `  - id: ${node.id}\n`;
            yaml += `    type: ${node.type}\n`;
            yaml += `    label: ${node.label}\n`;
            yaml += `    position: [${node.x}, ${node.y}]\n`;
        });

        yaml += `\nconnections:\n`;
        workflow.connections.forEach(conn => {
            yaml += `  - from: ${conn.from}\n`;
            yaml += `    to: ${conn.to}\n`;
        });

        return yaml;
    }

    // Convert workflow to Markdown
    convertToMarkdown(workflow) {
        let md = `# Workflow Documentation\n\n`;
        md += `**Created:** ${workflow.metadata.created}\n\n`;
        md += `**Statistics:**\n`;
        md += `- Nodes: ${workflow.metadata.nodeCount}\n`;
        md += `- Connections: ${workflow.metadata.connectionCount}\n\n`;

        md += `## Nodes\n\n`;
        workflow.nodes.forEach(node => {
            md += `### ${node.icon} ${node.label}\n`;
            md += `- **Type:** ${node.type}\n`;
            md += `- **ID:** ${node.id}\n`;
            if (Object.keys(node.config).length > 0) {
                md += `- **Config:** ${JSON.stringify(node.config, null, 2)}\n`;
            }
            md += `\n`;
        });

        md += `## Connections\n\n`;
        workflow.connections.forEach((conn, i) => {
            const fromNode = workflow.nodes.find(n => n.id === conn.from);
            const toNode = workflow.nodes.find(n => n.id === conn.to);
            md += `${i + 1}. ${fromNode?.label || conn.from} → ${toNode?.label || conn.to}\n`;
        });

        return md;
    }

    // Show export format dialog
    showExportFormats() {
        const exportHTML = `
            <div style="padding: 20px; max-width: 500px;">
                <h3 style="margin-top: 0;">📤 Export Workflow</h3>
                <p style="font-size: 13px; color: var(--text-secondary);">
                    Choose export format:
                </p>

                <div style="display: grid; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-sm" style="text-align: left; display: flex; align-items: center; gap: 10px;" onclick="
                        window.workflowEnhancements.exportWorkflowAdvanced('json');
                        this.closest('.toast').remove();
                    ">
                        <span style="font-size: 20px;">📄</span>
                        <div>
                            <strong>JSON Format</strong>
                            <div style="font-size: 11px; color: var(--text-secondary);">Full workflow data with metadata</div>
                        </div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; display: flex; align-items: center; gap: 10px;" onclick="
                        window.workflowEnhancements.exportWorkflowAdvanced('yaml');
                        this.closest('.toast').remove();
                    ">
                        <span style="font-size: 20px;">📋</span>
                        <div>
                            <strong>YAML Format</strong>
                            <div style="font-size: 11px; color: var(--text-secondary);">Human-readable configuration</div>
                        </div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; display: flex; align-items: center; gap: 10px;" onclick="
                        window.workflowEnhancements.exportWorkflowAdvanced('markdown');
                        this.closest('.toast').remove();
                    ">
                        <span style="font-size: 20px;">📝</span>
                        <div>
                            <strong>Markdown Documentation</strong>
                            <div style="font-size: 11px; color: var(--text-secondary);">Documentation with node details</div>
                        </div>
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(exportHTML, 'info', 60000);
    }

    // Show hotkeys guide
    showHotkeysGuide() {
        const hotkeysHTML = `
            <div style="padding: 20px; max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">⌨️ Keyboard Shortcuts</h3>

                <div style="display: grid; gap: 15px; margin-top: 20px;">
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">Editing</h4>
                        <div style="display: grid; gap: 6px; font-size: 13px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <span>Undo</span>
                                <kbd style="padding: 2px 8px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 3px;">Ctrl+Z</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <span>Redo</span>
                                <kbd style="padding: 2px 8px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 3px;">Ctrl+Shift+Z</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <span>Save Workflow</span>
                                <kbd style="padding: 2px 8px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 3px;">Ctrl+S</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <span>Delete Selected Node</span>
                                <kbd style="padding: 2px 8px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 3px;">Delete</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <span>Duplicate Selected Node</span>
                                <kbd style="padding: 2px 8px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 3px;">Ctrl+D</kbd>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">Features</h4>
                        <div style="display: grid; gap: 6px; font-size: 13px;">
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <strong>Debug Mode:</strong> Toggle debug panel for step-by-step execution
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <strong>Validation:</strong> Check workflow for errors and warnings
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <strong>Search:</strong> Filter nodes by label, type, or configuration
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <strong>Versions:</strong> Save and restore workflow versions
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <strong>Groups:</strong> Organize nodes into visual groups
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px;">
                                <strong>Path Tracing:</strong> Visualize execution flow from trigger
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">Tips</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                            <li>Drag nodes from the palette to the canvas</li>
                            <li>Click output ports and drag to input ports to create connections</li>
                            <li>Double-click nodes to edit their properties</li>
                            <li>Use auto-save to prevent data loss (saves every 30 seconds)</li>
                            <li>Export workflows in JSON, YAML, or Markdown formats</li>
                            <li>Create groups to organize complex workflows</li>
                            <li>Add comments to document your workflow logic</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        this.mcp.showToast(hotkeysHTML, 'info', 60000);
    }

    // Show quick actions menu
    showQuickActions() {
        const actionsHTML = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">⚡ Quick Actions</h3>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 20px;">
                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.mcp.validateWorkflow();
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">✓</div>
                        <strong>Validate</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">Check for errors</div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.mcp.executeWorkflow();
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">▶️</div>
                        <strong>Execute</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">Run workflow</div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.mcp.saveWorkflow();
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">💾</div>
                        <strong>Save</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">Save current state</div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.workflowEnhancements.saveWorkflowVersion('Quick Save ' + new Date().toLocaleTimeString());
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">📚</div>
                        <strong>Version</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">Save version</div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.mcp.showTemplateBrowser();
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">📋</div>
                        <strong>Templates</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">Browse templates</div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.mcp.showWorkflowStats();
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">📊</div>
                        <strong>Statistics</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">View stats</div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.mcp.searchWorkflowNodes();
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">🔍</div>
                        <strong>Search</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">Find nodes</div>
                    </button>

                    <button class="btn btn-sm" style="text-align: left; padding: 15px;" onclick="
                        window.mcp.showExportFormats();
                        this.closest('.toast').remove();
                    ">
                        <div style="font-size: 20px; margin-bottom: 5px;">📤</div>
                        <strong>Export</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px;">Export workflow</div>
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(actionsHTML, 'info', 60000);
    }

    // Add more advanced node types
    addMoreAdvancedNodes() {
        const additionalNodes = {
            'json-parse': {
                label: 'JSON Parse',
                icon: '📋',
                inputs: 1,
                outputs: 1,
                defaultConfig: { path: '' }
            },
            'json-stringify': {
                label: 'JSON Stringify',
                icon: '📝',
                inputs: 1,
                outputs: 1,
                defaultConfig: { indent: 2 }
            },
            'regex-match': {
                label: 'Regex Match',
                icon: '🔤',
                inputs: 1,
                outputs: 1,
                defaultConfig: { pattern: '.*', flags: 'g' }
            },
            'delay': {
                label: 'Delay',
                icon: '⏱️',
                inputs: 1,
                outputs: 1,
                defaultConfig: { duration: 1000 }
            },
            'parallel': {
                label: 'Parallel Execution',
                icon: '🔀',
                inputs: 1,
                outputs: 3,
                defaultConfig: { branches: 3 }
            },
            'batch': {
                label: 'Batch Processing',
                icon: '📦',
                inputs: 1,
                outputs: 1,
                defaultConfig: { batchSize: 10 }
            },
            'sort': {
                label: 'Sort',
                icon: '🔢',
                inputs: 1,
                outputs: 1,
                defaultConfig: { key: 'value', order: 'asc' }
            },
            'aggregate': {
                label: 'Aggregate',
                icon: '📊',
                inputs: 1,
                outputs: 1,
                defaultConfig: { operation: 'sum', field: 'value' }
            },
            'crypto-hash': {
                label: 'Hash',
                icon: '🔐',
                inputs: 1,
                outputs: 1,
                defaultConfig: { algorithm: 'sha256' }
            },
            'crypto-encrypt': {
                label: 'Encrypt',
                icon: '🔒',
                inputs: 1,
                outputs: 1,
                defaultConfig: { algorithm: 'aes-256-cbc', key: '' }
            },
            'crypto-decrypt': {
                label: 'Decrypt',
                icon: '🔓',
                inputs: 1,
                outputs: 1,
                defaultConfig: { algorithm: 'aes-256-cbc', key: '' }
            },
            'compress': {
                label: 'Compress',
                icon: '🗜️',
                inputs: 1,
                outputs: 1,
                defaultConfig: { format: 'gzip' }
            },
            'decompress': {
                label: 'Decompress',
                icon: '📂',
                inputs: 1,
                outputs: 1,
                defaultConfig: { format: 'gzip' }
            },
            'queue': {
                label: 'Queue',
                icon: '📥',
                inputs: 1,
                outputs: 1,
                defaultConfig: { maxSize: 100, strategy: 'fifo' }
            },
            'rate-limit': {
                label: 'Rate Limit',
                icon: '⏳',
                inputs: 1,
                outputs: 1,
                defaultConfig: { maxRequests: 10, windowMs: 60000 }
            }
        };

        // Merge with existing node types
        Object.assign(this.advancedNodeTypes, additionalNodes);

        return additionalNodes;
    }

    // Show comprehensive help
    showComprehensiveHelp() {
        const helpHTML = `
            <div style="padding: 20px; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0;">📖 Workflow Builder Guide</h3>

                <div style="display: grid; gap: 20px; margin-top: 20px;">
                    <section>
                        <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">Getting Started</h4>
                        <p style="margin: 0; font-size: 13px; line-height: 1.6;">
                            The Workflow Builder lets you create automated D-Bus workflows by connecting nodes.
                            Each node performs a specific task, and connections define the data flow.
                        </p>
                    </section>

                    <section>
                        <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">Node Categories</h4>
                        <div style="font-size: 13px;">
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 6px;">
                                <strong>🎯 Triggers:</strong> Start workflow execution (Manual, D-Bus Signal, Timer, Webhook)
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 6px;">
                                <strong>🌐 HTTP & Network:</strong> Make API calls and handle webhooks
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 6px;">
                                <strong>📁 Files:</strong> Read and write files with various encodings
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 6px;">
                                <strong>🔄 Data Processing:</strong> Filter, map, reduce, and transform data
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 6px;">
                                <strong>⚙️ Advanced:</strong> Loops, caching, error handling, database queries
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 6px;">
                                <strong>📊 D-Bus:</strong> Call methods, listen to signals, read properties
                            </div>
                            <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 6px;">
                                <strong>📤 Output:</strong> Send notifications, log messages, display results
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">Features</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                            <li><strong>Auto-save:</strong> Saves every 30 seconds to prevent data loss</li>
                            <li><strong>Undo/Redo:</strong> Up to 50 steps of history</li>
                            <li><strong>Validation:</strong> Checks for errors, cycles, and missing configs</li>
                            <li><strong>Templates:</strong> 11 pre-built workflows for common use cases</li>
                            <li><strong>Versioning:</strong> Save up to 20 named versions</li>
                            <li><strong>Search:</strong> Find nodes by label, type, or config</li>
                            <li><strong>Groups:</strong> Organize nodes visually</li>
                            <li><strong>Comments:</strong> Add documentation to workflows</li>
                            <li><strong>Path Tracing:</strong> Visualize execution flow</li>
                            <li><strong>Export:</strong> JSON, YAML, or Markdown formats</li>
                            <li><strong>Debug Mode:</strong> Step-by-step execution with logging</li>
                            <li><strong>Statistics:</strong> Track executions and performance</li>
                        </ul>
                    </section>

                    <section>
                        <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">Quick Start</h4>
                        <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                            <li>Open a trigger category in the node palette (left sidebar)</li>
                            <li>Drag a trigger node (e.g., "Manual Start") to the canvas</li>
                            <li>Add processing nodes (D-Bus call, HTTP request, etc.)</li>
                            <li>Connect nodes by dragging from output ports to input ports</li>
                            <li>Double-click nodes to configure their properties</li>
                            <li>Click "Validate" to check for errors</li>
                            <li>Click "Execute" to run your workflow</li>
                        </ol>
                    </section>

                    <section style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 6px;">
                        <h4 style="margin: 0 0 10px 0;">💡 Pro Tips</h4>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
                            <li>Use Ctrl+S to save frequently while building</li>
                            <li>Create versions before major changes</li>
                            <li>Use the Stats dashboard to monitor workflow health</li>
                            <li>Group related nodes to keep workflows organized</li>
                            <li>Add comments to explain complex logic</li>
                            <li>Use path tracing to understand execution flow</li>
                            <li>Export to Markdown for documentation</li>
                        </ul>
                    </section>
                </div>
            </div>
        `;

        this.mcp.showToast(helpHTML, 'info', 120000);
    }
}

// Initialize workflow enhancements when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.workflowEnhancements = new WorkflowEnhancements(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.workflowEnhancements.init();
            window.workflowEnhancements.loadExecutionHistory();
        });
    } else {
        window.workflowEnhancements.init();
        window.workflowEnhancements.loadExecutionHistory();
    }

    // Add methods to global mcp object
    window.mcp.recoverAutoSave = () => window.workflowEnhancements.recoverAutoSave();
    window.mcp.showTemplateBrowser = () => window.workflowEnhancements.showTemplateBrowser();
    window.mcp.toggleWorkflowDebug = () => window.workflowEnhancements.toggleDebugMode();
    window.mcp.undoWorkflow = () => window.workflowEnhancements.undo();
    window.mcp.redoWorkflow = () => window.workflowEnhancements.redo();
    window.mcp.validateWorkflow = () => window.workflowEnhancements.showValidationResults();
    window.mcp.searchWorkflowNodes = () => window.workflowEnhancements.showNodeSearch();
    window.mcp.showWorkflowVersions = () => window.workflowEnhancements.showVersionBrowser();
    window.mcp.showWorkflowStats = () => window.workflowEnhancements.showStatsDashboard();
    window.mcp.saveWorkflowVersion = (name) => window.workflowEnhancements.saveWorkflowVersion(name);
    window.mcp.showNodeGroups = () => window.workflowEnhancements.showGroupManagement();
    window.mcp.addWorkflowComment = () => window.workflowEnhancements.showAddComment();
    window.mcp.showExecutionPath = () => window.workflowEnhancements.showExecutionPath();
    window.mcp.showExportFormats = () => window.workflowEnhancements.showExportFormats();
    window.mcp.showHotkeysGuide = () => window.workflowEnhancements.showHotkeysGuide();
    window.mcp.showQuickActions = () => window.workflowEnhancements.showQuickActions();
    window.mcp.showComprehensiveHelp = () => window.workflowEnhancements.showComprehensiveHelp();
}
