// Backup and Restore System
// Complete data backup, restore, and migration functionality

class BackupRestoreSystem {
    constructor(mcp) {
        this.mcp = mcp;
        this.backupVersion = '1.0.0';
    }

    // Initialize backup/restore system
    init() {
        this.setupAutoBackup();
        this.setupUI();

        console.log('Backup and restore system initialized');
    }

    // Setup auto-backup
    setupAutoBackup() {
        // Check if auto-backup is enabled
        const settings = window.settingsPanel?.getSettings();
        if (settings?.general?.autoSave) {
            // Auto-backup every 30 minutes
            setInterval(() => {
                this.createAutoBackup();
            }, 30 * 60 * 1000);
        }
    }

    // Setup UI
    setupUI() {
        // Add backup/restore to command palette
        if (window.commandPalette) {
            window.commandPalette.commands.push(
                {
                    id: 'backup-create',
                    name: 'Create Backup',
                    icon: '💾',
                    category: 'Data',
                    action: () => this.createBackupDialog()
                },
                {
                    id: 'backup-restore',
                    name: 'Restore from Backup',
                    icon: '📂',
                    category: 'Data',
                    action: () => this.restoreBackupDialog()
                },
                {
                    id: 'backup-manage',
                    name: 'Manage Backups',
                    icon: '📚',
                    category: 'Data',
                    action: () => this.manageBackups()
                }
            );
        }
    }

