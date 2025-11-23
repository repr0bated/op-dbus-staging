// Settings and Preferences Panel
// Centralized settings management for all MCP features

class SettingsPanel {
    constructor(mcp) {
        this.mcp = mcp;
        this.settings = {
            general: {
                theme: 'dark',
                language: 'en',
                autoSave: true,
                confirmOnExit: false
            },
            dashboard: {
                refreshInterval: 5000,
                enableRealTimeMonitoring: true,
                chartType: 'line',
                maxDataPoints: 60
            },
            chat: {
                saveHistory: true,
                autoScroll: true,
                enableSyntaxHighlighting: true,
                maxHistoryItems: 100,
                showTimestamps: true
            },
            agents: {
                autoStartMonitoring: true,
                monitoringInterval: 5000,
                showResourceUsage: true,
                maxAgents: 50
            },
            workflow: {
                autoSave: true,
                autoSaveInterval: 30000,
                snapToGrid: true,
                gridSize: 20,
                showMinimap: false
            },
            discovery: {
                autoExpand: false,
                defaultView: 'tree',
                showIcons: true,
                cacheResults: true
            },
            notifications: {
                enabled: true,
                position: 'top-right',
                duration: 5000,
                maxNotifications: 5,
                soundEnabled: false
            },
            diagnostics: {
                autoMonitoring: true,
                monitoringInterval: 60000,
                showFloatingButton: true,
                alertOnCritical: true
            },
            accessibility: {
                highContrast: false,
                largeText: false,
                reducedMotion: false,
                fontSize: 100,
                screenReaderAnnouncements: true
            },
            performance: {
                lazyLoading: true,
                virtualScrolling: true,
                cacheEnabled: true,
                cacheTTL: 300000,
                batchRequests: true
            }
        };

        this.settingsMetadata = this.initializeMetadata();
    }

