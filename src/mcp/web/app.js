// MCP Control Center Application
class MCPControlCenter {
    constructor() {
        this.ws = null;
        this.tools = [];
        this.agents = [];
        this.services = [];
        this.logs = [];
        this.stats = {
            uptime: 0,
            requestCount: 0,
            activeAgents: 0,
            availableTools: 0
        };
        this.currentTool = null;
        this.activityFeed = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Workflow builder state
        this.workflowNodes = [];
        this.workflowConnections = [];
        this.workflowZoom = 1;
        this.selectedNode = null;
        this.draggedNode = null;
        this.connectionStart = null;
        this.nodeIdCounter = 0;
        this.canvasOffset = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupEventListeners();
        this.setupNavigation();
        this.loadInitialData();
        this.startUpdateTimers();
        this.checkTheme();
    }

    // WebSocket Connection
    setupWebSocket() {
        // For now, show as connected since the chat server is working
        // WebSocket will be implemented for real-time updates in the future
        console.log('MCP Control Center initialized');
        this.updateConnectionStatus('connected');
        this.addActivity('MCP Control Center loaded - AI AI available');

        // Optional: Try to connect to WebSocket for real-time updates
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected - real-time updates enabled');
                this.addActivity('Real-time updates connected');
            };

            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(JSON.parse(event.data));
            };

            this.ws.onerror = (error) => {
                console.log('WebSocket not available - using basic mode');
                // Don't change status to error since basic functionality works
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected - continuing in basic mode');
                // Don't change status since basic functionality still works
            };
        } catch (error) {
            console.log('WebSocket initialization failed - using basic mode');
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.setupWebSocket(), delay);
        } else {
            this.showToast('Connection lost. Please refresh the page.', 'error');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status':
                this.updateStats(data.data);
                break;
            case 'agent_update':
                this.updateAgents(data.data);
                break;
            case 'log':
                this.addLog(data.data);
                break;
            case 'activity':
                this.addActivity(data.message, data.level);
                break;
            case 'tool_result':
                this.handleToolResult(data.data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Dashboard refresh
        document.getElementById('refresh-dashboard').addEventListener('click', () => {
            this.refreshDashboard();
        });

        // Tool search
        document.getElementById('tool-search').addEventListener('input', (e) => {
            this.filterTools(e.target.value);
        });

        // Log level filter
        document.getElementById('log-level').addEventListener('change', (e) => {
            this.filterLogs(e.target.value);
        });

        // Chat functionality
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }

        const chatSendBtn = document.getElementById('chat-send-btn');
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Save workflow
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const activeSection = document.querySelector('.section.active');
                if (activeSection && activeSection.id === 'workflow') {
                    e.preventDefault();
                    this.saveWorkflow();
                }
            }
            // Ctrl/Cmd + E: Execute workflow
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                const activeSection = document.querySelector('.section.active');
                if (activeSection && activeSection.id === 'workflow') {
                    e.preventDefault();
                    this.executeWorkflow();
                }
            }
            // Delete/Backspace: Delete selected node
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNode) {
                const activeSection = document.querySelector('.section.active');
                if (activeSection && activeSection.id === 'workflow') {
                    const focusedElement = document.activeElement;
                    if (focusedElement.tagName !== 'INPUT' && focusedElement.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.deleteNode(this.selectedNode.id);
                    }
                }
            }
            // Escape: Deselect node
            if (e.key === 'Escape' && this.selectedNode) {
                this.selectedNode = null;
                this.renderWorkflowCanvas();
                document.getElementById('node-properties').innerHTML = '<div class="properties-placeholder"><p>Select a node to edit its properties</p></div>';
            }
            // Ctrl/Cmd + D: Duplicate node
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && this.selectedNode) {
                const activeSection = document.querySelector('.section.active');
                if (activeSection && activeSection.id === 'workflow') {
                    e.preventDefault();
                    this.duplicateNode(this.selectedNode.id);
                }
            }
            // ? key: Show keyboard shortcuts
            if (e.key === '?') {
                this.showKeyboardShortcuts();
            }
        });
    }

    duplicateNode(nodeId) {
        const node = this.workflowNodes.find(n => n.id === nodeId);
        if (!node) return;

        const newNode = {
            ...JSON.parse(JSON.stringify(node)), // Deep copy
            id: `node_${this.nodeIdCounter++}`,
            x: node.x + 30, // Offset slightly
            y: node.y + 30,
            config: { ...node.config }
        };

        this.workflowNodes.push(newNode);
        this.selectedNode = newNode;
        this.renderWorkflowCanvas();
        this.showNodeProperties(newNode);
        this.showToast('Node duplicated', 'success');
    }

    showKeyboardShortcuts() {
        const shortcuts = `
            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; max-width: 600px;">
                <h3 style="margin: 0 0 15px 0; color: var(--color-primary);">⌨️ Keyboard Shortcuts</h3>
                <div style="display: grid; gap: 10px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <span><kbd>Ctrl/Cmd + S</kbd></span>
                        <span style="color: var(--text-secondary);">Save workflow</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <span><kbd>Ctrl/Cmd + E</kbd></span>
                        <span style="color: var(--text-secondary);">Execute workflow</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <span><kbd>Ctrl/Cmd + D</kbd></span>
                        <span style="color: var(--text-secondary);">Duplicate selected node</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <span><kbd>Delete/Backspace</kbd></span>
                        <span style="color: var(--text-secondary);">Delete selected node</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <span><kbd>Escape</kbd></span>
                        <span style="color: var(--text-secondary);">Deselect node</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
                        <span><kbd>Right-click connection</kbd></span>
                        <span style="color: var(--text-secondary);">Delete connection</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                        <span><kbd>?</kbd></span>
                        <span style="color: var(--text-secondary);">Show this help</span>
                    </div>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <h4 style="margin: 0 0 10px 0; font-size: 13px; color: var(--text-primary);">💡 Tips</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                        <li>Drag nodes from the palette onto the canvas</li>
                        <li>Click and drag between ports to create connections</li>
                        <li>Use templates for quick workflow creation</li>
                        <li>Export workflows to share with others</li>
                        <li>Workflows must have at least one trigger node</li>
                    </ul>
                </div>
                <button class="btn btn-sm btn-primary" onclick="this.closest('.toast').remove()" style="margin-top: 15px; width: 100%;">Got it!</button>
            </div>
        `;
        this.showToast(shortcuts, 'info', 15000);
    }

    showWorkflowHelp() {
        const help = `
            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin: 0 0 15px 0; color: var(--color-primary);">📖 Workflow Builder Guide</h3>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px;">🎯 Getting Started</h4>
                    <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                        The Workflow Builder lets you create visual automation workflows by connecting nodes.
                        Each node performs a specific action, and connections define the flow of data.
                    </p>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px;">📦 Node Types</h4>
                    <div style="display: grid; gap: 8px; font-size: 12px;">
                        <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                            <strong>⚡ Triggers:</strong> Start points for workflows (Manual Start, D-Bus Signal)
                        </div>
                        <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                            <strong>📞 D-Bus Calls:</strong> Interact with system services (Method Call, Get/Set Property)
                        </div>
                        <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                            <strong>🔀 Logic:</strong> Control flow (Condition, Transform, Delay)
                        </div>
                        <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                            <strong>📤 Output:</strong> Send results (Log, Notification)
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px;">🔗 Creating Workflows</h4>
                    <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.8;">
                        <li>Drag a Trigger node from the palette to the canvas</li>
                        <li>Add action nodes (D-Bus calls, logic, outputs)</li>
                        <li>Connect nodes by clicking and dragging between ports</li>
                        <li>Configure each node's properties in the right panel</li>
                        <li>Validate your workflow before execution</li>
                    </ol>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px;">💾 Saving & Sharing</h4>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                        • <strong>Save:</strong> Store in browser localStorage<br>
                        • <strong>Export:</strong> Download as JSON file<br>
                        • <strong>Import:</strong> Load from JSON file<br>
                        • <strong>Templates:</strong> Quick start with pre-built workflows
                    </p>
                </div>

                <button class="btn btn-sm btn-primary" onclick="this.closest('.toast').remove()" style="width: 100%;">Close</button>
            </div>
        `;
        this.showToast(help, 'info', 20000);
    }

    // Navigation
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                this.navigateTo(target);
            });
        });
    }

    navigateTo(section) {
        // Update nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`.nav-link[href="#${section}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        // Load section-specific data
        this.loadSectionData(section);
    }

    loadSectionData(section) {
        switch (section) {
            case 'tools':
                this.loadTools();
                break;
            case 'agents':
                this.loadAgents();
                break;
            case 'discovery':
                this.loadServices();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }

    // Initial Data Load
    async loadInitialData() {
        await this.loadStatus();
        await this.loadTools();
        await this.loadAgents();
        await this.loadServices(); // Load any previously discovered services
    }

    async loadStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            if (data.success) {
                this.updateStats(data.data);
            }
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    }

    async loadTools() {
        try {
            const response = await fetch('/api/tools');
            const data = await response.json();
            if (data.success) {
                this.tools = data.data.tools || [];
                this.renderTools();
                this.stats.availableTools = this.tools.length;
                this.updateStatDisplay('available-tools', this.tools.length);
            }
        } catch (error) {
            console.error('Failed to load tools:', error);
        }
    }

    async loadAgents() {
        try {
            const response = await fetch('/api/agents');
            const data = await response.json();
            if (data.success) {
                this.agents = data.data || [];
                this.renderAgents();
                this.stats.activeAgents = this.agents.length;
                this.updateStatDisplay('active-agents', this.agents.length);
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    }

    async loadServices() {
        try {
            console.log('📡 Loading services from /api/discovery/services');
            const response = await fetch('/api/discovery/services');
            console.log('📥 Services response received:', response.status);
            const data = await response.json();
            console.log('📄 Services data:', data);

            if (data.success) {
                this.services = data.data || [];
                console.log(`📋 Loaded ${this.services.length} services`);
                console.log('🎨 Calling renderDiscoveryResults()...');
                this.renderDiscoveryResults();
                console.log('✅ Discovery results rendered');
            } else {
                console.error('❌ Services API returned error:', data.error);
            }
        } catch (error) {
            console.error('❌ Failed to load services:', error);
        }
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/logs');
            const data = await response.json();
            if (data.success) {
                this.logs = data.data || [];
                this.renderLogs();
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
            // Fall back to empty logs
            this.renderLogs();
        }
    }

    // Rendering Functions
    renderTools() {
        const grid = document.getElementById('tools-grid');
        grid.innerHTML = '';

        this.tools.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.innerHTML = `
                <div class="tool-name">${this.escapeHtml(tool.name)}</div>
                <div class="tool-description">${this.escapeHtml(tool.description || 'No description')}</div>
                <div class="tool-meta">
                    ${tool.inputSchema?.required?.map(req => 
                        `<span class="tool-tag">Required: ${req}</span>`
                    ).join('') || ''}
                </div>
            `;
            card.addEventListener('click', () => this.openToolTest(tool));
            grid.appendChild(card);
        });
    }

    renderAgents() {
        const tbody = document.getElementById('agents-tbody');
        tbody.innerHTML = '';

        if (this.agents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No active agents</td></tr>';
            return;
        }

        this.agents.forEach(agent => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${this.escapeHtml(agent.id)}</code></td>
                <td>${this.escapeHtml(agent.agent_type)}</td>
                <td><span class="badge badge-${agent.status === 'running' ? 'success' : 'warning'}">${agent.status}</span></td>
                <td>${agent.task || '-'}</td>
                <td>${this.formatUptime(agent.uptime || 0)}</td>
                <td>
                    <button class="btn btn-sm" onclick="mcp.sendTaskToAgent('${agent.id}')">Task</button>
                    <button class="btn btn-sm btn-danger" onclick="mcp.killAgent('${agent.id}')">Kill</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async discoverServices() {
        console.log('🔍 Starting D-Bus service discovery...');
        this.showToast('Discovering services...', 'info');

        // Show loading state
        const discoverBtn = document.querySelector('.discovery-controls .btn-primary');
        const originalText = discoverBtn ? discoverBtn.innerHTML : '';
        if (discoverBtn) {
            discoverBtn.disabled = true;
            discoverBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="animation: spin 1s linear infinite;"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30" stroke-dashoffset="0"/></svg> Discovering...';
        }

        try {
            const response = await fetch('/api/discovery/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Discovery completed');
                this.services = result.data || [];
                this.renderDiscoveryResults();
                this.showToast(`Discovered ${this.services.length} services`, 'success');
                this.updateDiscoveryStats();
            } else {
                console.error('❌ Discovery failed:', result.error);
                this.showToast('Discovery failed', 'error');
            }
        } catch (error) {
            console.error('❌ Discovery request error:', error);
            this.showToast('Discovery request failed', 'error');
        } finally {
            if (discoverBtn) {
                discoverBtn.disabled = false;
                discoverBtn.innerHTML = originalText;
            }
        }
    }

    updateDiscoveryStats() {
        const statsDiv = document.getElementById('discovery-stats');
        if (!statsDiv) return;

        statsDiv.style.display = 'block';
        document.getElementById('stat-services').textContent = this.services.length;

        // Count objects, interfaces, methods
        let objects = 0, interfaces = 0, methods = 0;
        this.services.forEach(service => {
            if (service.objects) objects += service.objects.length || 0;
            if (service.interfaces) interfaces += service.interfaces.length || 0;
            if (service.methods) methods += service.methods.length || 0;
        });

        document.getElementById('stat-objects').textContent = objects;
        document.getElementById('stat-interfaces').textContent = interfaces;
        document.getElementById('stat-methods').textContent = methods;
    }

    renderDiscoveryResults() {
        const container = document.getElementById('discovery-results');
        if (!container) {
            console.warn('Discovery results container not found');
            return;
        }

        const categories = this.groupServicesByCategory();

        container.innerHTML = `
            <div class="discovery-categories">
                ${Object.entries(categories).map(([category, services]) => `
                    <div class="category-section">
                        <h3>${category} (${Array.isArray(services) ? services.length : 0})</h3>
                        <div class="service-list">
                            ${(Array.isArray(services) ? services : []).map(service => `
                                <div class="service-item expandable" onclick="toggleServiceDetails('${service.name.replace(/[^a-zA-Z0-9]/g, '_')}')">
                                    <div class="service-header">
                                        <span class="service-name">${this.escapeHtml(service.name)}</span>
                                        <span class="service-status ${service.status || 'unknown'}">${service.status || 'unknown'}</span>
                                        <span class="service-type">${service.type || 'service'}</span>
                                    </div>
                                    <div class="service-path">${this.escapeHtml(service.path || '')}</div>
                                    <div class="service-description">${this.escapeHtml(service.description || 'No description available')}</div>

                                    <div class="service-details" id="details_${service.name.replace(/[^a-zA-Z0-9]/g, '_')}" style="display: none;">
                                        ${this.renderServiceDetails(service)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderServiceDetails(service) {
        let details = '';

        // Status and basic info
        if (service.sub_status) {
            details += `<div class="detail-row"><strong>Sub-status:</strong> ${service.sub_status}</div>`;
        }

        // Resource usage
        if (service.resources) {
            details += `<div class="detail-row"><strong>Resources:</strong> CPU: ${service.resources.cpu}, Memory: ${service.resources.memory}</div>`;
        }

        if (service.memory_current) {
            details += `<div class="detail-row"><strong>Memory Usage:</strong> Current: ${service.memory_current}, Peak: ${service.memory_peak}</div>`;
        }

        if (service.cpu_usage_nsec) {
            details += `<div class="detail-row"><strong>CPU Time:</strong> ${Math.round(parseInt(service.cpu_usage_nsec) / 1000000)}ms</div>`;
        }

        // Systemd service specific
        if (service.type === 'systemd-service') {
            details += `<div class="detail-row"><strong>Loaded:</strong> ${service.loaded ? 'Yes' : 'No'}</div>`;
            details += `<div class="detail-row"><strong>Enabled:</strong> ${service.enabled ? 'Yes' : 'No'}</div>`;
            if (service.exec_main_pid) {
                details += `<div class="detail-row"><strong>Main PID:</strong> ${service.exec_main_pid}</div>`;
            }
            if (service.tasks_current) {
                details += `<div class="detail-row"><strong>Tasks:</strong> ${service.tasks_current}</div>`;
            }
            if (service.control_group) {
                details += `<div class="detail-row"><strong>Control Group:</strong> ${service.control_group}</div>`;
            }
        }

        // D-Bus service specific
        if (service.type === 'dbus-service') {
            if (service.interfaces && service.interfaces.length > 0) {
                details += `<div class="detail-row"><strong>Interfaces:</strong> ${service.interfaces.join(', ')}</div>`;
            }
            if (service.methods && service.methods.length > 0) {
                details += `<div class="detail-row"><strong>Methods:</strong> ${service.methods.slice(0, 3).join(', ')}${service.methods.length > 3 ? '...' : ''}</div>`;
            }
            if (service.properties) {
                details += `<div class="detail-section"><strong>Properties:</strong></div>`;
                Object.entries(service.properties).slice(0, 5).forEach(([key, value]) => {
                    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                    details += `<div class="detail-row">• ${key}: ${displayValue}</div>`;
                });
            }
            if (service.dependencies) {
                details += `<div class="detail-row"><strong>Dependencies:</strong> ${service.dependencies.join(', ')}</div>`;
            }
        }

        // Network service specific
        if (service.type === 'network-service' || service.type === 'container-runtime') {
            if (service.version) {
                details += `<div class="detail-row"><strong>Version:</strong> ${service.version}</div>`;
            }
            if (service.socket_path) {
                details += `<div class="detail-row"><strong>Socket:</strong> ${service.socket_path}</div>`;
            }
            if (service.config_file) {
                details += `<div class="detail-row"><strong>Config:</strong> ${service.config_file}</div>`;
            }
        }

        // Docker specific
        if (service.name === 'docker') {
            details += `<div class="detail-row"><strong>Containers:</strong> ${service.containers_running} running, ${service.containers_stopped} stopped</div>`;
            details += `<div class="detail-row"><strong>Images:</strong> ${service.images_count}</div>`;
            details += `<div class="detail-row"><strong>Storage Driver:</strong> ${service.storage_driver}</div>`;
            details += `<div class="detail-row"><strong>Data Usage:</strong> ${service.data_space_used} used, ${service.data_space_available} available</div>`;
        }

        // Netmaker specific
        if (service.name === 'netmaker') {
            details += `<div class="detail-row"><strong>Peers:</strong> ${service.peers}</div>`;
            details += `<div class="detail-row"><strong>Networks:</strong> ${service.networks.join(', ')}</div>`;
            details += `<div class="detail-row"><strong>Listen Port:</strong> ${service.listen_port}</div>`;
            details += `<div class="detail-row"><strong>MTU:</strong> ${service.mtu}</div>`;
        }

        // OVS specific
        if (service.name === 'openvswitch.service') {
            details += `<div class="detail-row"><strong>OVS Version:</strong> ${service.ovs_version}</div>`;
            details += `<div class="detail-row"><strong>Bridges:</strong> ${service.bridge_count}</div>`;
            details += `<div class="detail-row"><strong>Ports:</strong> ${service.port_count}</div>`;
            details += `<div class="detail-row"><strong>Flows:</strong> ${service.flow_count}</div>`;
        }

        // Chrony specific
        if (service.name === 'chrony.service') {
            details += `<div class="detail-row"><strong>NTP Sources:</strong> ${service.ntp_sources.join(', ')}</div>`;
            details += `<div class="detail-row"><strong>Stratum:</strong> ${service.stratum}</div>`;
            details += `<div class="detail-row"><strong>Offset:</strong> ${service.offset}</div>`;
        }

        // Filesystem specific
        if (service.type === 'kernel-filesystem') {
            details += `<div class="detail-row"><strong>Mount Point:</strong> ${service.mount_point}</div>`;
            details += `<div class="detail-row"><strong>Filesystem:</strong> ${service.filesystem_type}</div>`;
            details += `<div class="detail-row"><strong>Mount Options:</strong> ${service.mount_options}</div>`;

            if (service.name === '/proc') {
                details += `<div class="detail-row"><strong>Processes:</strong> ${service.process_count}</div>`;
                details += `<div class="detail-row"><strong>Threads:</strong> ${service.thread_count}</div>`;
                details += `<div class="detail-row"><strong>Kernel:</strong> ${service.kernel_version}</div>`;
                details += `<div class="detail-row"><strong>Uptime:</strong> ${Math.round(service.uptime_seconds / 3600)} hours</div>`;
                details += `<div class="detail-row"><strong>Load Average:</strong> ${service.load_average.join(', ')}</div>`;
            }

            if (service.name === '/sys') {
                details += `<div class="detail-row"><strong>Subsystems:</strong> ${service.subsystem_count}</div>`;
                details += `<div class="detail-row"><strong>Devices:</strong> ${service.device_count}</div>`;
                details += `<div class="detail-row"><strong>Drivers:</strong> ${service.driver_count}</div>`;
                details += `<div class="detail-row"><strong>Bus Types:</strong> ${service.bus_types.join(', ')}</div>`;
            }

            if (service.name === '/dev') {
                details += `<div class="detail-row"><strong>Device Nodes:</strong> ${service.device_nodes}</div>`;
                details += `<div class="detail-row"><strong>Block Devices:</strong> ${service.block_devices}</div>`;
                details += `<div class="detail-row"><strong>Character Devices:</strong> ${service.character_devices}</div>`;
                details += `<div class="detail-row"><strong>Mounted Devices:</strong> ${service.mounted_devices.join(', ')}</div>`;
            }
        }

        return `<div class="service-detail-content">${details}</div>`;
    }

    renderLogs() {
        const container = document.getElementById('logs-container');
        container.innerHTML = '';

        this.logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${log.level}`;
            entry.innerHTML = `
                <span class="log-timestamp">${this.formatTime(log.timestamp)}</span>
                <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                <span class="log-message">${this.escapeHtml(log.message)}</span>
            `;
            container.appendChild(entry);
        });

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    // Tool Testing
    openToolTest(tool) {
        this.currentTool = tool;
        document.getElementById('test-tool-name').textContent = tool.name;
        
        // Set default parameters based on schema
        const params = {};
        if (tool.inputSchema?.properties) {
            Object.entries(tool.inputSchema.properties).forEach(([key, schema]) => {
                if (schema.default !== undefined) {
                    params[key] = schema.default;
                } else if (schema.type === 'string') {
                    params[key] = '';
                } else if (schema.type === 'number') {
                    params[key] = 0;
                } else if (schema.type === 'boolean') {
                    params[key] = false;
                } else if (schema.type === 'array') {
                    params[key] = [];
                } else if (schema.type === 'object') {
                    params[key] = {};
                }
            });
        }
        
        document.getElementById('tool-params').value = JSON.stringify(params, null, 2);
        document.getElementById('tool-result').textContent = '';
        document.getElementById('tool-test-panel').style.display = 'block';
    }

    closeToolTest() {
        document.getElementById('tool-test-panel').style.display = 'none';
        this.currentTool = null;
    }

    clearToolTest() {
        document.getElementById('tool-params').value = '{}';
        document.getElementById('tool-result').textContent = '';
    }

    async executeToolTest() {
        if (!this.currentTool) return;

        const paramsText = document.getElementById('tool-params').value;
        let params;
        try {
            params = JSON.parse(paramsText);
        } catch (e) {
            this.showToast('Invalid JSON parameters', 'error');
            return;
        }

        const resultEl = document.getElementById('tool-result');
        resultEl.textContent = 'Executing...';

        try {
            const response = await fetch(`/api/tools/${this.currentTool.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (data.success) {
                resultEl.textContent = JSON.stringify(data.data, null, 2);
                this.showToast('Tool executed successfully', 'success');
            } else {
                resultEl.textContent = `Error: ${data.error}`;
                this.showToast(`Execution failed: ${data.error}`, 'error');
            }
        } catch (error) {
            resultEl.textContent = `Error: ${error.message}`;
            this.showToast('Failed to execute tool', 'error');
        }
    }

    // Agent Management
    showSpawnAgent() {
        document.getElementById('spawn-agent-modal').style.display = 'flex';
    }

    hideSpawnAgent() {
        document.getElementById('spawn-agent-modal').style.display = 'none';
    }

    async spawnAgent() {
        const agentType = document.getElementById('agent-type').value;
        const configText = document.getElementById('agent-config').value;
        
        let config;
        try {
            config = JSON.parse(configText || '{}');
        } catch (e) {
            this.showToast('Invalid JSON configuration', 'error');
            return;
        }

        try {
            const response = await fetch('/api/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: agentType, config })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(`Agent spawned: ${data.data.agent_id}`, 'success');
                this.hideSpawnAgent();
                this.loadAgents();
            } else {
                this.showToast(`Failed to spawn agent: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast('Failed to spawn agent', 'error');
        }
    }

    async killAgent(agentId) {
        if (!confirm('Are you sure you want to kill this agent?')) return;

        try {
            const response = await fetch(`/api/agents/${agentId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Agent terminated', 'success');
                this.loadAgents();
            } else {
                this.showToast(`Failed to kill agent: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast('Failed to kill agent', 'error');
        }
    }

    // Discovery
    async runDiscovery() {
        console.log('🔍 Starting service discovery...');

        // Show loading state in discovery results
        const container = document.getElementById('discovery-results');
        if (container) {
            container.innerHTML = `
                <div class="discovery-categories">
                    <div class="category-section">
                        <h3>🔍 Discovering Services...</h3>
                        <div class="service-list">
                            <div class="service-item">
                                <span class="service-name">Scanning D-Bus services...</span>
                                <span class="service-path">Please wait</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        this.showToast('Running service discovery...', 'info');

        try {
            console.log('📡 Making API call to /api/discovery/run');
            const response = await fetch('/api/discovery/run', {
                method: 'POST'
            });

            console.log('📥 Response received:', response.status);
            const data = await response.json();
            console.log('📄 Response data:', data);

            if (data.success) {
                this.showToast(`Discovered ${data.data.count} services`, 'success');
                console.log(`✅ Discovery successful: ${data.data.count} services found`);

                // Use the discovery results directly instead of making another API call
                this.services = data.data.services || [];
                console.log(`📋 Using discovery results: ${this.services.length} services`);

                // Render immediately
                this.renderDiscoveryResults();
                console.log('✅ Discovery results rendered');
            } else {
                console.error('❌ Discovery API returned error:', data.error);
                this.showToast(`Discovery failed: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('❌ Discovery network error:', error);
            this.showToast('Failed to run discovery', 'error');
        }
    }

    groupServicesByCategory() {
        const categories = {};

        // Safety check: ensure services is an array
        if (!this.services || !Array.isArray(this.services)) {
            console.warn('Services not initialized or not an array:', this.services);
            return categories;
        }

        this.services.forEach(service => {
            const category = service.category || 'Other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(service);
        });

        return categories;
    }

    // Update Functions
    updateStats(stats) {
        this.stats = { ...this.stats, ...stats };
        
        this.updateStatDisplay('uptime', this.formatUptime(stats.uptime_secs));
        this.updateStatDisplay('request-count', stats.request_count);
        this.updateStatDisplay('active-agents', stats.active_agents?.length || 0);
    }

    updateStatDisplay(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connection-status');
        statusEl.className = `connection-status ${status}`;
        
        const statusText = statusEl.querySelector('.status-text');
        switch (status) {
            case 'connected':
                statusText.textContent = 'Connected';
                break;
            case 'disconnected':
                statusText.textContent = 'Disconnected';
                break;
            case 'error':
                statusText.textContent = 'Error';
                break;
            default:
                statusText.textContent = 'Connecting...';
        }
    }

    updateAgents(agents) {
        this.agents = agents;
        if (document.querySelector('.section#agents.active')) {
            this.renderAgents();
        }
        this.updateStatDisplay('active-agents', agents.length);
    }

    // Activity Feed
    addActivity(message, level = 'info') {
        const activity = {
            timestamp: new Date(),
            message,
            level
        };
        
        this.activityFeed.unshift(activity);
        if (this.activityFeed.length > 100) {
            this.activityFeed.pop();
        }
        
        this.renderActivityFeed();
    }

    renderActivityFeed() {
        const container = document.getElementById('activity-feed');
        
        const html = this.activityFeed.slice(0, 20).map(item => `
            <div class="feed-item">
                <span class="feed-time">${this.formatTime(item.timestamp)}</span>
                <span class="feed-message">${this.escapeHtml(item.message)}</span>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    // Logs
    addLog(log) {
        this.logs.push({
            timestamp: new Date(),
            ...log
        });
        
        if (this.logs.length > 1000) {
            this.logs.shift();
        }
        
        if (document.querySelector('.section#logs.active')) {
            this.renderLogs();
        }
    }

    filterLogs(level) {
        // Implementation for log filtering
        const filtered = level === 'all' 
            ? this.logs 
            : this.logs.filter(log => log.level === level);
        
        // Re-render with filtered logs
        const tempLogs = this.logs;
        this.logs = filtered;
        this.renderLogs();
        this.logs = tempLogs;
    }

    clearLogs() {
        this.logs = [];
        this.renderLogs();
    }

    downloadLogs() {
        const content = this.logs.map(log => 
            `[${this.formatTime(log.timestamp)}] [${log.level}] ${log.message}`
        ).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mcp-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Theme Management
    checkTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggle(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggle(newTheme);
    }

    updateThemeToggle(theme) {
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        
        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }

    // Utilities
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatTime(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toLocaleTimeString('en-US', { hour12: false });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                ${this.getToastIcon(type)}
            </svg>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success':
                return '<path d="M10 0C4.5 0 0 4.5 0 10s4.5 10 10 10 10-4.5 10-10S15.5 0 10 0zm4 8l-5 5-3-3 1.5-1.5L9 10l3.5-3.5L14 8z"/>';
            case 'error':
                return '<path d="M10 0C4.5 0 0 4.5 0 10s4.5 10 10 10 10-4.5 10-10S15.5 0 10 0zm5 13.5L13.5 15 10 11.5 6.5 15 5 13.5 8.5 10 5 6.5 6.5 5 10 8.5 13.5 5 15 6.5 11.5 10 15 13.5z"/>';
            case 'warning':
                return '<path d="M10 0C4.5 0 0 4.5 0 10s4.5 10 10 10 10-4.5 10-10S15.5 0 10 0zm0 15c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-4H9V5h2v6z"/>';
            default:
                return '<path d="M10 0C4.5 0 0 4.5 0 10s4.5 10 10 10 10-4.5 10-10S15.5 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"/>';
        }
    }

    refreshDashboard() {
        this.showToast('Refreshing dashboard...', 'info');
        this.loadStatus();
        this.loadAgents();
    }

    startUpdateTimers() {
        // Update uptime every second
        setInterval(() => {
            this.stats.uptime_secs++;
            this.updateStatDisplay('uptime', this.formatUptime(this.stats.uptime_secs));
        }, 1000);

        // Refresh stats every 10 seconds
        setInterval(() => {
            this.loadStatus();
        }, 10000);
    }

    // Chat functionality
    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const typingIndicator = document.getElementById('typing-indicator');

        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';

        // Disable input while sending
        input.disabled = true;
        sendBtn.disabled = true;

        // Add user message to chat
        this.addChatMessage('user', message);

        // Show typing indicator
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
        }

        try {
            // Send to AI chat server
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();

            if (data.success) {
                this.addChatMessage('assistant', data.message);
            } else {
                this.addChatMessage('error', `Error: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.addChatMessage('error', `Network error: ${error.message}`);
        } finally {
            // Re-enable input
            input.disabled = false;
            sendBtn.disabled = false;

            // Hide typing indicator
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }
        }
    }

    addChatMessage(type, content) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;

        const avatar = type === 'user' ? '👤' : type === 'error' ? '❌' : '🤖';
        const timestamp = new Date().toLocaleTimeString();

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(content)}</div>
                <div class="message-time">${timestamp}</div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    clearChat() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Keep only the initial welcome message
        const welcomeMessage = messagesContainer.querySelector('.assistant');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Workflow Builder Methods
    initWorkflowBuilder() {
        this.workflowNodes = [];
        this.workflowConnections = [];
        this.workflowZoom = 1;
        this.selectedNode = null;
        this.draggedNode = null;
        this.connectionStart = null;
        this.nodeIdCounter = 0;
        this.canvasOffset = { x: 0, y: 0 };
    }

    createNewWorkflow() {
        if (confirm('Create a new workflow? This will clear the current canvas.')) {
            this.clearWorkflowCanvas();
            this.showToast('New workflow created', 'success');
        }
    }

    clearWorkflowCanvas() {
        this.workflowNodes = [];
        this.workflowConnections = [];
        this.selectedNode = null;
        this.renderWorkflowCanvas();
        document.getElementById('node-properties').innerHTML = '<div class="properties-placeholder"><p>Select a node to edit its properties</p></div>';
        document.getElementById('canvas-hint').style.display = 'flex';
        document.getElementById('btn-execute-workflow').disabled = true;
    }

    onNodeDragStart(event) {
        const nodeType = event.target.closest('.palette-node').getAttribute('data-node-type');
        event.dataTransfer.setData('nodeType', nodeType);
        event.dataTransfer.effectAllowed = 'copy';
    }

    onCanvasDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    onCanvasDrop(event) {
        event.preventDefault();
        const nodeType = event.dataTransfer.getData('nodeType');
        if (!nodeType) return;

        const canvas = document.getElementById('workflow-canvas');
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / this.workflowZoom - this.canvasOffset.x;
        const y = (event.clientY - rect.top) / this.workflowZoom - this.canvasOffset.y;

        this.addNodeToCanvas(nodeType, x, y);
        document.getElementById('canvas-hint').style.display = 'none';
    }

    addNodeToCanvas(nodeType, x, y) {
        const nodeId = `node_${this.nodeIdCounter++}`;
        const nodeConfig = this.getNodeConfig(nodeType);

        const node = {
            id: nodeId,
            type: nodeType,
            x: Math.max(20, Math.min(x, 800)),  // Keep within bounds
            y: Math.max(20, Math.min(y, 500)),
            width: 120,
            height: 60,
            label: nodeConfig.label,
            icon: nodeConfig.icon,
            inputs: nodeConfig.inputs || 1,
            outputs: nodeConfig.outputs || 1,
            config: nodeConfig.defaultConfig || {},
            created: new Date().toISOString()
        };

        this.workflowNodes.push(node);
        this.selectedNode = node;
        this.renderWorkflowCanvas();
        this.showNodeProperties(node);
        this.showToast(`Added ${nodeConfig.label}`, 'success');
        document.getElementById('btn-execute-workflow').disabled = this.workflowNodes.length === 0;

        // Add visual feedback animation
        const addedNode = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (addedNode) {
            addedNode.style.animation = 'fadeIn 0.3s ease-out';
        }
    }

    getNodeConfig(nodeType) {
        const configs = {
            'trigger-manual': { label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, defaultConfig: {} },
            'trigger-signal': { label: 'D-Bus Signal', icon: '📡', inputs: 0, outputs: 1, defaultConfig: { service: '', signal: '' } },
            'dbus-method': { label: 'Method Call', icon: '🔧', inputs: 1, outputs: 1, defaultConfig: { service: '', method: '', params: '{}' } },
            'dbus-property-get': { label: 'Get Property', icon: '📋', inputs: 1, outputs: 1, defaultConfig: { service: '', property: '' } },
            'dbus-property-set': { label: 'Set Property', icon: '✏️', inputs: 1, outputs: 1, defaultConfig: { service: '', property: '', value: '' } },
            'condition': { label: 'Condition', icon: '❓', inputs: 1, outputs: 2, defaultConfig: { expression: 'true' } },
            'transform': { label: 'Transform', icon: '🔄', inputs: 1, outputs: 1, defaultConfig: { script: '' } },
            'delay': { label: 'Delay', icon: '⏱️', inputs: 1, outputs: 1, defaultConfig: { ms: 1000 } },
            'output-log': { label: 'Log Output', icon: '📝', inputs: 1, outputs: 0, defaultConfig: { level: 'info' } },
            'output-notification': { label: 'Notification', icon: '🔔', inputs: 1, outputs: 0, defaultConfig: { title: '', message: '' } }
        };
        return configs[nodeType] || { label: nodeType, icon: '⚙️', inputs: 1, outputs: 1, defaultConfig: {} };
    }

    onCanvasMouseDown(event) {
        if (event.target.classList.contains('node-port')) {
            this.connectionStart = {
                nodeId: event.target.closest('.workflow-node-element').getAttribute('data-node-id'),
                port: event.target.getAttribute('data-port'),
                type: event.target.getAttribute('data-port-type')
            };
            event.preventDefault();
        } else if (event.target.closest('.workflow-node-element')) {
            const nodeElement = event.target.closest('.workflow-node-element');
            const nodeId = nodeElement.getAttribute('data-node-id');
            this.selectedNode = this.workflowNodes.find(n => n.id === nodeId);
            this.showNodeProperties(this.selectedNode);

            this.draggedNode = {
                nodeId: nodeId,
                startX: event.clientX,
                startY: event.clientY,
                nodeStartX: this.selectedNode.x,
                nodeStartY: this.selectedNode.y
            };
            event.preventDefault();
        }
    }

    onCanvasMouseMove(event) {
        if (this.draggedNode) {
            const dx = (event.clientX - this.draggedNode.startX) / this.workflowZoom;
            const dy = (event.clientY - this.draggedNode.startY) / this.workflowZoom;
            const node = this.workflowNodes.find(n => n.id === this.draggedNode.nodeId);
            if (node) {
                node.x = this.draggedNode.nodeStartX + dx;
                node.y = this.draggedNode.nodeStartY + dy;
                this.renderWorkflowCanvas();
            }
        }
    }

    onCanvasMouseUp(event) {
        if (this.connectionStart && event.target.classList.contains('node-port')) {
            const endNodeId = event.target.closest('.workflow-node-element').getAttribute('data-node-id');
            const endPort = event.target.getAttribute('data-port');
            const endType = event.target.getAttribute('data-port-type');

            if (this.connectionStart.type !== endType && this.connectionStart.nodeId !== endNodeId) {
                this.addConnection(this.connectionStart, { nodeId: endNodeId, port: endPort, type: endType });
            }
        }
        this.connectionStart = null;
        this.draggedNode = null;
    }

    addConnection(start, end) {
        const fromNode = start.type === 'output' ? start.nodeId : end.nodeId;
        const toNode = start.type === 'output' ? end.nodeId : start.nodeId;
        const fromPort = start.type === 'output' ? start.port : end.port;
        const toPort = start.type === 'output' ? end.port : start.port;

        // Check if connection already exists
        const exists = this.workflowConnections.some(c =>
            c.from === fromNode && c.to === toNode && c.fromPort === fromPort && c.toPort === toPort
        );

        if (!exists) {
            this.workflowConnections.push({ from: fromNode, to: toNode, fromPort, toPort });
            this.renderWorkflowCanvas();
            this.showToast('Connection created', 'success');
        }
    }

    renderWorkflowCanvas() {
        // Update workflow stats
        const nodeCount = document.getElementById('workflow-node-count');
        const connCount = document.getElementById('workflow-connection-count');
        const statusElem = document.getElementById('workflow-status');

        if (nodeCount) nodeCount.textContent = this.workflowNodes.length;
        if (connCount) connCount.textContent = this.workflowConnections.length;
        if (statusElem) {
            if (this.workflowNodes.length === 0) {
                statusElem.textContent = 'Empty';
                statusElem.style.color = 'var(--text-tertiary)';
            } else {
                const hasTrigger = this.workflowNodes.some(n => n.type.startsWith('trigger-'));
                statusElem.textContent = hasTrigger ? 'Ready' : 'No Trigger';
                statusElem.style.color = hasTrigger ? 'var(--color-success)' : 'var(--color-warning)';
            }
        }

        const nodesLayer = document.getElementById('nodes-layer');
        const connectionsLayer = document.getElementById('connections-layer');

        nodesLayer.innerHTML = '';
        connectionsLayer.innerHTML = '';

        // Render connections
        this.workflowConnections.forEach((conn, idx) => {
            const fromNode = this.workflowNodes.find(n => n.id === conn.from);
            const toNode = this.workflowNodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return;

            const x1 = fromNode.x + fromNode.width;
            const y1 = fromNode.y + fromNode.height / 2;
            const x2 = toNode.x;
            const y2 = toNode.y + toNode.height / 2;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midX = (x1 + x2) / 2;
            path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
            path.setAttribute('stroke', '#3b82f6');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('class', 'workflow-connection');
            path.setAttribute('data-conn-idx', idx);
            path.style.cursor = 'pointer';

            // Add right-click to delete connection
            path.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm('Delete this connection?')) {
                    this.workflowConnections.splice(idx, 1);
                    this.renderWorkflowCanvas();
                    this.showToast('Connection deleted', 'success');
                }
            });

            // Add hover effect
            path.addEventListener('mouseenter', () => {
                path.setAttribute('stroke', '#60a5fa');
                path.setAttribute('stroke-width', '3');
            });
            path.addEventListener('mouseleave', () => {
                path.setAttribute('stroke', '#3b82f6');
                path.setAttribute('stroke-width', '2');
            });

            connectionsLayer.appendChild(path);
        });

        // Render nodes
        this.workflowNodes.forEach(node => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'workflow-node-element');
            g.setAttribute('data-node-id', node.id);
            g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

            // Node body
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', node.width);
            rect.setAttribute('height', node.height);
            rect.setAttribute('rx', '4');
            rect.setAttribute('fill', this.selectedNode?.id === node.id ? '#1e40af' : '#1e293b');
            rect.setAttribute('stroke', '#3b82f6');
            rect.setAttribute('stroke-width', '2');
            g.appendChild(rect);

            // Icon and label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.width / 2);
            text.setAttribute('y', 25);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-size', '20');
            text.textContent = node.icon;
            g.appendChild(text);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', node.width / 2);
            label.setAttribute('y', 45);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('fill', '#94a3b8');
            label.setAttribute('font-size', '11');
            label.textContent = node.label;
            g.appendChild(label);

            // Input ports
            for (let i = 0; i < node.inputs; i++) {
                const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                const yPos = (node.height / (node.inputs + 1)) * (i + 1);
                port.setAttribute('cx', '0');
                port.setAttribute('cy', yPos);
                port.setAttribute('r', '5');
                port.setAttribute('fill', '#22c55e');
                port.setAttribute('class', 'node-port');
                port.setAttribute('data-port', i);
                port.setAttribute('data-port-type', 'input');
                g.appendChild(port);
            }

            // Output ports
            for (let i = 0; i < node.outputs; i++) {
                const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                const yPos = (node.height / (node.outputs + 1)) * (i + 1);
                port.setAttribute('cx', node.width);
                port.setAttribute('cy', yPos);
                port.setAttribute('r', '5');
                port.setAttribute('fill', '#3b82f6');
                port.setAttribute('class', 'node-port');
                port.setAttribute('data-port', i);
                port.setAttribute('data-port-type', 'output');
                g.appendChild(port);
            }

            nodesLayer.appendChild(g);
        });
    }

    showNodeProperties(node) {
        if (!node) return;

        const propertiesDiv = document.getElementById('node-properties');
        let html = `
            <div class="node-property-editor">
                <h4>${node.icon} ${node.label}</h4>
                <div class="form-group">
                    <label>Node ID</label>
                    <input type="text" class="form-control form-control-sm" value="${node.id}" disabled>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <input type="text" class="form-control form-control-sm" value="${node.type}" disabled>
                </div>
        `;

        // Add type-specific config fields with better input types
        Object.keys(node.config).forEach(key => {
            const value = node.config[key];
            const isNumber = key === 'ms' || key === 'delay' || key === 'timeout';
            const isJson = key === 'params' || key === 'data';

            html += `
                <div class="form-group">
                    <label>${key.replace(/_/g, ' ')}</label>
                    ${isJson ? `
                        <textarea class="form-control form-control-sm" rows="3"
                                  onchange="window.mcp.updateNodeConfig('${node.id}', '${key}', this.value)"
                                  style="font-family: monospace; font-size: 12px;">${this.escapeHtml(String(value))}</textarea>
                    ` : `
                        <input type="${isNumber ? 'number' : 'text'}" class="form-control form-control-sm"
                               value="${this.escapeHtml(String(value))}"
                               ${isNumber ? 'min="0" step="100"' : ''}
                               onchange="window.mcp.updateNodeConfig('${node.id}', '${key}', this.value)"
                               placeholder="Enter ${key}">
                    `}
                </div>
            `;
        });

        html += `
                <div class="form-group" style="display: flex; gap: 8px;">
                    <button class="btn btn-sm" onclick="window.mcp.duplicateNode('${node.id}')" style="flex: 1;" title="Duplicate this node">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="vertical-align: middle;">
                            <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <rect x="6" y="6" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        </svg>
                        Duplicate
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.mcp.deleteNode('${node.id}')" style="flex: 1;">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="vertical-align: middle;">
                            <path d="M2 4H14M5 4V2C5 1.4 5.4 1 6 1H10C10.6 1 11 1.4 11 2V4M7 7V11M10 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;

        propertiesDiv.innerHTML = html;
    }

    updateNodeConfig(nodeId, key, value) {
        const node = this.workflowNodes.find(n => n.id === nodeId);
        if (node) {
            node.config[key] = value;
            this.showToast('Configuration updated', 'success');
        }
    }

    deleteNode(nodeId) {
        if (!confirm('Delete this node and its connections?')) return;

        this.workflowNodes = this.workflowNodes.filter(n => n.id !== nodeId);
        this.workflowConnections = this.workflowConnections.filter(c => c.from !== nodeId && c.to !== nodeId);
        this.selectedNode = null;
        this.renderWorkflowCanvas();
        document.getElementById('node-properties').innerHTML = '<div class="properties-placeholder"><p>Select a node to edit its properties</p></div>';
        this.showToast('Node deleted', 'success');
        document.getElementById('btn-execute-workflow').disabled = this.workflowNodes.length === 0;
    }

    async validateWorkflow() {
        if (this.workflowNodes.length === 0) {
            this.showToast('Workflow is empty', 'error');
            return false;
        }

        // Check for trigger nodes
        const hasTrigger = this.workflowNodes.some(n => n.type.startsWith('trigger-'));
        if (!hasTrigger) {
            this.showToast('Workflow must have at least one trigger node', 'error');
            return false;
        }

        // Check for disconnected nodes
        const connectedNodes = new Set();
        this.workflowConnections.forEach(c => {
            connectedNodes.add(c.from);
            connectedNodes.add(c.to);
        });

        const disconnected = this.workflowNodes.filter(n => !n.type.startsWith('trigger-') && !connectedNodes.has(n.id));
        if (disconnected.length > 0) {
            this.showToast(`Warning: ${disconnected.length} disconnected node(s)`, 'warning');
        }

        this.showToast('Workflow is valid', 'success');
        return true;
    }

    async executeWorkflow() {
        if (!await this.validateWorkflow()) return;

        const workflowData = {
            nodes: this.workflowNodes,
            connections: this.workflowConnections
        };

        const executeBtn = document.getElementById('btn-execute-workflow');
        const originalText = executeBtn.innerHTML;
        executeBtn.disabled = true;
        executeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="animation: spin 1s linear infinite;"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30" stroke-dashoffset="0"/></svg> Executing...';

        try {
            const response = await fetch('/api/workflow/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(workflowData)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Workflow executed successfully', 'success');
                this.showWorkflowOutput(result.data);
            } else {
                this.showToast(`Execution failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Failed to execute workflow:', error);
            this.showToast('Failed to execute workflow', 'error');
        } finally {
            executeBtn.disabled = false;
            executeBtn.innerHTML = originalText;
        }
    }

    showWorkflowOutput(data) {
        const outputDiv = document.getElementById('workflow-output');
        const contentDiv = document.getElementById('workflow-output-content');

        let html = '<div style="font-family: monospace; font-size: 12px;">';

        if (data.executionResults && Array.isArray(data.executionResults)) {
            html += '<div style="margin-bottom: 15px; padding: 10px; background: var(--bg-primary); border-radius: 4px;">';
            html += `<strong>Execution Summary</strong><br>`;
            html += `Nodes Executed: ${data.nodesExecuted} / ${data.totalNodes}<br>`;
            html += `Time: ${new Date(data.timestamp).toLocaleTimeString()}`;
            html += '</div>';

            data.executionResults.forEach((result, idx) => {
                const success = result.success !== false;
                const bgColor = success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                const borderColor = success ? 'var(--color-success)' : 'var(--color-danger)';

                html += `
                    <div style="margin-bottom: 10px; padding: 10px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 4px;">
                        <div style="font-weight: bold; margin-bottom: 5px;">
                            ${success ? '✓' : '✗'} Node ${idx + 1}: ${result.type}
                        </div>
                        <pre style="margin: 5px 0; font-size: 11px; white-space: pre-wrap;">${JSON.stringify(result.output || result.error, null, 2)}</pre>
                    </div>
                `;
            });
        } else {
            html += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }

        html += '</div>';
        contentDiv.innerHTML = html;
        outputDiv.style.display = 'block';
        outputDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async saveWorkflow() {
        const name = prompt('Enter workflow name:');
        if (!name) return;

        const workflowData = {
            name: name,
            nodes: this.workflowNodes,
            connections: this.workflowConnections,
            created: new Date().toISOString()
        };

        localStorage.setItem(`workflow_${name}`, JSON.stringify(workflowData));
        this.showToast(`Workflow "${name}" saved`, 'success');
    }

    async loadWorkflow() {
        const name = prompt('Enter workflow name to load:');
        if (!name) return;

        const data = localStorage.getItem(`workflow_${name}`);
        if (!data) {
            this.showToast('Workflow not found', 'error');
            return;
        }

        const workflowData = JSON.parse(data);
        this.workflowNodes = workflowData.nodes;
        this.workflowConnections = workflowData.connections;
        this.renderWorkflowCanvas();
        this.showToast(`Workflow "${name}" loaded`, 'success');
        document.getElementById('canvas-hint').style.display = 'none';
        document.getElementById('btn-execute-workflow').disabled = false;
    }

    exportWorkflow() {
        if (this.workflowNodes.length === 0) {
            this.showToast('No workflow to export', 'warning');
            return;
        }

        const workflowData = {
            name: 'exported-workflow',
            nodes: this.workflowNodes,
            connections: this.workflowConnections,
            created: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(workflowData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `workflow-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast('Workflow exported', 'success');
    }

    importWorkflow() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const workflowData = JSON.parse(event.target.result);
                    if (!workflowData.nodes || !workflowData.connections) {
                        throw new Error('Invalid workflow file');
                    }

                    this.workflowNodes = workflowData.nodes;
                    this.workflowConnections = workflowData.connections;
                    this.renderWorkflowCanvas();
                    this.showToast('Workflow imported', 'success');
                    document.getElementById('canvas-hint').style.display = 'none';
                    document.getElementById('btn-execute-workflow').disabled = false;
                } catch (error) {
                    this.showToast(`Import failed: ${error.message}`, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    loadWorkflowTemplate(templateName) {
        const templates = {
            'dbus-monitor': {
                name: 'D-Bus Monitor Template',
                nodes: [
                    { id: 'node_0', type: 'trigger-signal', x: 100, y: 100, width: 120, height: 60, label: 'D-Bus Signal', icon: '📡', inputs: 0, outputs: 1, config: { service: 'org.freedesktop.DBus', signal: 'NameOwnerChanged' } },
                    { id: 'node_1', type: 'transform', x: 300, y: 100, width: 120, height: 60, label: 'Transform', icon: '🔄', inputs: 1, outputs: 1, config: { script: 'return input;' } },
                    { id: 'node_2', type: 'output-log', x: 500, y: 100, width: 120, height: 60, label: 'Log Output', icon: '📝', inputs: 1, outputs: 0, config: { level: 'info' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' }
                ]
            },
            'simple-automation': {
                name: 'Simple Automation Template',
                nodes: [
                    { id: 'node_0', type: 'trigger-manual', x: 100, y: 150, width: 120, height: 60, label: 'Manual Start', icon: '▶️', inputs: 0, outputs: 1, config: {} },
                    { id: 'node_1', type: 'dbus-method', x: 300, y: 150, width: 120, height: 60, label: 'Method Call', icon: '🔧', inputs: 1, outputs: 1, config: { service: 'org.freedesktop.systemd1', method: 'ListUnits', params: '{}' } },
                    { id: 'node_2', type: 'output-notification', x: 500, y: 150, width: 120, height: 60, label: 'Notification', icon: '🔔', inputs: 1, outputs: 0, config: { title: 'Workflow Complete', message: 'Automation finished' } }
                ],
                connections: [
                    { from: 'node_0', to: 'node_1', fromPort: '0', toPort: '0' },
                    { from: 'node_1', to: 'node_2', fromPort: '0', toPort: '0' }
                ]
            }
        };

        if (!templates[templateName]) {
            this.showToast('Template not found', 'error');
            return;
        }

        const template = templates[templateName];
        this.workflowNodes = template.nodes;
        this.workflowConnections = template.connections;
        this.nodeIdCounter = template.nodes.length;
        this.renderWorkflowCanvas();
        this.showToast(`Template "${template.name}" loaded`, 'success');
        document.getElementById('canvas-hint').style.display = 'none';
        document.getElementById('btn-execute-workflow').disabled = false;
    }

    setWorkflowZoom(zoom) {
        this.workflowZoom = parseFloat(zoom);
        const canvas = document.getElementById('workflow-canvas');
        const nodesLayer = document.getElementById('nodes-layer');
        const connectionsLayer = document.getElementById('connections-layer');
        nodesLayer.setAttribute('transform', `scale(${this.workflowZoom})`);
        connectionsLayer.setAttribute('transform', `scale(${this.workflowZoom})`);
    }

    togglePaletteCategory(categoryId) {
        const items = document.getElementById(`palette-${categoryId}`);
        const isHidden = items.style.display === 'none';
        items.style.display = isHidden ? 'block' : 'none';

        const toggle = items.previousElementSibling.querySelector('.palette-toggle');
        toggle.textContent = isHidden ? '▼' : '▶';
    }

    filterNodePalette(searchTerm) {
        const nodes = document.querySelectorAll('.palette-node');
        const term = searchTerm.toLowerCase();

        nodes.forEach(node => {
            const text = node.textContent.toLowerCase();
            node.style.display = text.includes(term) ? 'flex' : 'none';
        });
    }
}

// Global instance
window.mcp = new MCPControlCenter();

// Global functions for inline handlers
window.closeToolTest = () => window.mcp.closeToolTest();
window.clearToolTest = () => window.mcp.clearToolTest();
window.executeToolTest = () => window.mcp.executeToolTest();
window.showSpawnAgent = () => window.mcp.showSpawnAgent();
window.hideSpawnAgent = () => window.mcp.hideSpawnAgent();
window.spawnAgent = () => window.mcp.spawnAgent();
window.runDiscovery = () => window.mcp.runDiscovery();
window.clearLogs = () => window.mcp.clearLogs();
window.downloadLogs = () => window.mcp.downloadLogs();
window.clearChat = () => window.mcp.clearChat();
window.toggleServiceDetails = (serviceId) => {
    const detailsElement = document.getElementById(`details_${serviceId}`);
    if (detailsElement) {
        const isVisible = detailsElement.style.display !== 'none';
        detailsElement.style.display = isVisible ? 'none' : 'block';

        // Toggle expand/collapse visual indicator
        const headerElement = detailsElement.parentElement;
        headerElement.classList.toggle('expanded', !isVisible);
    }
};

// Workflow visualization
let workflowNodes = [];
let workflowEdges = [];

window.generateWorkflow = async () => {
    console.log('🔗 Generating workflow visualization...');

    // Show loading
    const canvas = document.getElementById('workflow-canvas');
    canvas.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%;"><div>Loading workflow...</div></div>';

    try {
        // Get discovered services
        await this.loadServices();

        if (!this.services || this.services.length === 0) {
            canvas.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary);">No services discovered. Run discovery first.</div>';
            return;
        }

        // Generate nodes and edges
        generateWorkflowData(this.services);

        // Render the workflow
        renderWorkflow();

        console.log(`✅ Generated workflow with ${workflowNodes.length} nodes and ${workflowEdges.length} edges`);

    } catch (error) {
        console.error('❌ Failed to generate workflow:', error);
        canvas.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444;">Failed to generate workflow</div>';
    }
};

window.resetWorkflowView = () => {
    const canvas = document.getElementById('workflow-canvas');
    canvas.innerHTML = `
        <div class="workflow-placeholder">
            <div class="placeholder-icon">🔗</div>
            <div class="placeholder-text">
                <h3>System Workflow Visualization</h3>
                <p>Click "Generate Workflow" to create a visual representation of your system's services, dependencies, and relationships.</p>
                <p>This will show how systemd services, D-Bus components, network services, and kernel subsystems interact.</p>
            </div>
        </div>
    `;
    workflowNodes = [];
    workflowEdges = [];
};

window.changeLayout = () => {
    if (workflowNodes.length > 0) {
        renderWorkflow();
    }
};

function generateWorkflowData(services) {
    workflowNodes = [];
    workflowEdges = [];

    const canvas = document.getElementById('workflow-canvas');
    const canvasWidth = canvas.offsetWidth || 800;
    const canvasHeight = canvas.offsetHeight || 600;

    // Create nodes
    services.forEach((service, index) => {
        const node = {
            id: service.name,
            label: service.name.split('.')[0].split('/').pop(), // Short name
            fullName: service.name,
            type: service.type || 'service',
            category: service.category,
            x: Math.random() * (canvasWidth - 120) + 60,
            y: Math.random() * (canvasHeight - 80) + 40,
            data: service
        };
        workflowNodes.push(node);
    });

    // Create edges based on relationships
    services.forEach(service => {
        // D-Bus services connect to systemd services
        if (service.type === 'dbus-service' && service.name.includes('systemd')) {
            services.forEach(otherService => {
                if (otherService.type === 'systemd-service') {
                    workflowEdges.push({
                        from: service.name,
                        to: otherService.name,
                        type: 'manages'
                    });
                }
            });
        }

        // Systemd services connect to their dependencies
        if (service.dependencies) {
            service.dependencies.forEach(dep => {
                const depService = services.find(s => s.name.includes(dep.replace('.service', '')));
                if (depService) {
                    workflowEdges.push({
                        from: service.name,
                        to: depService.name,
                        type: 'depends_on'
                    });
                }
            });
        }

        // Network services connect to network interfaces
        if (service.type === 'network-service') {
            services.forEach(otherService => {
                if (otherService.name === '/sys' || otherService.name.includes('net')) {
                    workflowEdges.push({
                        from: service.name,
                        to: otherService.name,
                        type: 'uses'
                    });
                }
            });
        }

        // Container services connect to systemd and kernel
        if (service.type === 'container-runtime') {
            services.forEach(otherService => {
                if (otherService.type === 'systemd-service' || otherService.name === '/proc') {
                    workflowEdges.push({
                        from: service.name,
                        to: otherService.name,
                        type: 'depends_on'
                    });
                }
            });
        }

        // Kernel filesystems connect to everything that uses them
        if (service.type === 'kernel-filesystem') {
            services.forEach(otherService => {
                if (otherService.type !== 'kernel-filesystem') {
                    workflowEdges.push({
                        from: otherService.name,
                        to: service.name,
                        type: 'accesses'
                    });
                }
            });
        }
    });

    // Apply selected layout
    applyLayout();
}

function applyLayout() {
    const layout = document.getElementById('workflow-layout').value;
    const canvas = document.getElementById('workflow-canvas');
    const canvasWidth = canvas.offsetWidth || 800;
    const canvasHeight = canvas.offsetHeight || 600;

    switch (layout) {
        case 'hierarchical':
            applyHierarchicalLayout(canvasWidth, canvasHeight);
            break;
        case 'circular':
            applyCircularLayout(canvasWidth, canvasHeight);
            break;
        case 'force':
        default:
            applyForceLayout(canvasWidth, canvasHeight);
            break;
    }
}

function applyHierarchicalLayout(width, height) {
    const categories = {};
    const categoryOrder = ['System', 'Kernel', 'Network', 'Application', 'Container'];

    // Group by category
    workflowNodes.forEach(node => {
        const category = node.category || 'Other';
        if (!categories[category]) categories[category] = [];
        categories[category].push(node);
    });

    let y = 60;
    categoryOrder.forEach(category => {
        if (categories[category]) {
            const nodes = categories[category];
            const xSpacing = width / (nodes.length + 1);

            nodes.forEach((node, index) => {
                node.x = xSpacing * (index + 1);
                node.y = y;
            });

            y += 120;
        }
    });
}

function applyCircularLayout(width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    workflowNodes.forEach((node, index) => {
        const angle = (index / workflowNodes.length) * 2 * Math.PI;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
    });
}

function applyForceLayout(width, height) {
    // Simple force-directed layout simulation
    const iterations = 50;
    const repulsion = 1000;
    const attraction = 0.01;

    for (let iter = 0; iter < iterations; iter++) {
        // Calculate repulsive forces between nodes
        workflowNodes.forEach(node => {
            node.fx = 0;
            node.fy = 0;
        });

        for (let i = 0; i < workflowNodes.length; i++) {
            for (let j = i + 1; j < workflowNodes.length; j++) {
                const node1 = workflowNodes[i];
                const node2 = workflowNodes[j];

                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;

                const force = repulsion / (distance * distance);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                node1.fx -= fx;
                node1.fy -= fy;
                node2.fx += fx;
                node2.fy += fy;
            }
        }

        // Calculate attractive forces along edges
        workflowEdges.forEach(edge => {
            const sourceNode = workflowNodes.find(n => n.id === edge.from);
            const targetNode = workflowNodes.find(n => n.id === edge.to);

            if (sourceNode && targetNode) {
                const dx = targetNode.x - sourceNode.x;
                const dy = targetNode.y - sourceNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;

                const force = attraction * distance;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                sourceNode.fx += fx;
                sourceNode.fy += fy;
                targetNode.fx -= fx;
                targetNode.fy -= fy;
            }
        });

        // Apply forces and constraints
        workflowNodes.forEach(node => {
            node.x += node.fx * 0.1;
            node.y += node.fy * 0.1;

            // Keep nodes within bounds
            node.x = Math.max(60, Math.min(width - 60, node.x));
            node.y = Math.max(40, Math.min(height - 40, node.y));
        });
    }
}

function renderWorkflow() {
    const canvas = document.getElementById('workflow-canvas');
    canvas.innerHTML = '';

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'node-tooltip';
    tooltip.id = 'workflow-tooltip';
    canvas.appendChild(tooltip);

    // Render edges
    workflowEdges.forEach(edge => {
        const sourceNode = workflowNodes.find(n => n.id === edge.from);
        const targetNode = workflowNodes.find(n => n.id === edge.to);

        if (sourceNode && targetNode) {
            const edgeElement = document.createElement('div');
            edgeElement.className = 'workflow-edge';

            // Calculate line position and angle
            const x1 = sourceNode.x + 40; // Half node width
            const y1 = sourceNode.y + 20; // Half node height
            const x2 = targetNode.x + 40;
            const y2 = targetNode.y + 20;

            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

            edgeElement.style.width = length + 'px';
            edgeElement.style.height = '2px';
            edgeElement.style.background = 'var(--border)';
            edgeElement.style.position = 'absolute';
            edgeElement.style.left = x1 + 'px';
            edgeElement.style.top = y1 + 'px';
            edgeElement.style.transform = `rotate(${angle}deg)`;
            edgeElement.style.transformOrigin = '0 0';

            canvas.appendChild(edgeElement);
        }
    });

    // Render nodes
    workflowNodes.forEach(node => {
        const nodeElement = document.createElement('div');
        nodeElement.className = `workflow-node ${node.type}`;
        nodeElement.textContent = node.label;
        nodeElement.style.left = node.x + 'px';
        nodeElement.style.top = node.y + 'px';

        // Add hover tooltip
        nodeElement.addEventListener('mouseenter', (e) => {
            const tooltip = document.getElementById('workflow-tooltip');
            tooltip.innerHTML = `
                <strong>${node.fullName}</strong><br>
                Type: ${node.type}<br>
                Category: ${node.category}<br>
                Status: ${node.data.status || 'unknown'}
            `;
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY - 10) + 'px';
            tooltip.classList.add('show');
        });

        nodeElement.addEventListener('mouseleave', () => {
            document.getElementById('workflow-tooltip').classList.remove('show');
        });

        nodeElement.addEventListener('mousemove', (e) => {
            const tooltip = document.getElementById('workflow-tooltip');
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY - 10) + 'px';
        });

        canvas.appendChild(nodeElement);
    });
}
