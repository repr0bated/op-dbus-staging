// Command Palette and Global Search
// Quick command execution and universal search across all sections

class CommandPalette {
    constructor(mcp) {
        this.mcp = mcp;
        this.commands = [];
        this.isOpen = false;
        this.searchIndex = [];
        this.selectedIndex = 0;
        this.filteredResults = [];
    }

    // Initialize command palette
    init() {
        this.setupCommands();
        this.buildSearchIndex();
        this.createPaletteUI();
        this.setupKeyboardShortcuts();

        console.log('Command palette initialized');
    }

    // Setup available commands
    setupCommands() {
        this.commands = [
            // Navigation
            { id: 'nav-dashboard', name: 'Go to Dashboard', icon: '🏠', category: 'Navigation', action: () => this.navigate('dashboard') },
            { id: 'nav-tools', name: 'Go to Tools', icon: '🛠️', category: 'Navigation', action: () => this.navigate('tools') },
            { id: 'nav-agents', name: 'Go to Agents', icon: '🤖', category: 'Navigation', action: () => this.navigate('agents') },
            { id: 'nav-chat', name: 'Go to Chat', icon: '💬', category: 'Navigation', action: () => this.navigate('chat') },
            { id: 'nav-discovery', name: 'Go to Discovery', icon: '🔍', category: 'Navigation', action: () => this.navigate('discovery') },
            { id: 'nav-workflow', name: 'Go to Workflow', icon: '⚙️', category: 'Navigation', action: () => this.navigate('workflow') },
            { id: 'nav-logs', name: 'Go to Logs', icon: '📋', category: 'Navigation', action: () => this.navigate('logs') },

            // Actions
            { id: 'refresh-page', name: 'Refresh Page', icon: '🔄', category: 'Actions', action: () => location.reload(), shortcut: 'Ctrl+R' },
            { id: 'clear-cache', name: 'Clear Cache', icon: '🗑️', category: 'Actions', action: () => window.performanceOptimizer?.clearCache() },
            { id: 'export-data', name: 'Export All Data', icon: '💾', category: 'Actions', action: () => this.exportAllData() },
            { id: 'theme-toggle', name: 'Toggle Theme', icon: '🌓', category: 'Actions', action: () => this.toggleTheme() },

            // Discovery
            { id: 'discover-services', name: 'Discover D-Bus Services', icon: '🔍', category: 'Discovery', action: () => window.mcp?.discoverServices() },
            { id: 'expand-all', name: 'Expand All Services', icon: '⬇️', category: 'Discovery', action: () => window.mcp?.expandAllServices() },
            { id: 'collapse-all', name: 'Collapse All Services', icon: '⬆️', category: 'Discovery', action: () => window.mcp?.collapseAllServices() },

            // Workflow
            { id: 'new-workflow', name: 'New Workflow', icon: '➕', category: 'Workflow', action: () => window.mcp?.createNewWorkflow(), shortcut: 'Ctrl+N' },
            { id: 'execute-workflow', name: 'Execute Workflow', icon: '▶️', category: 'Workflow', action: () => window.mcp?.executeWorkflow(), shortcut: 'Ctrl+Enter' },
            { id: 'save-workflow', name: 'Save Workflow', icon: '💾', category: 'Workflow', action: () => window.mcp?.saveWorkflow(), shortcut: 'Ctrl+S' },
            { id: 'load-workflow', name: 'Load Workflow', icon: '📂', category: 'Workflow', action: () => window.mcp?.loadWorkflow(), shortcut: 'Ctrl+O' },

            // Chat
            { id: 'clear-chat', name: 'Clear Chat History', icon: '🗑️', category: 'Chat', action: () => window.chatEnhancements?.clearHistory() },
            { id: 'export-chat', name: 'Export Chat (JSON)', icon: '📤', category: 'Chat', action: () => window.chatEnhancements?.exportConversation('json'), shortcut: 'Ctrl+E' },
            { id: 'chat-stats', name: 'Show Chat Statistics', icon: '📊', category: 'Chat', action: () => window.chatEnhancements?.showConversationStats() },

            // Agents
            { id: 'spawn-agent', name: 'Spawn New Agent', icon: '🚀', category: 'Agents', action: () => window.agentEnhancements?.spawnFromTemplate() },
            { id: 'start-all-agents', name: 'Start All Agents', icon: '▶️', category: 'Agents', action: () => window.agentEnhancements?.startAllAgents() },
            { id: 'stop-all-agents', name: 'Stop All Agents', icon: '⏸️', category: 'Agents', action: () => window.agentEnhancements?.stopAllAgents() },
            { id: 'agent-metrics', name: 'Show Agent Metrics', icon: '📈', category: 'Agents', action: () => window.agentEnhancements?.showAgentMetrics() },

            // Diagnostics
            { id: 'run-diagnostics', name: 'Run System Diagnostics', icon: '🏥', category: 'Diagnostics', action: () => window.diagnostics?.runFullDiagnostic() },
            { id: 'system-info', name: 'Show System Information', icon: 'ℹ️', category: 'Diagnostics', action: () => this.showSystemInfo() },
            { id: 'performance-metrics', name: 'Show Performance Metrics', icon: '⚡', category: 'Diagnostics', action: () => window.performanceOptimizer?.showPerformanceDashboard() },

            // Accessibility
            { id: 'accessibility-menu', name: 'Open Accessibility Menu', icon: '♿', category: 'Accessibility', action: () => window.accessibility?.openAccessibilityMenu(), shortcut: 'Ctrl+.' },
            { id: 'keyboard-shortcuts', name: 'Show Keyboard Shortcuts', icon: '⌨️', category: 'Help', action: () => window.accessibility?.showKeyboardShortcuts(), shortcut: '?' },
            { id: 'toggle-high-contrast', name: 'Toggle High Contrast', icon: '🎨', category: 'Accessibility', action: () => window.accessibility?.toggleHighContrast() },

            // Help
            { id: 'help', name: 'Show Help', icon: '❓', category: 'Help', action: () => this.showHelp(), shortcut: 'F1' },
            { id: 'about', name: 'About MCP Control Center', icon: 'ℹ️', category: 'Help', action: () => this.showAbout() }
        ];
    }