    // Initialize settings metadata (descriptions, types, etc.)
    initializeMetadata() {
        return {
            general: {
                title: 'General Settings',
                icon: '⚙️',
                fields: {
                    theme: {
                        label: 'Theme',
                        type: 'select',
                        options: [
                            { value: 'dark', label: 'Dark' },
                            { value: 'light', label: 'Light' },
                            { value: 'auto', label: 'Auto (System)' }
                        ],
                        description: 'Choose your preferred color scheme'
                    },
                    language: {
                        label: 'Language',
                        type: 'select',
                        options: [
                            { value: 'en', label: 'English' },
                            { value: 'es', label: 'Spanish' },
                            { value: 'fr', label: 'French' },
                            { value: 'de', label: 'German' }
                        ],
                        description: 'Select your language'
                    },
                    autoSave: {
                        label: 'Auto-save',
                        type: 'checkbox',
                        description: 'Automatically save changes'
                    },
                    confirmOnExit: {
                        label: 'Confirm on exit',
                        type: 'checkbox',
                        description: 'Ask for confirmation before leaving the page'
                    }
                }
            },
            dashboard: {
                title: 'Dashboard',
                icon: '📊',
                fields: {
                    refreshInterval: {
                        label: 'Refresh interval',
                        type: 'number',
                        min: 1000,
                        max: 60000,
                        step: 1000,
                        suffix: 'ms',
                        description: 'How often to refresh dashboard metrics'
                    },
                    enableRealTimeMonitoring: {
                        label: 'Real-time monitoring',
                        type: 'checkbox',
                        description: 'Enable live updates for metrics'
                    },
                    chartType: {
                        label: 'Chart type',
                        type: 'select',
                        options: [
                            { value: 'line', label: 'Line' },
                            { value: 'bar', label: 'Bar' },
                            { value: 'area', label: 'Area' }
                        ],
                        description: 'Default chart visualization style'
                    },
                    maxDataPoints: {
                        label: 'Max data points',
                        type: 'number',
                        min: 10,
                        max: 200,
                        step: 10,
                        description: 'Maximum number of data points to display in charts'
                    }
                }
            },
            chat: {
                title: 'Chat',
                icon: '💬',
                fields: {
                    saveHistory: {
                        label: 'Save history',
                        type: 'checkbox',
                        description: 'Save chat history to local storage'
                    },
                    autoScroll: {
                        label: 'Auto-scroll',
                        type: 'checkbox',
                        description: 'Automatically scroll to new messages'
                    },
                    enableSyntaxHighlighting: {
                        label: 'Syntax highlighting',
                        type: 'checkbox',
                        description: 'Enable code syntax highlighting in chat'
                    },
                    maxHistoryItems: {
                        label: 'Max history items',
                        type: 'number',
                        min: 10,
                        max: 500,
                        step: 10,
                        description: 'Maximum number of messages to keep in history'
                    },
                    showTimestamps: {
                        label: 'Show timestamps',
                        type: 'checkbox',
                        description: 'Display message timestamps'
                    }
                }
            },
            agents: {
                title: 'Agents',
                icon: '🤖',
                fields: {
                    autoStartMonitoring: {
                        label: 'Auto-start monitoring',
                        type: 'checkbox',
                        description: 'Start agent monitoring on page load'
                    },
                    monitoringInterval: {
                        label: 'Monitoring interval',
                        type: 'number',
                        min: 1000,
                        max: 60000,
                        step: 1000,
                        suffix: 'ms',
                        description: 'How often to update agent status'
                    },
                    showResourceUsage: {
                        label: 'Show resource usage',
                        type: 'checkbox',
                        description: 'Display CPU and memory usage for agents'
                    },
                    maxAgents: {
                        label: 'Max agents',
                        type: 'number',
                        min: 1,
                        max: 100,
                        step: 1,
                        description: 'Maximum number of agents allowed'
                    }
                }
            },
            workflow: {
                title: 'Workflow',
                icon: '⚙️',
                fields: {
                    autoSave: {
                        label: 'Auto-save',
                        type: 'checkbox',
                        description: 'Automatically save workflow changes'
                    },
                    autoSaveInterval: {
                        label: 'Auto-save interval',
                        type: 'number',
                        min: 10000,
                        max: 300000,
                        step: 10000,
                        suffix: 'ms',
                        description: 'How often to auto-save workflows'
                    },
                    snapToGrid: {
                        label: 'Snap to grid',
                        type: 'checkbox',
                        description: 'Snap nodes to grid when moving'
                    },
                    gridSize: {
                        label: 'Grid size',
                        type: 'number',
                        min: 5,
                        max: 50,
                        step: 5,
                        suffix: 'px',
                        description: 'Grid spacing for node alignment'
                    },
                    showMinimap: {
                        label: 'Show minimap',
                        type: 'checkbox',
                        description: 'Display workflow minimap for navigation'
                    }
                }
            },
            discovery: {
                title: 'Discovery',
                icon: '🔍',
                fields: {
                    autoExpand: {
                        label: 'Auto-expand services',
                        type: 'checkbox',
                        description: 'Automatically expand discovered services'
                    },
                    defaultView: {
                        label: 'Default view',
                        type: 'select',
                        options: [
                            { value: 'tree', label: 'Tree View' },
                            { value: 'list', label: 'List View' },
                            { value: 'grid', label: 'Grid View' }
                        ],
                        description: 'Default view mode for discovered services'
                    },
                    showIcons: {
                        label: 'Show icons',
                        type: 'checkbox',
                        description: 'Display service type icons'
                    },
                    cacheResults: {
                        label: 'Cache results',
                        type: 'checkbox',
                        description: 'Cache discovery results for faster loading'
                    }
                }
            },
            notifications: {
                title: 'Notifications',
                icon: '🔔',
                fields: {
                    enabled: {
                        label: 'Enable notifications',
                        type: 'checkbox',
                        description: 'Show system notifications'
                    },
                    position: {
                        label: 'Position',
                        type: 'select',
                        options: [
                            { value: 'top-right', label: 'Top Right' },
                            { value: 'top-center', label: 'Top Center' },
                            { value: 'bottom-right', label: 'Bottom Right' },
                            { value: 'bottom-left', label: 'Bottom Left' }
                        ],
                        description: 'Where to display notifications'
                    },
                    duration: {
                        label: 'Duration',
                        type: 'number',
                        min: 1000,
                        max: 30000,
                        step: 1000,
                        suffix: 'ms',
                        description: 'How long to show notifications'
                    },
                    maxNotifications: {
                        label: 'Max visible',
                        type: 'number',
                        min: 1,
                        max: 10,
                        step: 1,
                        description: 'Maximum number of visible notifications'
                    },
                    soundEnabled: {
                        label: 'Sound enabled',
                        type: 'checkbox',
                        description: 'Play sound for notifications'
                    }
                }
            },
            diagnostics: {
                title: 'Diagnostics',
                icon: '🏥',
                fields: {
                    autoMonitoring: {
                        label: 'Auto-monitoring',
                        type: 'checkbox',
                        description: 'Automatically run health checks'
                    },
                    monitoringInterval: {
                        label: 'Monitoring interval',
                        type: 'number',
                        min: 10000,
                        max: 600000,
                        step: 10000,
                        suffix: 'ms',
                        description: 'How often to run health checks'
                    },
                    showFloatingButton: {
                        label: 'Show floating button',
                        type: 'checkbox',
                        description: 'Display diagnostic toggle button'
                    },
                    alertOnCritical: {
                        label: 'Alert on critical',
                        type: 'checkbox',
                        description: 'Show alerts for critical issues'
                    }
                }
            },
            accessibility: {
                title: 'Accessibility',
                icon: '♿',
                fields: {
                    highContrast: {
                        label: 'High contrast',
                        type: 'checkbox',
                        description: 'Enable high contrast mode'
                    },
                    largeText: {
                        label: 'Large text',
                        type: 'checkbox',
                        description: 'Use larger text size'
                    },
                    reducedMotion: {
                        label: 'Reduced motion',
                        type: 'checkbox',
                        description: 'Reduce animations and transitions'
                    },
                    fontSize: {
                        label: 'Font size',
                        type: 'range',
                        min: 80,
                        max: 150,
                        step: 10,
                        suffix: '%',
                        description: 'Adjust base font size'
                    },
                    screenReaderAnnouncements: {
                        label: 'Screen reader announcements',
                        type: 'checkbox',
                        description: 'Enable announcements for screen readers'
                    }
                }
            },
            performance: {
                title: 'Performance',
                icon: '⚡',
                fields: {
                    lazyLoading: {
                        label: 'Lazy loading',
                        type: 'checkbox',
                        description: 'Load content on demand'
                    },
                    virtualScrolling: {
                        label: 'Virtual scrolling',
                        type: 'checkbox',
                        description: 'Enable virtual scrolling for large lists'
                    },
                    cacheEnabled: {
                        label: 'Enable caching',
                        type: 'checkbox',
                        description: 'Cache API responses'
                    },
                    cacheTTL: {
                        label: 'Cache TTL',
                        type: 'number',
                        min: 60000,
                        max: 3600000,
                        step: 60000,
                        suffix: 'ms',
                        description: 'How long to cache data'
                    },
                    batchRequests: {
                        label: 'Batch requests',
                        type: 'checkbox',
                        description: 'Combine multiple requests for efficiency'
                    }
                }
            }
        };
    }

