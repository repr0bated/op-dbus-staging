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
    }

    // Initialize enhancements
    init() {
        this.setupAutoSave();
        this.setupDebugControls();
        this.addAdvancedNodeTypes();
        this.setupExecutionMonitor();
        this.addMoreTemplates();

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
}