    // Build search index
    buildSearchIndex() {
        this.searchIndex = [];

        // Index all commands
        this.commands.forEach(cmd => {
            this.searchIndex.push({
                type: 'command',
                id: cmd.id,
                title: cmd.name,
                subtitle: cmd.category,
                icon: cmd.icon,
                searchText: `${cmd.name} ${cmd.category}`.toLowerCase(),
                action: cmd.action,
                shortcut: cmd.shortcut
            });
        });

        // Index UI elements (buttons, links, etc.)
        document.querySelectorAll('button, a, [role="button"]').forEach(el => {
            const text = el.textContent.trim();
            const title = el.getAttribute('title') || el.getAttribute('aria-label');

            if (text || title) {
                this.searchIndex.push({
                    type: 'ui-element',
                    title: text || title,
                    subtitle: 'UI Element',
                    icon: '🔘',
                    searchText: `${text} ${title || ''}`.toLowerCase(),
                    action: () => el.click(),
                    element: el
                });
            }
        });
    }

    // Create palette UI
    createPaletteUI() {
        const paletteHTML = `
            <div id="command-palette-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(4px);
                z-index: 10005;
                display: none;
                align-items: flex-start;
                justify-content: center;
                padding-top: 100px;
            " onclick="if(event.target === this) window.commandPalette.close()">
                <div id="command-palette" style="
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 70vh;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                ">
                    <!-- Search Input -->
                    <div style="padding: 20px 20px 15px; border-bottom: 1px solid var(--border-color);">
                        <input
                            id="palette-search"
                            type="text"
                            placeholder="Type a command or search..."
                            style="
                                width: 100%;
                                padding: 12px 16px;
                                font-size: 16px;
                                border: 2px solid var(--border-color);
                                border-radius: 8px;
                                background: var(--bg-secondary);
                                color: var(--text-primary);
                                outline: none;
                            "
                            autocomplete="off"
                            spellcheck="false"
                        >
                    </div>

                    <!-- Results -->
                    <div id="palette-results" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 8px;
                        min-height: 200px;
                        max-height: 400px;
                    ">
                        <div style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
                            Type to search commands, pages, and actions...
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="
                        padding: 12px 20px;
                        border-top: 1px solid var(--border-color);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 12px;
                        color: var(--text-secondary);
                    ">
                        <div>
                            <kbd style="padding: 2px 6px; background: var(--bg-tertiary); border-radius: 3px; margin: 0 4px;">↑↓</kbd> Navigate
                            <kbd style="padding: 2px 6px; background: var(--bg-tertiary); border-radius: 3px; margin: 0 4px;">↵</kbd> Select
                            <kbd style="padding: 2px 6px; background: var(--bg-tertiary); border-radius: 3px; margin: 0 4px;">Esc</kbd> Close
                        </div>
                        <div id="palette-count">0 results</div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', paletteHTML);

        // Setup event listeners
        const searchInput = document.getElementById('palette-search');
        const resultsContainer = document.getElementById('palette-results');

        searchInput.addEventListener('input', (e) => {
            this.search(e.target.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K to open palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.open();
            }

            // Ctrl+P or Cmd+P to open palette (alternative)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.open();
            }

            // Escape to close
            if (e.key === 'Escape' && this.isOpen) {
                e.preventDefault();
                this.close();
            }
        });
    }

    // Open command palette
    open() {
        const overlay = document.getElementById('command-palette-overlay');
        const searchInput = document.getElementById('palette-search');

        if (!overlay || !searchInput) return;

        overlay.style.display = 'flex';
        searchInput.value = '';
        searchInput.focus();

        this.isOpen = true;
        this.selectedIndex = 0;
        this.showAllCommands();

        // Rebuild search index to include new dynamic elements
        this.buildSearchIndex();

        if (window.accessibility) {
            window.accessibility.announce('Command palette opened');
        }
    }

    // Close command palette
    close() {
        const overlay = document.getElementById('command-palette-overlay');
        if (!overlay) return;

        overlay.style.display = 'none';
        this.isOpen = false;

        if (window.accessibility) {
            window.accessibility.announce('Command palette closed');
        }
    }

    // Search for commands
    search(query) {
        const normalizedQuery = query.toLowerCase().trim();

        if (!normalizedQuery) {
            this.showAllCommands();
            return;
        }

        this.filteredResults = this.searchIndex.filter(item => {
            return item.searchText.includes(normalizedQuery);
        });

        // Sort by relevance
        this.filteredResults.sort((a, b) => {
            const aIndex = a.searchText.indexOf(normalizedQuery);
            const bIndex = b.searchText.indexOf(normalizedQuery);

            if (aIndex !== bIndex) {
                return aIndex - bIndex;
            }

            return a.title.length - b.title.length;
        });

        this.selectedIndex = 0;
        this.renderResults();
    }

    // Show all commands (default view)
    showAllCommands() {
        this.filteredResults = this.searchIndex.filter(item => item.type === 'command');
        this.selectedIndex = 0;
        this.renderResults();
    }

    // Render search results
    renderResults() {
        const resultsContainer = document.getElementById('palette-results');
        const countDisplay = document.getElementById('palette-count');

        if (!resultsContainer) return;

        if (this.filteredResults.length === 0) {
            resultsContainer.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
                    <div>No results found</div>
                </div>
            `;
            countDisplay.textContent = '0 results';
            return;
        }