    // Initialize settings panel
    init() {
        this.loadSettings();
        this.createSettingsUI();
        this.applySettings();

        console.log('Settings panel initialized');
    }

    // Create settings UI
    createSettingsUI() {
        const settingsHTML = `
            <div id="settings-panel" style="
                position: fixed;
                top: 0;
                right: -450px;
                width: 450px;
                height: 100vh;
                background: var(--bg-primary);
                border-left: 1px solid var(--border-color);
                z-index: 10004;
                display: flex;
                flex-direction: column;
                transition: right 0.3s ease;
                box-shadow: -4px 0 12px rgba(0, 0, 0, 0.2);
            ">
                <!-- Header -->
                <div style="
                    padding: 20px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h2 style="margin: 0; font-size: 18px;">⚙️ Settings</h2>
                    <button class="btn btn-sm" onclick="window.settingsPanel.close()">✕</button>
                </div>

                <!-- Content -->
                <div style="flex: 1; overflow-y: auto; padding: 20px;" id="settings-content">
                    <!-- Settings will be rendered here -->
                </div>

                <!-- Footer -->
                <div style="
                    padding: 16px 20px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    gap: 10px;
                    justify-content: space-between;
                ">
                    <button class="btn btn-sm" onclick="window.settingsPanel.resetToDefaults()">
                        🔄 Reset to Defaults
                    </button>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-sm" onclick="window.settingsPanel.exportSettings()">
                            📤 Export
                        </button>
                        <button class="btn btn-sm" onclick="window.settingsPanel.importSettings()">
                            📥 Import
                        </button>
                    </div>
                </div>
            </div>

            <!-- Settings toggle button -->
            <button id="settings-toggle" onclick="window.settingsPanel.open()" style="
                position: fixed;
                top: 80px;
                right: 20px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 10px 16px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 9999;
                box-shadow: var(--shadow-sm);
            " title="Settings">
                ⚙️ Settings
            </button>
        `;

        document.body.insertAdjacentHTML('beforeend', settingsHTML);
        this.renderSettings();
    }

