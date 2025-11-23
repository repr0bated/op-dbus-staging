// Dashboard Tab Enhancements
// Real-time monitoring and enhanced statistics

class DashboardEnhancements {
    constructor(mcp) {
        this.mcp = mcp;
        this.updateInterval = null;
        this.chartData = {
            requests: [],
            memory: [],
            cpu: []
        };
        this.maxDataPoints = 60; // Keep last 60 data points
    }

    // Start real-time monitoring
    startMonitoring(intervalMs = 5000) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.updateDashboardMetrics();
        }, intervalMs);

        this.mcp.showToast('Real-time monitoring started', 'success');
    }

    // Stop real-time monitoring
    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this.mcp.showToast('Real-time monitoring stopped', 'info');
        }
    }

    // Update dashboard metrics
    async updateDashboardMetrics() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            if (data.success) {
                this.updateStats(data.data);
                this.updateCharts(data.data);
            }
        } catch (error) {
            console.error('Failed to update dashboard metrics:', error);
        }
    }

    // Update statistics displays
    updateStats(data) {
        // Update uptime
        if (data.uptime !== undefined) {
            const uptimeEl = document.getElementById('uptime');
            if (uptimeEl) {
                uptimeEl.textContent = this.formatUptime(data.uptime);
            }
        }

        // Update request count
        if (data.requestCount !== undefined) {
            const requestEl = document.getElementById('request-count');
            if (requestEl) {
                requestEl.textContent = data.requestCount.toLocaleString();
            }
        }

        // Update active agents
        if (data.activeAgents !== undefined) {
            const agentsEl = document.getElementById('active-agents');
            if (agentsEl) {
                agentsEl.textContent = data.activeAgents;
            }
        }

        // Update available tools
        if (data.availableTools !== undefined) {
            const toolsEl = document.getElementById('available-tools');
            if (toolsEl) {
                toolsEl.textContent = data.availableTools;
            }
        }

        // Update memory usage if available
        if (data.memory) {
            this.updateMemoryDisplay(data.memory);
        }

        // Update CPU usage if available
        if (data.cpu) {
            this.updateCPUDisplay(data.cpu);
        }
    }

    // Format uptime duration
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    // Update memory display
    updateMemoryDisplay(memory) {
        const memoryEl = document.getElementById('memory-usage');
        if (!memoryEl) return;

        const used = memory.used || 0;
        const total = memory.total || 1;
        const percentage = ((used / total) * 100).toFixed(1);

        memoryEl.innerHTML = `
            <div class="metric-value">${this.formatBytes(used)} / ${this.formatBytes(total)}</div>
            <div class="metric-bar">
                <div class="metric-bar-fill" style="width: ${percentage}%; background: ${this.getColorForPercentage(percentage)}"></div>
            </div>
            <div class="metric-label">${percentage}% used</div>
        `;
    }

    // Update CPU display
    updateCPUDisplay(cpu) {
        const cpuEl = document.getElementById('cpu-usage');
        if (!cpuEl) return;

        const usage = cpu.usage || 0;
        const cores = cpu.cores || 1;

        cpuEl.innerHTML = `
            <div class="metric-value">${usage.toFixed(1)}%</div>
            <div class="metric-bar">
                <div class="metric-bar-fill" style="width: ${usage}%; background: ${this.getColorForPercentage(usage)}"></div>
            </div>
            <div class="metric-label">${cores} core${cores > 1 ? 's' : ''}</div>
        `;
    }

    // Format bytes to human readable
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    // Get color based on percentage
    getColorForPercentage(percentage) {
        if (percentage < 50) return '#10b981'; // green
        if (percentage < 75) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    }

    // Update charts with new data
    updateCharts(data) {
        const timestamp = new Date().toLocaleTimeString();

        // Add new data points
        this.chartData.requests.push({
            time: timestamp,
            value: data.requestCount || 0
        });

        if (data.memory) {
            this.chartData.memory.push({
                time: timestamp,
                value: ((data.memory.used / data.memory.total) * 100).toFixed(1)
            });
        }

        if (data.cpu) {
            this.chartData.cpu.push({
                time: timestamp,
                value: data.cpu.usage || 0
            });
        }

        // Keep only last N data points
        Object.keys(this.chartData).forEach(key => {
            if (this.chartData[key].length > this.maxDataPoints) {
                this.chartData[key].shift();
            }
        });

        // Render charts if containers exist
        this.renderMiniCharts();
    }

    // Render mini charts (simple ASCII/block charts)
    renderMiniCharts() {
        this.renderMiniChart('requests-chart', this.chartData.requests, 'Requests/min');
        this.renderMiniChart('memory-chart', this.chartData.memory, 'Memory %');
        this.renderMiniChart('cpu-chart', this.chartData.cpu, 'CPU %');
    }

    // Render a simple mini chart
    renderMiniChart(containerId, data, label) {
        const container = document.getElementById(containerId);
        if (!container || data.length === 0) return;

        const max = Math.max(...data.map(d => d.value), 1);
        const width = 100;
        const height = 40;

        const points = data.slice(-20).map((d, i) => {
            const x = (i / 19) * width;
            const y = height - ((d.value / max) * height);
            return `${x},${y}`;
        }).join(' ');

        container.innerHTML = `
            <div style="font-size: 11px; margin-bottom: 5px; color: var(--text-secondary);">${label}</div>
            <svg width="${width}" height="${height}" style="display: block;">
                <polyline points="${points}" fill="none" stroke="var(--color-primary)" stroke-width="2"/>
            </svg>
            <div style="font-size: 10px; margin-top: 3px; color: var(--text-tertiary);">
                Last: ${data[data.length - 1]?.value || 0}
            </div>
        `;
    }

    // Export dashboard data
    exportDashboardData() {
        const data = {
            timestamp: new Date().toISOString(),
            metrics: this.chartData,
            currentStats: {
                uptime: document.getElementById('uptime')?.textContent,
                requests: document.getElementById('request-count')?.textContent,
                agents: document.getElementById('active-agents')?.textContent,
                tools: document.getElementById('available-tools')?.textContent
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-metrics-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.mcp.showToast('Dashboard data exported', 'success');
    }

    // Add activity feed item
    addActivityItem(message, level = 'info') {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;

        const time = new Date().toLocaleTimeString();
        const item = document.createElement('div');
        item.className = `feed-item feed-${level}`;
        item.innerHTML = `
            <span class="feed-time">${time}</span>
            <span class="feed-message">${message}</span>
        `;

        feed.insertBefore(item, feed.firstChild);

        // Keep only last 50 items
        while (feed.children.length > 50) {
            feed.removeChild(feed.lastChild);
        }

        // Animate new item
        item.style.animation = 'slideIn 0.3s ease-out';
    }

    // Clear activity feed
    clearActivityFeed() {
        const feed = document.getElementById('activity-feed');
        if (feed) {
            feed.innerHTML = '<div class="feed-item"><span class="feed-time">--:--:--</span><span class="feed-message">Activity feed cleared</span></div>';
            this.mcp.showToast('Activity feed cleared', 'info');
        }
    }
}

// Initialize dashboard enhancements when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.dashboardEnhancements = new DashboardEnhancements(window.mcp);

    // Add methods to global mcp object
    window.mcp.startMonitoring = () => window.dashboardEnhancements.startMonitoring();
    window.mcp.stopMonitoring = () => window.dashboardEnhancements.stopMonitoring();
    window.mcp.exportDashboardData = () => window.dashboardEnhancements.exportDashboardData();
    window.mcp.clearActivityFeed = () => window.dashboardEnhancements.clearActivityFeed();
}