        const resultsHTML = this.filteredResults.map((item, index) => `
            <div
                class="palette-result-item ${index === this.selectedIndex ? 'selected' : ''}"
                data-index="${index}"
                onclick="window.commandPalette.selectResult(${index})"
                style="
                    padding: 12px 16px;
                    margin: 4px 0;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: ${index === this.selectedIndex ? 'var(--bg-hover)' : 'transparent'};
                    border: 2px solid ${index === this.selectedIndex ? 'var(--color-primary)' : 'transparent'};
                "
                onmouseover="this.style.background='var(--bg-hover)'"
                onmouseout="if(${index} !== window.commandPalette.selectedIndex) this.style.background='transparent'"
            >
                <div style="font-size: 20px; flex-shrink: 0;">${item.icon}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${item.title}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${item.subtitle}</div>
                </div>
                ${item.shortcut ? `<div style="font-size: 11px; color: var(--text-tertiary); background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px;">${item.shortcut}</div>` : ''}
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHTML;
        countDisplay.textContent = `${this.filteredResults.length} result${this.filteredResults.length === 1 ? '' : 's'}`;

        // Scroll selected item into view
        this.scrollToSelected();
    }

    // Handle keyboard navigation in results
    handleKeyboardNavigation(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % this.filteredResults.length;
                this.renderResults();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + this.filteredResults.length) % this.filteredResults.length;
                this.renderResults();
                break;

            case 'Enter':
                e.preventDefault();
                this.selectResult(this.selectedIndex);
                break;

            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    // Select and execute result
    selectResult(index) {
        if (index < 0 || index >= this.filteredResults.length) return;

        const result = this.filteredResults[index];

        this.close();

        // Execute action
        if (result.action) {
            setTimeout(() => {
                result.action();
            }, 100);
        }

        if (window.accessibility) {
            window.accessibility.announce(`Selected: ${result.title}`);
        }
    }

    // Scroll selected item into view
    scrollToSelected() {
        const resultsContainer = document.getElementById('palette-results');
        const selectedItem = resultsContainer?.querySelector('.palette-result-item.selected');

        if (selectedItem && resultsContainer) {
            const itemRect = selectedItem.getBoundingClientRect();
            const containerRect = resultsContainer.getBoundingClientRect();

            if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
                selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }

    // Navigate to section
    navigate(sectionId) {
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        if (navLink) {
            navLink.click();
        }
    }

    // Toggle theme
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(`Theme switched to ${newTheme}`, {
                type: 'success',
                duration: 2000
            });
        }
    }

    // Export all data
    async exportAllData() {
        const data = {
            timestamp: new Date().toISOString(),
            chatHistory: window.chatEnhancements?.messageHistory || [],
            workflows: localStorage.getItem('mcp_workflows') || null,
            preferences: {
                accessibility: localStorage.getItem('mcp_a11y_preferences') || null,
                theme: localStorage.getItem('theme') || 'dark'
            },
            diagnostics: window.diagnostics?.diagnosticHistory || []
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mcp-export-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        if (window.notificationSystem) {
            window.notificationSystem.showNotification('All data exported successfully', {
                type: 'success',
                duration: 3000
            });
        }
    }

    // Show system info
    showSystemInfo() {
        if (window.diagnostics) {
            const info = window.diagnostics.getSystemInfo();

            const infoHTML = `
                <div style="padding: 20px; max-width: 600px;">
                    <h3 style="margin-top: 0;">System Information</h3>
                    <div style="display: grid; gap: 12px; font-size: 13px;">
                        <div>
                            <strong>Browser:</strong> ${info.browser.name} ${info.browser.version}<br>
                            <strong>Platform:</strong> ${info.browser.platform}<br>
                            <strong>Language:</strong> ${info.browser.language}<br>
                            <strong>Online:</strong> ${info.browser.onLine ? 'Yes' : 'No'}
                        </div>
                        <div>
                            <strong>Screen:</strong> ${info.screen.width}x${info.screen.height}<br>
                            <strong>Window:</strong> ${info.window.innerWidth}x${info.window.innerHeight}<br>
                            <strong>Color Depth:</strong> ${info.screen.colorDepth}-bit
                        </div>
                        ${info.performance ? `
                            <div>
                                <strong>Memory:</strong><br>
                                Used: ${info.performance.usedMemory}<br>
                                Total: ${info.performance.totalMemory}<br>
                                Limit: ${info.performance.limit}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            this.mcp.showToast(infoHTML, 'info', 10000);
        }
    }

    // Show help
    showHelp() {
        const helpHTML = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">MCP Control Center Help</h3>
                <div style="display: grid; gap: 15px; font-size: 13px;">
                    <div>
                        <strong>Command Palette:</strong><br>
                        Press <kbd>Ctrl+K</kbd> or <kbd>Ctrl+P</kbd> to open the command palette.
                        Search for commands, navigate to pages, and execute actions quickly.
                    </div>
                    <div>
                        <strong>Keyboard Navigation:</strong><br>
                        Use arrow keys to navigate lists and grids. Press <kbd>?</kbd> to see all shortcuts.
                    </div>
                    <div>
                        <strong>Accessibility:</strong><br>
                        Press <kbd>Ctrl+.</kbd> to open accessibility options including high contrast,
                        large text, and reduced motion modes.
                    </div>
                    <div>
                        <strong>System Diagnostics:</strong><br>
                        Click the 🏥 icon in the bottom-left to run system health checks and view
                        diagnostic information.
                    </div>
                </div>
            </div>
        `;

        this.mcp.showToast(helpHTML, 'info', 12000);
    }

    // Show about
    showAbout() {
        const aboutHTML = `
            <div style="padding: 20px; max-width: 500px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">🎛️</div>
                <h3 style="margin: 0 0 8px;">MCP Control Center</h3>
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
                    Version 1.0.0
                </div>
                <div style="font-size: 13px; line-height: 1.6;">
                    A comprehensive management interface for D-Bus services, system monitoring,
                    workflow automation, and AI-powered chat assistance.
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-tertiary);">
                    © 2024 Operation D-Bus
                </div>
            </div>
        `;

        this.mcp.showToast(aboutHTML, 'info', 10000);
    }
}

// Initialize command palette when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.commandPalette = new CommandPalette(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.commandPalette.init();
        });
    } else {
        window.commandPalette.init();
    }

    // Add methods to global mcp object
    window.mcp.openCommandPalette = () => window.commandPalette.open();
    window.mcp.closeCommandPalette = () => window.commandPalette.close();
}