    // Render settings sections
    renderSettings() {
        const contentContainer = document.getElementById('settings-content');
        if (!contentContainer) return;

        const sectionsHTML = Object.entries(this.settingsMetadata).map(([sectionId, metadata]) => `
            <div class="settings-section" style="margin-bottom: 30px;">
                <h3 style="font-size: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span>${metadata.icon}</span>
                    <span>${metadata.title}</span>
                </h3>
                <div style="display: grid; gap: 16px;">
                    ${Object.entries(metadata.fields).map(([fieldId, field]) =>
                        this.renderField(sectionId, fieldId, field)
                    ).join('')}
                </div>
            </div>
        `).join('');

        contentContainer.innerHTML = sectionsHTML;
    }

    // Render individual field
    renderField(sectionId, fieldId, field) {
        const value = this.settings[sectionId][fieldId];

        let inputHTML = '';

        switch (field.type) {
            case 'checkbox':
                inputHTML = `
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" ${value ? 'checked' : ''}
                               onchange="window.settingsPanel.updateSetting('${sectionId}', '${fieldId}', this.checked)">
                        <span style="font-weight: 500;">${field.label}</span>
                    </label>
                    ${field.description ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${field.description}</div>` : ''}
                `;
                break;

            case 'select':
                inputHTML = `
                    <label style="display: block;">
                        <div style="font-weight: 500; margin-bottom: 6px;">${field.label}</div>
                        <select class="form-select"
                                onchange="window.settingsPanel.updateSetting('${sectionId}', '${fieldId}', this.value)"
                                style="width: 100%;">
                            ${field.options.map(opt => `
                                <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                                    ${opt.label}
                                </option>
                            `).join('')}
                        </select>
                        ${field.description ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${field.description}</div>` : ''}
                    </label>
                `;
                break;

            case 'number':
            case 'range':
                inputHTML = `
                    <label style="display: block;">
                        <div style="font-weight: 500; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                            <span>${field.label}</span>
                            <span style="font-weight: normal; font-size: 13px; color: var(--text-secondary);">
                                <span id="${sectionId}-${fieldId}-value">${value}</span>${field.suffix || ''}
                            </span>
                        </div>
                        <input type="${field.type}"
                               class="form-control"
                               value="${value}"
                               min="${field.min || 0}"
                               max="${field.max || 100}"
                               step="${field.step || 1}"
                               oninput="window.settingsPanel.updateSetting('${sectionId}', '${fieldId}', this.valueAsNumber); document.getElementById('${sectionId}-${fieldId}-value').textContent = this.value"
                               style="width: 100%;">
                        ${field.description ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${field.description}</div>` : ''}
                    </label>
                `;
                break;

            default:
                inputHTML = `
                    <label style="display: block;">
                        <div style="font-weight: 500; margin-bottom: 6px;">${field.label}</div>
                        <input type="text" class="form-control" value="${value}"
                               onchange="window.settingsPanel.updateSetting('${sectionId}', '${fieldId}', this.value)"
                               style="width: 100%;">
                        ${field.description ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${field.description}</div>` : ''}
                    </label>
                `;
        }

        return `<div class="settings-field">${inputHTML}</div>`;
    }

    // Open settings panel
    open() {
        const panel = document.getElementById('settings-panel');
        const button = document.getElementById('settings-toggle');

        if (panel) {
            panel.style.right = '0';
            button.style.display = 'none';

            if (window.accessibility) {
                window.accessibility.announce('Settings panel opened');
            }
        }
    }

    // Close settings panel
    close() {
        const panel = document.getElementById('settings-panel');
        const button = document.getElementById('settings-toggle');

        if (panel) {
            panel.style.right = '-450px';
            button.style.display = 'flex';

            if (window.accessibility) {
                window.accessibility.announce('Settings panel closed');
            }
        }
    }