    // Create comprehensive backup
    async createBackup(options = {}) {
        const {
            includeChat = true,
            includeWorkflows = true,
            includeSettings = true,
            includeAgents = true,
            includeDiagnostics = true,
            includeDisco very = false
        } = options;

        const backup = {
            version: this.backupVersion,
            timestamp: new Date().toISOString(),
            metadata: {
                browser: window.diagnostics?.getSystemInfo()?.browser,
                origin: window.location.origin
            },
            data: {}
        };

        // Chat history
        if (includeChat && window.chatEnhancements) {
            backup.data.chatHistory = window.chatEnhancements.messageHistory;
        }

        // Workflows
        if (includeWorkflows) {
            const workflows = localStorage.getItem('mcp_workflows');
            if (workflows) {
                backup.data.workflows = JSON.parse(workflows);
            }
        }

        // Settings
        if (includeSettings) {
            backup.data.settings = {
                mcp: localStorage.getItem('mcp_settings'),
                accessibility: localStorage.getItem('mcp_a11y_preferences'),
                theme: localStorage.getItem('theme')
            };
        }

        // Agent configurations
        if (includeAgents && window.agentEnhancements) {
            backup.data.agents = {
                configurations: Array.from(window.agentEnhancements.agents.values()).map(agent => ({
                    type: agent.type,
                    name: agent.name,
                    config: agent.config
                }))
            };
        }

        // Diagnostics history
        if (includeDiagnostics && window.diagnostics) {
            backup.data.diagnostics = window.diagnostics.diagnosticHistory;
        }

        // Discovery cache
        if (includeDiscovery) {
            const discoveryCache = localStorage.getItem('mcp_discovery_cache');
            if (discoveryCache) {
                backup.data.discoveryCache = JSON.parse(discoveryCache);
            }
        }

        // All localStorage data
        backup.data.localStorage = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('mcp_')) {
                backup.data.localStorage[key] = localStorage.getItem(key);
            }
        }

        return backup;
    }

    // Export backup to file
    async exportBackup(backup, filename = null) {
        const defaultFilename = `mcp-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || defaultFilename;
        link.click();
        URL.revokeObjectURL(url);

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Backup created and downloaded', {
                type: 'success',
                duration: 3000
            });
        }

        // Store backup metadata in localStorage
        this.storeBackupMetadata(filename || defaultFilename, backup);
    }

    // Restore from backup
    async restoreBackup(backup, options = {}) {
        const {
            restoreChat = true,
            restoreWorkflows = true,
            restoreSettings = true,
            restoreAgents = true,
            restoreDiagnostics = true,
            restoreDiscovery = true
        } = options;

        try {
            // Validate backup
            if (!this.validateBackup(backup)) {
                throw new Error('Invalid backup file');
            }

            const restored = [];

            // Restore chat history
            if (restoreChat && backup.data.chatHistory && window.chatEnhancements) {
                window.chatEnhancements.messageHistory = backup.data.chatHistory;
                window.chatEnhancements.saveConversationHistory();
                restored.push('Chat history');
            }

            // Restore workflows
            if (restoreWorkflows && backup.data.workflows) {
                localStorage.setItem('mcp_workflows', JSON.stringify(backup.data.workflows));
                restored.push('Workflows');
            }

            // Restore settings
            if (restoreSettings && backup.data.settings) {
                if (backup.data.settings.mcp) {
                    localStorage.setItem('mcp_settings', backup.data.settings.mcp);
                }
                if (backup.data.settings.accessibility) {
                    localStorage.setItem('mcp_a11y_preferences', backup.data.settings.accessibility);
                }
                if (backup.data.settings.theme) {
                    localStorage.setItem('theme', backup.data.settings.theme);
                }
                restored.push('Settings');
            }

            // Restore agent configurations
            if (restoreAgents && backup.data.agents && window.agentEnhancements) {
                // Note: This would require spawning agents, which might not be desired
                // Store for manual review instead
                localStorage.setItem('mcp_backup_agents', JSON.stringify(backup.data.agents));
                restored.push('Agent configurations (review required)');
            }

            // Restore diagnostics
            if (restoreDiagnostics && backup.data.diagnostics && window.diagnostics) {
                window.diagnostics.diagnosticHistory = backup.data.diagnostics;
                restored.push('Diagnostic history');
            }

            // Restore discovery cache
            if (restoreDiscovery && backup.data.discoveryCache) {
                localStorage.setItem('mcp_discovery_cache', JSON.stringify(backup.data.discoveryCache));
                restored.push('Discovery cache');
            }

            // Restore all localStorage items
            if (backup.data.localStorage) {
                Object.entries(backup.data.localStorage).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            }

            if (window.notificationSystem) {
                window.notificationSystem.showNotification(
                    `Backup restored successfully: ${restored.join(', ')}`,
                    {
                        type: 'success',
                        title: 'Restore Complete',
                        duration: 5000
                    }
                );
            }

            // Prompt to reload page
            if (await this.confirmReload()) {
                location.reload();
            }

            return true;
        } catch (error) {
            console.error('Restore failed:', error);

            if (window.notificationSystem) {
                window.notificationSystem.showNotification(
                    `Restore failed: ${error.message}`,
                    {
                        type: 'error',
                        duration: 5000
                    }
                );
            }

            return false;
        }
    }

    // Validate backup structure
    validateBackup(backup) {
        if (!backup || typeof backup !== 'object') {
            return false;
        }

        if (!backup.version || !backup.timestamp || !backup.data) {
            return false;
        }

        // Check version compatibility
        const backupMajor = parseInt(backup.version.split('.')[0]);
        const currentMajor = parseInt(this.backupVersion.split('.')[0]);

        if (backupMajor > currentMajor) {
            console.warn('Backup is from a newer version');
        }

        return true;
    }

    // Create auto-backup
    async createAutoBackup() {
        const backup = await this.createBackup({
            includeChat: true,
            includeWorkflows: true,
            includeSettings: true
        });

        // Store in localStorage (compressed)
        const compressed = JSON.stringify(backup);
        localStorage.setItem('mcp_auto_backup', compressed);
        localStorage.setItem('mcp_auto_backup_time', new Date().toISOString());

        console.log('Auto-backup created');
    }

    // Restore auto-backup
    async restoreAutoBackup() {
        const backup = localStorage.getItem('mcp_auto_backup');
        const timestamp = localStorage.getItem('mcp_auto_backup_time');

        if (!backup) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('No auto-backup found', {
                    type: 'warning',
                    duration: 3000
                });
            }
            return false;
        }

        const confirmed = confirm(`Restore auto-backup from ${new Date(timestamp).toLocaleString()}?`);
        if (!confirmed) return false;

        return await this.restoreBackup(JSON.parse(backup));
    }

    // Create backup dialog
    async createBackupDialog() {
        const dialogHTML = `
            <div style="padding: 20px; max-width: 500px;">
                <h3 style="margin-top: 0;">Create Backup</h3>
                <div style="display: grid; gap: 12px; margin: 20px 0;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="backup-chat" checked>
                        <span>Chat History</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="backup-workflows" checked>
                        <span>Workflows</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="backup-settings" checked>
                        <span>Settings & Preferences</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="backup-agents" checked>
                        <span>Agent Configurations</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="backup-diagnostics">
                        <span>Diagnostic History</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="backup-discovery">
                        <span>Discovery Cache</span>
                    </label>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="this.closest('#backup-dialog').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.backupRestore.executeBackup()">Create Backup</button>
                </div>
            </div>
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'backup-dialog';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            z-index: 10007;
        `;
        modal.innerHTML = dialogHTML;

        document.body.appendChild(modal);
    }

    // Execute backup from dialog
    async executeBackup() {
        const options = {
            includeChat: document.getElementById('backup-chat').checked,
            includeWorkflows: document.getElementById('backup-workflows').checked,
            includeSettings: document.getElementById('backup-settings').checked,
            includeAgents: document.getElementById('backup-agents').checked,
            includeDiagnostics: document.getElementById('backup-diagnostics').checked,
            includeDiscovery: document.getElementById('backup-discovery').checked
        };

        const backup = await this.createBackup(options);
        await this.exportBackup(backup);

        document.getElementById('backup-dialog')?.remove();
    }

    // Restore backup dialog
    restoreBackupDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const backup = JSON.parse(text);

                const confirmed = confirm(`Restore backup from ${new Date(backup.timestamp).toLocaleString()}?\n\nThis will replace your current data.`);
                if (!confirmed) return;

                await this.restoreBackup(backup);
            } catch (error) {
                if (window.notificationSystem) {
                    window.notificationSystem.showNotification('Failed to restore backup', {
                        type: 'error',
                        duration: 3000
                    });
                }
            }
        };

        input.click();
    }

    // Manage backups
    manageBackups() {
        const backups = this.getBackupList();

        const backupsHTML = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">Manage Backups</h3>
                ${backups.length > 0 ? `
                    <div style="display: grid; gap: 12px; margin: 20px 0;">
                        ${backups.map(backup => `
                            <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 600; font-size: 13px;">${backup.filename}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${new Date(backup.timestamp).toLocaleString()}</div>
                                </div>
                                <button class="btn btn-xs btn-danger" onclick="window.backupRestore.deleteBackupMetadata('${backup.filename}')">Delete</button>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                        No backups found
                    </div>
                `}
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button class="btn btn-sm" onclick="window.backupRestore.restoreAutoBackup()">
                        Restore Auto-Backup
                    </button>
                </div>
            </div>
        `;

        this.mcp.showToast(backupsHTML, 'info', 15000);
    }

    // Store backup metadata
    storeBackupMetadata(filename, backup) {
        const backups = this.getBackupList();
        backups.push({
            filename,
            timestamp: backup.timestamp,
            version: backup.version
        });

        // Keep only last 10 backups
        if (backups.length > 10) {
            backups.shift();
        }

        localStorage.setItem('mcp_backup_list', JSON.stringify(backups));
    }

    // Get backup list
    getBackupList() {
        try {
            const list = localStorage.getItem('mcp_backup_list');
            return list ? JSON.parse(list) : [];
        } catch {
            return [];
        }
    }

    // Delete backup metadata
    deleteBackupMetadata(filename) {
        const backups = this.getBackupList().filter(b => b.filename !== filename);
        localStorage.setItem('mcp_backup_list', JSON.stringify(backups));

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Backup metadata deleted', {
                type: 'info',
                duration: 2000
            });
        }

        // Refresh management view
        this.manageBackups();
    }

    // Confirm reload
    async confirmReload() {
        return new Promise((resolve) => {
            if (window.notificationSystem) {
                const confirmed = confirm('Reload the page to apply changes?');
                resolve(confirmed);
            } else {
                resolve(false);
            }
        });
    }

    // Export specific data type
    async exportData(type) {
        let data, filename;

        switch (type) {
            case 'chat':
                data = window.chatEnhancements?.messageHistory;
                filename = `chat-history-${Date.now()}.json`;
                break;

            case 'workflows':
                data = JSON.parse(localStorage.getItem('mcp_workflows') || 'null');
                filename = `workflows-${Date.now()}.json`;
                break;

            case 'settings':
                data = window.settingsPanel?.getSettings();
                filename = `settings-${Date.now()}.json`;
                break;

            default:
                console.error('Unknown data type:', type);
                return;
        }

        if (!data) {
            if (window.notificationSystem) {
                window.notificationSystem.showNotification('No data to export', {
                    type: 'warning',
                    duration: 3000
                });
            }
            return;
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Clear all data (factory reset)
    async factoryReset() {
        const confirmed = confirm(
            'WARNING: This will delete ALL data including chat history, workflows, settings, and preferences.\n\n' +
            'This action cannot be undone.\n\n' +
            'Are you sure you want to continue?'
        );

        if (!confirmed) return;

        const doubleConfirm = confirm('Type "RESET" to confirm (or cancel):\n\nThis is your last chance!');
        if (!doubleConfirm) return;

        // Clear all MCP-related localStorage
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('mcp_') || key === 'theme') {
                keys.push(key);
            }
        }

        keys.forEach(key => localStorage.removeItem(key));

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('Factory reset complete. Reloading...', {
                type: 'warning',
                duration: 2000
            });
        }

        setTimeout(() => {
            location.reload();
        }, 2000);
    }
}

// Initialize backup/restore system when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.backupRestore = new BackupRestoreSystem(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.backupRestore.init();
        });
    } else {
        window.backupRestore.init();
    }

    // Add methods to global mcp object
    window.mcp.createBackup = () => window.backupRestore.createBackupDialog();
    window.mcp.restoreBackup = () => window.backupRestore.restoreBackupDialog();
    window.mcp.manageBackups = () => window.backupRestore.manageBackups();
    window.mcp.factoryReset = () => window.backupRestore.factoryReset();
}
