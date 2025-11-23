// System Diagnostics and Health Monitoring
// Comprehensive system health checks, diagnostics, and monitoring tools

class SystemDiagnostics {
    constructor(mcp) {
        this.mcp = mcp;
        this.healthChecks = [];
        this.monitoringInterval = null;
        this.diagnosticHistory = [];
        this.maxHistorySize = 100;
        this.thresholds = {
            cpu: 80,
            memory: 85,
            disk: 90,
            responseTime: 1000
        };
    }

    // Initialize diagnostics system
    init() {
        this.setupHealthChecks();
        this.setupDiagnosticPanel();
        this.startMonitoring();

        console.log('System diagnostics initialized');
    }

    // Setup health check definitions
    setupHealthChecks() {
        this.healthChecks = [
            {
                id: 'api-connectivity',
                name: 'API Connectivity',
                check: () => this.checkAPIConnectivity(),
                critical: true
            },
            {
                id: 'memory-usage',
                name: 'Memory Usage',
                check: () => this.checkMemoryUsage(),
                critical: false
            },
            {
                id: 'response-time',
                name: 'API Response Time',
                check: () => this.checkResponseTime(),
                critical: false
            },
            {
                id: 'websocket',
                name: 'WebSocket Connection',
                check: () => this.checkWebSocket(),
                critical: false
            },
            {
                id: 'local-storage',
                name: 'Local Storage',
                check: () => this.checkLocalStorage(),
                critical: false
            },
            {
                id: 'browser-compatibility',
                name: 'Browser Compatibility',
                check: () => this.checkBrowserCompatibility(),
                critical: true
            }
        ];
    }

