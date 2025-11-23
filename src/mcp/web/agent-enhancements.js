// Agent Management Enhancements
// Advanced agent lifecycle, monitoring, and orchestration

class AgentEnhancements {
    constructor(mcp) {
        this.mcp = mcp;
        this.agents = new Map();
        this.agentTemplates = this.initializeTemplates();
        this.monitoringInterval = null;
        this.agentGroups = new Map();
    }

    // Initialize with predefined agent templates
    initializeTemplates() {
        return {
            'systemd-monitor': {
                type: 'systemd',
                name: 'SystemD Service Monitor',
                description: 'Monitors systemd services and reports status changes',
                config: {
                    services: ['NetworkManager', 'sshd', 'docker'],
                    interval: 10000,
                    autoRestart: true
                }
            },
            'dbus-watcher': {
                type: 'monitor',
                name: 'D-Bus Signal Watcher',
                description: 'Watches for specific D-Bus signals and logs them',
                config: {
                    bus: 'system',
                    signals: ['org.freedesktop.NetworkManager.StateChanged'],
                    logLevel: 'info'
                }
            },
            'file-processor': {
                type: 'file',
                name: 'File Processor',
                description: 'Watches directories and processes files',
                config: {
                    watchPath: '/tmp/watch',
                    pattern: '*.json',
                    action: 'process'
                }
            },
            'network-analyzer': {
                type: 'network',
                name: 'Network Traffic Analyzer',
                description: 'Analyzes network traffic and reports anomalies',
                config: {
                    interface: 'eth0',
                    threshold: 1000000,
                    alert: true
                }
            },
            'task-executor': {
                type: 'executor',
                name: 'Periodic Task Executor',
                description: 'Executes tasks on a schedule',
                config: {
                    tasks: [],
                    schedule: '*/5 * * * *'
                }
            }
        };
    }

    // Initialize enhanced agent UI
    init() {
        this.setupEnhancedUI();
        this.startMonitoring();
        this.setupAgentGrouping();
    }