    // Update setting
    updateSetting(section, field, value) {
        this.settings[section][field] = value;
        this.saveSettings();
        this.applySettings();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Setting updated', {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Apply settings to the application
    applySettings() {
        // Apply theme
        if (this.settings.general.theme !== 'auto') {
            document.documentElement.setAttribute('data-theme', this.settings.general.theme);
        }

        // Apply accessibility settings
        if (this.settings.accessibility.highContrast) {
            document.body.classList.add('high-contrast');
        }

        if (this.settings.accessibility.largeText) {
            document.body.classList.add('large-text');
        }

        if (this.settings.accessibility.reducedMotion) {
            document.body.classList.add('reduced-motion');
        }

        document.documentElement.style.fontSize = `${this.settings.accessibility.fontSize}%`;

        // Apply other settings to their respective modules
        if (window.dashboardEnhancements && this.settings.dashboard.enableRealTimeMonitoring) {
            window.dashboardEnhancements.startMonitoring(this.settings.dashboard.refreshInterval);
        }

        if (window.agentEnhancements && this.settings.agents.autoStartMonitoring) {
            window.agentEnhancements.startMonitoring(this.settings.agents.monitoringInterval);
        }

        if (window.diagnostics && this.settings.diagnostics.autoMonitoring) {
            window.diagnostics.startMonitoring(this.settings.diagnostics.monitoringInterval);
        }

        // Apply notification settings
        if (window.notificationSystem) {
            window.notificationSystem.defaultDuration = this.settings.notifications.duration;
            window.notificationSystem.maxNotifications = this.settings.notifications.maxNotifications;
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('mcp_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const saved = localStorage.getItem('mcp_settings');
            if (saved) {
                const loadedSettings = JSON.parse(saved);

                // Merge with defaults to ensure all keys exist
                Object.keys(this.settings).forEach(section => {
                    if (loadedSettings[section]) {
                        this.settings[section] = {
                            ...this.settings[section],
                            ...loadedSettings[section]
                        };
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    // Reset to defaults
    resetToDefaults() {
        if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;

        // Reset to hardcoded defaults (reinitialize)
        this.settings = {
            general: { theme: 'dark', language: 'en', autoSave: true, confirmOnExit: false },
            dashboard: { refreshInterval: 5000, enableRealTimeMonitoring: true, chartType: 'line', maxDataPoints: 60 },
            chat: { saveHistory: true, autoScroll: true, enableSyntaxHighlighting: true, maxHistoryItems: 100, showTimestamps: true },
            agents: { autoStartMonitoring: true, monitoringInterval: 5000, showResourceUsage: true, maxAgents: 50 },
            workflow: { autoSave: true, autoSaveInterval: 30000, snapToGrid: true, gridSize: 20, showMinimap: false },
            discovery: { autoExpand: false, defaultView: 'tree', showIcons: true, cacheResults: true },
            notifications: { enabled: true, position: 'top-right', duration: 5000, maxNotifications: 5, soundEnabled: false },
            diagnostics: { autoMonitoring: true, monitoringInterval: 60000, showFloatingButton: true, alertOnCritical: true },
            accessibility: { highContrast: false, largeText: false, reducedMotion: false, fontSize: 100, screenReaderAnnouncements: true },
            performance: { lazyLoading: true, virtualScrolling: true, cacheEnabled: true, cacheTTL: 300000, batchRequests: true }
        };

        this.saveSettings();
        this.renderSettings();
        this.applySettings();

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Settings reset to defaults', {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Export settings
    exportSettings() {
        const data = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            settings: this.settings
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mcp-settings-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Settings exported', {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Import settings
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (data.settings) {
                    this.settings = data.settings;
                    this.saveSettings();
                    this.renderSettings();
                    this.applySettings();

                    if (window.notificationSystem) {
                        window.notificationSystem.showNotification('Settings imported successfully', {
                            type: 'success',
                            duration: 3000
                        });
                    }
                } else {
                    throw new Error('Invalid settings file');
                }
            } catch (error) {
                if (window.notificationSystem) {
                    window.notificationSystem.showNotification('Failed to import settings', {
                        type: 'error',
                        duration: 3000
                    });
                }
            }
        };

        input.click();
    }

    // Get current settings
    getSettings() {
        return JSON.parse(JSON.stringify(this.settings));
    }
}

// Initialize settings panel when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.settingsPanel = new SettingsPanel(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.settingsPanel.init();
        });
    } else {
        window.settingsPanel.init();
    }

    // Add methods to global mcp object
    window.mcp.openSettings = () => window.settingsPanel.open();
    window.mcp.closeSettings = () => window.settingsPanel.close();
    window.mcp.getSettings = () => window.settingsPanel.getSettings();
}