    // Setup diagnostic control panel
    setupDiagnosticPanel() {
        const panelHTML = `
            <div id="diagnostic-panel" style="position: fixed; bottom: 20px; left: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; display: none; z-index: 9998; max-width: 350px; box-shadow: var(--shadow-lg);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 14px;">System Diagnostics</h4>
                    <button class="btn btn-xs" onclick="window.diagnostics.closeDiagnosticPanel()" title="Close">✕</button>
                </div>

                <div id="health-status" style="display: grid; gap: 8px; margin-bottom: 12px;">
                    <!-- Health checks will be inserted here -->
                </div>

                <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display: grid; gap: 8px;">
                    <button class="btn btn-sm" onclick="window.diagnostics.runFullDiagnostic()">
                        🔍 Run Full Diagnostic
                    </button>
                    <button class="btn btn-sm" onclick="window.diagnostics.exportDiagnosticReport()">
                        📊 Export Report
                    </button>
                    <button class="btn btn-sm" onclick="window.diagnostics.showDiagnosticHistory()">
                        📈 View History
                    </button>
                </div>

                <div style="margin-top: 12px; font-size: 11px; color: var(--text-tertiary);">
                    Last check: <span id="last-diagnostic-time">Never</span>
                </div>
            </div>

            <!-- Diagnostic toggle button -->
            <button id="diagnostic-toggle" onclick="window.diagnostics.toggleDiagnosticPanel()" style="
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 50%;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: var(--shadow-md);
                z-index: 9997;
                font-size: 20px;
            " title="System Diagnostics">
                🏥
            </button>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }

    // Toggle diagnostic panel
    toggleDiagnosticPanel() {
        const panel = document.getElementById('diagnostic-panel');
        const button = document.getElementById('diagnostic-toggle');

        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            button.style.display = 'none';
            this.updateHealthStatus();
        } else {
            this.closeDiagnosticPanel();
        }
    }

    // Close diagnostic panel
    closeDiagnosticPanel() {
        const panel = document.getElementById('diagnostic-panel');
        const button = document.getElementById('diagnostic-toggle');

        panel.style.display = 'none';
        button.style.display = 'flex';
    }

    // Update health status display
    async updateHealthStatus() {
        const container = document.getElementById('health-status');
        if (!container) return;

        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 12px;">Running checks...</div>';

        const results = await this.runHealthChecks();

        container.innerHTML = results.map(result => `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-tertiary); border-radius: 4px;">
                <span style="font-size: 16px;">${result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'}</span>
                <span style="flex: 1; font-size: 12px;">${result.name}</span>
                ${result.value ? `<span style="font-size: 11px; color: var(--text-secondary);">${result.value}</span>` : ''}
            </div>
        `).join('');

        document.getElementById('last-diagnostic-time').textContent = new Date().toLocaleTimeString();
    }

    // Run all health checks
    async runHealthChecks() {
        const results = [];

        for (const check of this.healthChecks) {
            try {
                const result = await check.check();
                results.push({
                    id: check.id,
                    name: check.name,
                    status: result.status,
                    value: result.value,
                    message: result.message,
                    critical: check.critical,
                    timestamp: Date.now()
                });
            } catch (error) {
                results.push({
                    id: check.id,
                    name: check.name,
                    status: 'fail',
                    message: error.message,
                    critical: check.critical,
                    timestamp: Date.now()
                });
            }
        }

        // Store in history
        this.diagnosticHistory.push({
            timestamp: Date.now(),
            results
        });

        if (this.diagnosticHistory.length > this.maxHistorySize) {
            this.diagnosticHistory.shift();
        }

        return results;
    }

    // Check API connectivity
    async checkAPIConnectivity() {
        try {
            const startTime = performance.now();
            const response = await fetch('/api/status', {
                method: 'GET',
                cache: 'no-cache'
            });
            const endTime = performance.now();

            if (response.ok) {
                const data = await response.json();
                return {
                    status: 'pass',
                    value: `${Math.round(endTime - startTime)}ms`,
                    message: 'API is responding'
                };
            } else {
                return {
                    status: 'warning',
                    message: `HTTP ${response.status}`
                };
            }
        } catch (error) {
            return {
                status: 'fail',
                message: error.message
            };
        }
    }

    // Check memory usage
    checkMemoryUsage() {
        if (!performance.memory) {
            return {
                status: 'warning',
                message: 'Memory API not available'
            };
        }

        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        const percentage = (used / total) * 100;

        let status = 'pass';
        if (percentage > this.thresholds.memory) {
            status = 'fail';
        } else if (percentage > this.thresholds.memory - 10) {
            status = 'warning';
        }

        return {
            status,
            value: `${Math.round(percentage)}%`,
            message: `${(used / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB`
        };
    }

    // Check API response time
    async checkResponseTime() {
        try {
            const startTime = performance.now();
            await fetch('/api/status', { method: 'HEAD' });
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            let status = 'pass';
            if (responseTime > this.thresholds.responseTime) {
                status = 'fail';
            } else if (responseTime > this.thresholds.responseTime * 0.7) {
                status = 'warning';
            }

            return {
                status,
                value: `${Math.round(responseTime)}ms`,
                message: 'Response time measured'
            };
        } catch (error) {
            return {
                status: 'fail',
                message: error.message
            };
        }
    }

    // Check WebSocket connection
    checkWebSocket() {
        // Check if WebSocket is supported and connected
        if (typeof WebSocket === 'undefined') {
            return {
                status: 'warning',
                message: 'WebSocket not supported'
            };
        }

        // Check if there's an active WebSocket connection
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            return {
                status: 'pass',
                value: 'Connected',
                message: 'WebSocket active'
            };
        }

        return {
            status: 'warning',
            value: 'Disconnected',
            message: 'WebSocket not connected'
        };
    }

    // Check local storage availability
    checkLocalStorage() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);

            // Check usage
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }

            const sizeKB = totalSize / 1024;
            const limitKB = 5120; // Typical 5MB limit
            const percentage = (sizeKB / limitKB) * 100;

            let status = 'pass';
            if (percentage > 80) {
                status = 'warning';
            }

            return {
                status,
                value: `${sizeKB.toFixed(1)}KB`,
                message: `${percentage.toFixed(1)}% used`
            };
        } catch (error) {
            return {
                status: 'fail',
                message: error.message
            };
        }
    }

    // Check browser compatibility
    checkBrowserCompatibility() {
        const features = {
            localStorage: typeof Storage !== 'undefined',
            fetch: typeof fetch !== 'undefined',
            promise: typeof Promise !== 'undefined',
            arrow: (() => { try { eval('()=>{}'); return true; } catch (e) { return false; } })(),
            async: (() => { try { eval('async()=>{}'); return true; } catch (e) { return false; } })()
        };

        const unsupported = Object.entries(features).filter(([_, supported]) => !supported);

        if (unsupported.length === 0) {
            return {
                status: 'pass',
                value: 'Full',
                message: 'All features supported'
            };
        } else if (unsupported.length <= 2) {
            return {
                status: 'warning',
                value: 'Partial',
                message: `Missing: ${unsupported.map(([name]) => name).join(', ')}`
            };
        } else {
            return {
                status: 'fail',
                value: 'Limited',
                message: 'Upgrade your browser'
            };
        }
    }

    // Run full diagnostic
    async runFullDiagnostic() {
        const panel = document.getElementById('diagnostic-panel');
        if (panel && panel.style.display === 'none') {
            this.toggleDiagnosticPanel();
        }

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Running full system diagnostic...', {
                type: 'info',
                duration: 2000
            });
        }

        await this.updateHealthStatus();

        // Show summary
        const results = this.diagnosticHistory[this.diagnosticHistory.length - 1].results;
        const passed = results.filter(r => r.status === 'pass').length;
        const warnings = results.filter(r => r.status === 'warning').length;
        const failed = results.filter(r => r.status === 'fail').length;

        let type = 'success';
        let message = 'All systems operational';

        if (failed > 0) {
            type = 'error';
            message = `${failed} critical issue${failed > 1 ? 's' : ''} detected`;
        } else if (warnings > 0) {
            type = 'warning';
            message = `${warnings} warning${warnings > 1 ? 's' : ''} detected`;
        }

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(message, {
                type,
                title: 'Diagnostic Complete',
                duration: 4000
            });
        }
    }

    // Export diagnostic report
    exportDiagnosticReport() {
        const report = {
            timestamp: new Date().toISOString(),
            browser: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            },
            performance: performance.memory ? {
                usedMemory: performance.memory.usedJSHeapSize,
                totalMemory: performance.memory.totalJSHeapSize,
                memoryLimit: performance.memory.jsHeapSizeLimit
            } : null,
            diagnosticHistory: this.diagnosticHistory,
            currentResults: this.diagnosticHistory[this.diagnosticHistory.length - 1]
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `diagnostic-report-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Diagnostic report exported', {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Show diagnostic history
    showDiagnosticHistory() {
        if (this.diagnosticHistory.length === 0) {
            this.mcp.showToast('No diagnostic history available', 'info');
            return;
        }

        const historyHTML = `
            <div style="padding: 20px; max-width: 700px; max-height: 600px; overflow-y: auto;">
                <h3 style="margin-top: 0;">Diagnostic History</h3>
                <div style="display: grid; gap: 12px;">
                    ${this.diagnosticHistory.slice(-10).reverse().map((entry, index) => {
                        const passed = entry.results.filter(r => r.status === 'pass').length;
                        const warnings = entry.results.filter(r => r.status === 'warning').length;
                        const failed = entry.results.filter(r => r.status === 'fail').length;
                        const time = new Date(entry.timestamp).toLocaleString();

                        return `
                            <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 6px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <strong style="font-size: 13px;">${time}</strong>
                                    <div style="display: flex; gap: 12px; font-size: 12px;">
                                        <span>✅ ${passed}</span>
                                        ${warnings > 0 ? `<span>⚠️ ${warnings}</span>` : ''}
                                        ${failed > 0 ? `<span>❌ ${failed}</span>` : ''}
                                    </div>
                                </div>
                                ${failed > 0 ? `
                                    <div style="font-size: 12px; color: #ef4444;">
                                        Failed: ${entry.results.filter(r => r.status === 'fail').map(r => r.name).join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        this.mcp.showToast(historyHTML, 'info', 12000);
    }

    // Start automatic monitoring
    startMonitoring(interval = 60000) {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(async () => {
            await this.runHealthChecks();

            // Check for critical failures
            const latest = this.diagnosticHistory[this.diagnosticHistory.length - 1];
            if (latest) {
                const criticalFailures = latest.results.filter(r => r.status === 'fail' && r.critical);

                if (criticalFailures.length > 0 && window.notificationSystem) {
                    window.notificationSystem.showNotification(
                        `Critical issue detected: ${criticalFailures[0].name}`,
                        {
                            type: 'error',
                            title: 'System Health Alert',
                            sticky: true,
                            actions: [
                                {
                                    label: 'View Details',
                                    handler: () => window.diagnostics.toggleDiagnosticPanel()
                                }
                            ]
                        }
                    );
                }
            }
        }, interval);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    // Get system info
    getSystemInfo() {
        return {
            browser: {
                name: this.detectBrowser(),
                version: this.detectBrowserVersion(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight
            },
            performance: performance.memory ? {
                usedMemory: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
                totalMemory: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
                limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
            } : null
        };
    }

    // Detect browser
    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Edg')) return 'Edge';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
        return 'Unknown';
    }

    // Detect browser version
    detectBrowserVersion() {
        const ua = navigator.userAgent;
        const match = ua.match(/(?:Firefox|Edg|Chrome|Safari|Opera|OPR)\/(\d+)/);
        return match ? match[1] : 'Unknown';
    }
}

// Initialize system diagnostics when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.diagnostics = new SystemDiagnostics(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.diagnostics.init();
        });
    } else {
        window.diagnostics.init();
    }

    // Add methods to global mcp object
    window.mcp.runDiagnostics = () => window.diagnostics.runFullDiagnostic();
    window.mcp.getSystemInfo = () => window.diagnostics.getSystemInfo();
}