    // Setup enhanced agent management UI
    setupEnhancedUI() {
        const agentsSection = document.querySelector('#agents');
        if (!agentsSection) return;

        // Add enhanced controls
        const controlsHTML = `
            <div class="agent-enhanced-controls" style="display: flex; gap: 10px; margin-bottom: 15px; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; flex-wrap: wrap;">
                <button class="btn btn-sm btn-success" onclick="window.agentEnhancements.spawnFromTemplate()">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Quick Spawn
                </button>
                <button class="btn btn-sm" onclick="window.agentEnhancements.startAllAgents()">
                    ▶️ Start All
                </button>
                <button class="btn btn-sm" onclick="window.agentEnhancements.stopAllAgents()">
                    ⏸️ Stop All
                </button>
                <button class="btn btn-sm" onclick="window.agentEnhancements.restartAllAgents()">
                    🔄 Restart All
                </button>
                <button class="btn btn-sm btn-danger" onclick="window.agentEnhancements.killAllAgents()">
                    ⛔ Kill All
                </button>
                <button class="btn btn-sm" onclick="window.agentEnhancements.exportAgentConfig()">
                    💾 Export Config
                </button>
                <button class="btn btn-sm" onclick="window.agentEnhancements.importAgentConfig()">
                    📂 Import Config
                </button>
                <button class="btn btn-sm" onclick="window.agentEnhancements.showAgentMetrics()">
                    📊 Metrics
                </button>
                <select id="agent-filter" class="form-select form-select-sm" onchange="window.agentEnhancements.filterAgents(this.value)" style="max-width: 150px;">
                    <option value="all">All Agents</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="error">Error</option>
                    <option value="idle">Idle</option>
                </select>
                <select id="agent-group" class="form-select form-select-sm" onchange="window.agentEnhancements.filterByGroup(this.value)" style="max-width: 150px;">
                    <option value="all">All Groups</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="processing">Processing</option>
                    <option value="network">Network</option>
                    <option value="system">System</option>
                </select>
            </div>

            <div class="agent-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 15px;">
                <div class="stat-card">
                    <div class="stat-value" id="agent-count-total">0</div>
                    <div class="stat-label">Total Agents</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="agent-count-running">0</div>
                    <div class="stat-label">Running</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="agent-count-stopped">0</div>
                    <div class="stat-label">Stopped</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="agent-count-error">0</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="agent-cpu-total">0%</div>
                    <div class="stat-label">Total CPU</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="agent-memory-total">0 MB</div>
                    <div class="stat-label">Total Memory</div>
                </div>
            </div>
        `;

        const sectionHeader = agentsSection.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.insertAdjacentHTML('afterend', controlsHTML);
        }
    }

    // Spawn agent from template
    spawnFromTemplate() {
        const templates = Object.keys(this.agentTemplates);

        let templateHTML = '<div style="padding: 20px; max-width: 500px;"><h3 style="margin-top: 0;">Quick Spawn Agent</h3>';
        templateHTML += '<div style="display: grid; gap: 12px;">';

        templates.forEach(templateId => {
            const template = this.agentTemplates[templateId];
            templateHTML += `
                <button class="btn" onclick="window.agentEnhancements.spawnAgent('${templateId}')" style="text-align: left; padding: 12px;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${template.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${template.description}</div>
                </button>
            `;
        });

        templateHTML += '</div></div>';

        // Show in a modal (you could also use the existing modal)
        this.mcp.showToast(templateHTML, 'info', 10000);
    }

    // Spawn agent with configuration
    async spawnAgent(templateId, customConfig = null) {
        const template = this.agentTemplates[templateId];
        if (!template) {
            this.mcp.showToast('Invalid template', 'error');
            return;
        }

        const config = customConfig || template.config;

        try {
            const response = await fetch('/api/agents/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: template.type,
                    name: template.name,
                    config
                })
            });

            const result = await response.json();

            if (result.success) {
                this.addAgentToList(result.agent);
                this.mcp.showToast(`Agent "${template.name}" spawned successfully`, 'success');
            } else {
                this.mcp.showToast(`Failed to spawn agent: ${result.error}`, 'error');
            }
        } catch (error) {
            this.mcp.showToast('Failed to spawn agent', 'error');
            console.error('Spawn error:', error);
        }
    }

    // Add agent to tracking and UI
    addAgentToList(agent) {
        this.agents.set(agent.id, {
            ...agent,
            health: 'healthy',
            cpu: 0,
            memory: 0,
            lastSeen: Date.now()
        });

        this.updateAgentTable();
        this.updateAgentStats();
    }

    // Update agent table with enhanced information
    updateAgentTable() {
        const tbody = document.getElementById('agents-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.agents.forEach((agent, id) => {
            const row = document.createElement('tr');
            row.dataset.agentId = id;
            row.dataset.status = agent.status;

            const statusColor = this.getStatusColor(agent.status);
            const healthIcon = this.getHealthIcon(agent.health);

            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span title="${agent.health}">${healthIcon}</span>
                        <code style="font-size: 11px;">${id.substring(0, 8)}</code>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight: 600;">${agent.type}</div>
                        ${agent.name ? `<div style="font-size: 11px; color: var(--text-secondary);">${agent.name}</div>` : ''}
                    </div>
                </td>
                <td>
                    <span class="badge" style="background: ${statusColor}; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                        ${agent.status}
                    </span>
                </td>
                <td>
                    <div>${agent.tasksCompleted || 0} / ${agent.tasksTotal || 0}</div>
                    ${agent.tasksCurrent ? `<div style="font-size: 11px; color: var(--text-secondary);">Current: ${agent.tasksCurrent}</div>` : ''}
                </td>
                <td>
                    <div>${this.formatUptime(agent.uptime || 0)}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">
                        CPU: ${agent.cpu.toFixed(1)}% | Mem: ${agent.memory} MB
                    </div>
                </td>
                <td>
                    <div class="btn-group" style="display: flex; gap: 4px;">
                        ${agent.status === 'running' ? `
                            <button class="btn btn-xs" onclick="window.agentEnhancements.pauseAgent('${id}')" title="Pause">⏸️</button>
                        ` : `
                            <button class="btn btn-xs btn-success" onclick="window.agentEnhancements.startAgent('${id}')" title="Start">▶️</button>
                        `}
                        <button class="btn btn-xs" onclick="window.agentEnhancements.restartAgent('${id}')" title="Restart">🔄</button>
                        <button class="btn btn-xs" onclick="window.agentEnhancements.viewAgentLogs('${id}')" title="Logs">📋</button>
                        <button class="btn btn-xs" onclick="window.agentEnhancements.inspectAgent('${id}')" title="Inspect">🔍</button>
                        <button class="btn btn-xs btn-danger" onclick="window.agentEnhancements.killAgent('${id}')" title="Kill">⛔</button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    // Update agent statistics
    updateAgentStats() {
        const total = this.agents.size;
        const running = Array.from(this.agents.values()).filter(a => a.status === 'running').length;
        const stopped = Array.from(this.agents.values()).filter(a => a.status === 'stopped').length;
        const error = Array.from(this.agents.values()).filter(a => a.status === 'error').length;

        const totalCPU = Array.from(this.agents.values()).reduce((sum, a) => sum + (a.cpu || 0), 0);
        const totalMemory = Array.from(this.agents.values()).reduce((sum, a) => sum + (a.memory || 0), 0);

        document.getElementById('agent-count-total').textContent = total;
        document.getElementById('agent-count-running').textContent = running;
        document.getElementById('agent-count-stopped').textContent = stopped;
        document.getElementById('agent-count-error').textContent = error;
        document.getElementById('agent-cpu-total').textContent = `${totalCPU.toFixed(1)}%`;
        document.getElementById('agent-memory-total').textContent = `${totalMemory} MB`;
    }

    // Agent lifecycle operations
    async startAgent(agentId) {
        await this.sendAgentCommand(agentId, 'start');
    }

    async pauseAgent(agentId) {
        await this.sendAgentCommand(agentId, 'pause');
    }

    async restartAgent(agentId) {
        await this.sendAgentCommand(agentId, 'restart');
    }

    async killAgent(agentId) {
        if (!confirm('Are you sure you want to kill this agent?')) return;
        await this.sendAgentCommand(agentId, 'kill');
    }

    // Send command to agent
    async sendAgentCommand(agentId, command) {
        try {
            const response = await fetch(`/api/agents/${agentId}/${command}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                const agent = this.agents.get(agentId);
                if (agent) {
                    agent.status = result.status;
                    this.updateAgentTable();
                    this.updateAgentStats();
                }
                this.mcp.showToast(`Agent ${command} successful`, 'success');
            } else {
                this.mcp.showToast(`Failed to ${command} agent`, 'error');
            }
        } catch (error) {
            this.mcp.showToast(`Error: ${error.message}`, 'error');
            console.error('Agent command error:', error);
        }
    }

    // Bulk operations
    async startAllAgents() {
        const stopped = Array.from(this.agents.entries())
            .filter(([_, agent]) => agent.status !== 'running');

        for (const [id] of stopped) {
            await this.startAgent(id);
        }
        this.mcp.showToast(`Started ${stopped.length} agents`, 'success');
    }

    async stopAllAgents() {
        const running = Array.from(this.agents.entries())
            .filter(([_, agent]) => agent.status === 'running');

        for (const [id] of running) {
            await this.pauseAgent(id);
        }
        this.mcp.showToast(`Stopped ${running.length} agents`, 'success');
    }

    async restartAllAgents() {
        for (const [id] of this.agents) {
            await this.restartAgent(id);
        }
        this.mcp.showToast(`Restarted all agents`, 'success');
    }

    async killAllAgents() {
        if (!confirm(`Kill ALL ${this.agents.size} agents? This cannot be undone.`)) return;

        for (const [id] of this.agents) {
            await this.killAgent(id);
        }
        this.agents.clear();
        this.updateAgentTable();
        this.updateAgentStats();
        this.mcp.showToast('All agents killed', 'warning');
    }

    // View agent logs
    async viewAgentLogs(agentId) {
        try {
            const response = await fetch(`/api/agents/${agentId}/logs`);
            const result = await response.json();

            if (result.success) {
                const logsHTML = `
                    <div style="padding: 20px; max-width: 700px; max-height: 500px; overflow-y: auto;">
                        <h3 style="margin-top: 0;">Agent Logs: ${agentId.substring(0, 8)}</h3>
                        <pre style="background: var(--bg-code); padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.6; overflow-x: auto;">${result.logs || 'No logs available'}</pre>
                    </div>
                `;
                this.mcp.showToast(logsHTML, 'info', 15000);
            }
        } catch (error) {
            this.mcp.showToast('Failed to fetch logs', 'error');
        }
    }

    // Inspect agent details
    async inspectAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        const detailsHTML = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">Agent Details</h3>
                <div style="display: grid; gap: 12px; font-size: 13px;">
                    <div><strong>ID:</strong> <code>${agentId}</code></div>
                    <div><strong>Type:</strong> ${agent.type}</div>
                    <div><strong>Name:</strong> ${agent.name || 'N/A'}</div>
                    <div><strong>Status:</strong> ${agent.status}</div>
                    <div><strong>Health:</strong> ${agent.health}</div>
                    <div><strong>Uptime:</strong> ${this.formatUptime(agent.uptime || 0)}</div>
                    <div><strong>CPU:</strong> ${agent.cpu.toFixed(2)}%</div>
                    <div><strong>Memory:</strong> ${agent.memory} MB</div>
                    <div><strong>Tasks:</strong> ${agent.tasksCompleted || 0} / ${agent.tasksTotal || 0}</div>
                    ${agent.config ? `<div style="margin-top: 12px;"><strong>Configuration:</strong><pre style="background: var(--bg-code); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 11px; margin-top: 4px;">${JSON.stringify(agent.config, null, 2)}</pre></div>` : ''}
                </div>
            </div>
        `;

        this.mcp.showToast(detailsHTML, 'info', 12000);
    }

    // Show agent metrics dashboard
    showAgentMetrics() {
        const metricsHTML = `
            <div style="padding: 20px; max-width: 700px;">
                <h3 style="margin-top: 0;">Agent Metrics</h3>
                <div style="display: grid; gap: 15px;">
                    <div>
                        <h4>Resource Usage</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <div>Total CPU: ${document.getElementById('agent-cpu-total')?.textContent}</div>
                            <div>Total Memory: ${document.getElementById('agent-memory-total')?.textContent}</div>
                        </div>
                    </div>
                    <div>
                        <h4>Status Distribution</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <div>Running: ${document.getElementById('agent-count-running')?.textContent}</div>
                            <div>Stopped: ${document.getElementById('agent-count-stopped')?.textContent}</div>
                            <div>Errors: ${document.getElementById('agent-count-error')?.textContent}</div>
                            <div>Total: ${document.getElementById('agent-count-total')?.textContent}</div>
                        </div>
                    </div>
                    <div>
                        <h4>Performance</h4>
                        <div>Average uptime: ${this.calculateAverageUptime()}</div>
                        <div>Total tasks completed: ${this.calculateTotalTasks()}</div>
                    </div>
                </div>
            </div>
        `;

        this.mcp.showToast(metricsHTML, 'info', 10000);
    }

    // Export agent configuration
    exportAgentConfig() {
        const config = {
            exportDate: new Date().toISOString(),
            agents: Array.from(this.agents.values()).map(agent => ({
                type: agent.type,
                name: agent.name,
                config: agent.config
            }))
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agent-config-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.mcp.showToast('Agent configuration exported', 'success');
    }

    // Import agent configuration
    importAgentConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const config = JSON.parse(text);

                if (config.agents && Array.isArray(config.agents)) {
                    for (const agentConfig of config.agents) {
                        const templateId = Object.keys(this.agentTemplates)
                            .find(id => this.agentTemplates[id].type === agentConfig.type);

                        if (templateId) {
                            await this.spawnAgent(templateId, agentConfig.config);
                        }
                    }
                    this.mcp.showToast(`Imported ${config.agents.length} agents`, 'success');
                } else {
                    this.mcp.showToast('Invalid configuration format', 'error');
                }
            } catch (error) {
                this.mcp.showToast('Failed to import configuration', 'error');
                console.error('Import error:', error);
            }
        };

        input.click();
    }

    // Filter agents by status
    filterAgents(status) {
        const rows = document.querySelectorAll('#agents-tbody tr');

        rows.forEach(row => {
            const rowStatus = row.dataset.status;

            if (status === 'all' || rowStatus === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Filter agents by group
    filterByGroup(group) {
        // TODO: Implement group filtering
        this.mcp.showToast(`Filtering by group: ${group}`, 'info');
    }

    // Setup agent grouping
    setupAgentGrouping() {
        // Automatically group agents by type
        this.agents.forEach((agent, id) => {
            const groupName = agent.type;

            if (!this.agentGroups.has(groupName)) {
                this.agentGroups.set(groupName, new Set());
            }

            this.agentGroups.get(groupName).add(id);
        });
    }

    // Start real-time monitoring
    startMonitoring() {
        if (this.monitoringInterval) return;

        this.monitoringInterval = setInterval(async () => {
            await this.updateAgentHealthStatus();
        }, 5000);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    // Update agent health status
    async updateAgentHealthStatus() {
        try {
            const response = await fetch('/api/agents/health');
            const result = await response.json();

            if (result.success && result.agents) {
                result.agents.forEach(agentData => {
                    const agent = this.agents.get(agentData.id);
                    if (agent) {
                        agent.health = agentData.health;
                        agent.cpu = agentData.cpu || 0;
                        agent.memory = agentData.memory || 0;
                        agent.uptime = agentData.uptime || 0;
                        agent.lastSeen = Date.now();
                    }
                });

                this.updateAgentTable();
                this.updateAgentStats();
            }
        } catch (error) {
            console.error('Failed to update agent health:', error);
        }
    }

    // Helper: Get status color
    getStatusColor(status) {
        const colors = {
            running: '#10b981',
            stopped: '#6b7280',
            error: '#ef4444',
            idle: '#f59e0b'
        };
        return colors[status] || '#6b7280';
    }

    // Helper: Get health icon
    getHealthIcon(health) {
        const icons = {
            healthy: '💚',
            warning: '⚠️',
            critical: '🔴',
            unknown: '❓'
        };
        return icons[health] || '❓';
    }

    // Helper: Format uptime
    formatUptime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
        return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    }

    // Helper: Calculate average uptime
    calculateAverageUptime() {
        const agents = Array.from(this.agents.values());
        if (agents.length === 0) return '0s';

        const avgUptime = agents.reduce((sum, a) => sum + (a.uptime || 0), 0) / agents.length;
        return this.formatUptime(Math.floor(avgUptime));
    }

    // Helper: Calculate total tasks
    calculateTotalTasks() {
        return Array.from(this.agents.values())
            .reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);
    }
}

// Initialize agent enhancements when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.agentEnhancements = new AgentEnhancements(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.agentEnhancements.init();
        });
    } else {
        window.agentEnhancements.init();
    }

    // Add methods to global mcp object
    window.mcp.spawnAgentFromTemplate = (id) => window.agentEnhancements.spawnAgent(id);
    window.mcp.killAgent = (id) => window.agentEnhancements.killAgent(id);
    window.mcp.restartAgent = (id) => window.agentEnhancements.restartAgent(id);
}
