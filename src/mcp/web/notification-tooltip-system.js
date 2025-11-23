// Notification and Tooltip System
// Advanced notifications, tooltips, and user feedback

class NotificationTooltipSystem {
    constructor(mcp) {
        this.mcp = mcp;
        this.notifications = [];
        this.tooltips = new Map();
        this.notificationId = 0;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
    }

    // Initialize notification and tooltip system
    init() {
        this.setupNotificationContainer();
        this.setupTooltipSystem();
        this.setupProgressNotifications();
        this.setupContextMenus();

        console.log('Notification and tooltip system initialized');
    }

    // Setup notification container with multiple zones
    setupNotificationContainer() {
        const containerHTML = `
            <div id="notification-system">
                <!-- Top-right notifications (default) -->
                <div id="notifications-top-right" class="notification-zone" style="position: fixed; top: 80px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 400px;"></div>

                <!-- Top-center notifications (important alerts) -->
                <div id="notifications-top-center" class="notification-zone" style="position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 500px;"></div>

                <!-- Bottom-right notifications (passive info) -->
                <div id="notifications-bottom-right" class="notification-zone" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; max-width: 400px;"></div>

                <!-- Center modal notifications (blocking) -->
                <div id="notifications-center" class="notification-zone" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; display: none;"></div>
            </div>
        `;

        // Remove if exists
        const existing = document.getElementById('notification-system');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', containerHTML);
    }

    // Show notification with various options
    showNotification(message, options = {}) {
        const {
            type = 'info',
            duration = this.defaultDuration,
            position = 'top-right',
            title = null,
            icon = null,
            actions = [],
            dismissible = true,
            progress = false,
            sticky = false
        } = options;

        const id = `notification-${this.notificationId++}`;
        const container = document.getElementById(`notifications-${position}`);

        if (!container) {
            console.error('Invalid notification position:', position);
            return null;
        }

        // Create notification element
        const notification = this.createNotificationElement(id, message, {
            type, title, icon, actions, dismissible, progress
        });

        // Add to container
        container.appendChild(notification);

        // Track notification
        this.notifications.push({
            id,
            element: notification,
            timestamp: Date.now()
        });

        // Limit number of notifications
        this.limitNotifications();

        // Auto-dismiss if not sticky
        if (!sticky && duration > 0) {
            setTimeout(() => {
                this.dismissNotification(id);
            }, duration);
        }

        // Announce to screen readers
        if (window.accessibility) {
            window.accessibility.announce(`${type}: ${message}`, type === 'error' ? 'assertive' : 'polite');
        }

        return id;
    }

    // Create notification element
    createNotificationElement(id, message, options) {
        const { type, title, icon, actions, dismissible, progress } = options;

        const notification = document.createElement('div');
        notification.id = id;
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        const iconMap = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const colorMap = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        const displayIcon = icon || iconMap[type] || 'ℹ';

        notification.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid ${colorMap[type]};
            border-left: 4px solid ${colorMap[type]};
            border-radius: 8px;
            padding: 15px;
            box-shadow: var(--shadow-lg);
            animation: slideIn 0.3s ease-out;
            min-width: 300px;
            max-width: 400px;
        `;

        let contentHTML = `
            <div style="display: flex; gap: 12px; align-items: start;">
                <div style="font-size: 20px; color: ${colorMap[type]}; flex-shrink: 0;">
                    ${displayIcon}
                </div>
                <div style="flex: 1; min-width: 0;">
                    ${title ? `<div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${title}</div>` : ''}
                    <div style="font-size: 13px; color: var(--text-primary);">${message}</div>
                    ${progress ? '<div class="notification-progress" style="margin-top: 8px;"><div class="progress-bar" style="height: 4px; background: rgba(59, 130, 246, 0.3); border-radius: 2px; overflow: hidden;"><div class="progress-fill" style="height: 100%; background: #3b82f6; width: 0%; transition: width 0.3s;"></div></div></div>' : ''}
                    ${actions.length > 0 ? `
                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                            ${actions.map(action => `
                                <button class="btn btn-xs" onclick="(${action.handler.toString()})()" style="font-size: 12px;">
                                    ${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                ${dismissible ? `
                    <button class="notification-close" onclick="window.notificationSystem.dismissNotification('${id}')" style="background: none; border: none; font-size: 20px; color: var(--text-secondary); cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;" title="Dismiss">
                        ×
                    </button>
                ` : ''}
            </div>
        `;

        notification.innerHTML = contentHTML;

        return notification;
    }

    // Dismiss notification
    dismissNotification(id) {
        const notification = document.getElementById(id);
        if (!notification) return;

        notification.style.animation = 'slideOut 0.3s ease-out';

        setTimeout(() => {
            notification.remove();
            this.notifications = this.notifications.filter(n => n.id !== id);
        }, 300);
    }

    // Update notification progress
    updateProgress(id, progress) {
        const notification = document.getElementById(id);
        if (!notification) return;

        const progressBar = notification.querySelector('.progress-fill');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
    }

    // Limit number of visible notifications
    limitNotifications() {
        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications[0];
            this.dismissNotification(oldest.id);
        }
    }

    // Setup tooltip system
    setupTooltipSystem() {
        // Create tooltip container
        const tooltipHTML = `
            <div id="tooltip-container" style="position: fixed; z-index: 10001; pointer-events: none; display: none; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; font-size: 13px; max-width: 300px; box-shadow: var(--shadow-md);"></div>
        `;

        document.body.insertAdjacentHTML('beforeend', tooltipHTML);
        this.tooltipContainer = document.getElementById('tooltip-container');

        // Add tooltip triggers
        this.setupTooltipTriggers();

        // Mouse move handler for tooltip positioning
        document.addEventListener('mousemove', (e) => {
            if (this.tooltipContainer.style.display === 'block') {
                this.positionTooltip(e.clientX, e.clientY);
            }
        });
    }

    // Setup tooltip triggers
    setupTooltipTriggers() {
        // Observe DOM for new elements with title or data-tooltip
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        this.attachTooltipListeners(node);
                        node.querySelectorAll('[title], [data-tooltip]').forEach(el => {
                            this.attachTooltipListeners(el);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Attach to existing elements
        document.querySelectorAll('[title], [data-tooltip]').forEach(el => {
            this.attachTooltipListeners(el);
        });
    }

    // Attach tooltip listeners to element
    attachTooltipListeners(element) {
        if (element.dataset.tooltipAttached) return;

        const tooltipText = element.dataset.tooltip || element.title;
        if (!tooltipText) return;

        // Remove native title to avoid double tooltips
        if (element.title) {
            element.dataset.tooltip = element.title;
            element.removeAttribute('title');
        }

        element.addEventListener('mouseenter', (e) => {
            this.showTooltip(tooltipText, e.target);
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        element.addEventListener('focus', (e) => {
            this.showTooltip(tooltipText, e.target);
        });

        element.addEventListener('blur', () => {
            this.hideTooltip();
        });

        element.dataset.tooltipAttached = 'true';
    }

    // Show tooltip
    showTooltip(text, element) {
        if (!this.tooltipContainer) return;

        this.tooltipContainer.textContent = text;
        this.tooltipContainer.style.display = 'block';

        // Position relative to element
        const rect = element.getBoundingClientRect();
        this.positionTooltip(rect.left + rect.width / 2, rect.top - 10);
    }

    // Hide tooltip
    hideTooltip() {
        if (!this.tooltipContainer) return;
        this.tooltipContainer.style.display = 'none';
    }

    // Position tooltip
    positionTooltip(x, y) {
        if (!this.tooltipContainer) return;

        const tooltipRect = this.tooltipContainer.getBoundingClientRect();
        let left = x - tooltipRect.width / 2;
        let top = y - tooltipRect.height - 10;

        // Prevent tooltip from going off-screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        if (top < 10) {
            top = y + 20; // Show below if not enough space above
        }

        this.tooltipContainer.style.left = `${left}px`;
        this.tooltipContainer.style.top = `${top}px`;
    }

    // Setup progress notifications
    setupProgressNotifications() {
        // Helper for long-running operations
        window.mcpProgress = async (operation, steps) => {
            const id = this.showNotification(`Starting ${operation}...`, {
                type: 'info',
                progress: true,
                sticky: true,
                dismissible: false
            });

            try {
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    const progress = ((i + 1) / steps.length) * 100;

                    // Execute step
                    if (typeof step === 'function') {
                        await step();
                    }

                    // Update progress
                    this.updateProgress(id, progress);

                    // Update message
                    const notification = document.getElementById(id);
                    if (notification) {
                        const messageEl = notification.querySelector('div[style*="font-size: 13px"]');
                        if (messageEl) {
                            messageEl.textContent = `${operation}: ${Math.round(progress)}%`;
                        }
                    }
                }

                // Success
                this.dismissNotification(id);
                this.showNotification(`${operation} completed successfully!`, {
                    type: 'success',
                    duration: 3000
                });

                return true;
            } catch (error) {
                this.dismissNotification(id);
                this.showNotification(`${operation} failed: ${error.message}`, {
                    type: 'error',
                    duration: 5000
                });

                return false;
            }
        };
    }

    // Setup context menus
    setupContextMenus() {
        const contextMenuHTML = `
            <div id="context-menu" style="position: fixed; z-index: 10002; display: none; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: var(--shadow-lg); min-width: 180px; padding: 4px 0;">
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', contextMenuHTML);
        this.contextMenu = document.getElementById('context-menu');

        // Hide context menu on click outside
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Prevent default context menu in app
        document.addEventListener('contextmenu', (e) => {
            const target = e.target.closest('[data-context-menu]');
            if (target) {
                e.preventDefault();
                this.showContextMenu(e.pageX, e.pageY, target.dataset.contextMenu);
            }
        });
    }

    // Show context menu
    showContextMenu(x, y, menuType) {
        if (!this.contextMenu) return;

        const items = this.getContextMenuItems(menuType);
        if (!items || items.length === 0) return;

        this.contextMenu.innerHTML = items.map(item => {
            if (item.separator) {
                return '<div style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>';
            }

            return `
                <button class="context-menu-item" onclick="${item.action}" style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 8px 12px;
                    background: none;
                    border: none;
                    text-align: left;
                    cursor: pointer;
                    font-size: 13px;
                    color: var(--text-primary);
                " onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='none'">
                    ${item.icon ? `<span style="font-size: 16px;">${item.icon}</span>` : ''}
                    <span>${item.label}</span>
                    ${item.shortcut ? `<span style="margin-left: auto; font-size: 11px; color: var(--text-tertiary);">${item.shortcut}</span>` : ''}
                </button>
            `;
        }).join('');

        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;

        // Adjust if off-screen
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = `${y - rect.height}px`;
        }
    }

    // Hide context menu
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    // Get context menu items by type
    getContextMenuItems(type) {
        const menus = {
            'default': [
                { icon: '📋', label: 'Copy', action: 'document.execCommand("copy")', shortcut: 'Ctrl+C' },
                { icon: '✂️', label: 'Cut', action: 'document.execCommand("cut")', shortcut: 'Ctrl+X' },
                { icon: '📄', label: 'Paste', action: 'document.execCommand("paste")', shortcut: 'Ctrl+V' },
                { separator: true },
                { icon: '🔄', label: 'Refresh', action: 'location.reload()', shortcut: 'Ctrl+R' }
            ],
            'message': [
                { icon: '📋', label: 'Copy Message', action: 'window.chatEnhancements.copyMessage(this.dataset.messageId)' },
                { icon: '✏️', label: 'Edit', action: 'window.chatEnhancements.editMessage(this.dataset.messageId)' },
                { icon: '🗑️', label: 'Delete', action: 'window.chatEnhancements.deleteMessage(this.dataset.messageId)' },
                { separator: true },
                { icon: '🔗', label: 'Copy Link', action: 'console.log("Copy link")' }
            ],
            'agent': [
                { icon: '▶️', label: 'Start', action: 'window.agentEnhancements.startAgent(this.dataset.agentId)' },
                { icon: '⏸️', label: 'Pause', action: 'window.agentEnhancements.pauseAgent(this.dataset.agentId)' },
                { icon: '🔄', label: 'Restart', action: 'window.agentEnhancements.restartAgent(this.dataset.agentId)' },
                { separator: true },
                { icon: '📋', label: 'View Logs', action: 'window.agentEnhancements.viewAgentLogs(this.dataset.agentId)' },
                { icon: '🔍', label: 'Inspect', action: 'window.agentEnhancements.inspectAgent(this.dataset.agentId)' },
                { separator: true },
                { icon: '⛔', label: 'Kill', action: 'window.agentEnhancements.killAgent(this.dataset.agentId)' }
            ]
        };

        return menus[type] || menus['default'];
    }

    // Confirm dialog
    async confirm(message, options = {}) {
        const {
            title = 'Confirm',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning'
        } = options;

        return new Promise((resolve) => {
            const id = this.showNotification(message, {
                type,
                title,
                position: 'center',
                sticky: true,
                dismissible: false,
                actions: [
                    {
                        label: confirmText,
                        handler: () => {
                            this.dismissNotification(id);
                            resolve(true);
                        }
                    },
                    {
                        label: cancelText,
                        handler: () => {
                            this.dismissNotification(id);
                            resolve(false);
                        }
                    }
                ]
            });

            // Show center zone
            document.getElementById('notifications-center').style.display = 'flex';
            document.getElementById('notifications-center').style.backdropFilter = 'blur(4px)';
            document.getElementById('notifications-center').style.background = 'rgba(0, 0, 0, 0.5)';
            document.getElementById('notifications-center').style.width = '100vw';
            document.getElementById('notifications-center').style.height = '100vh';
        });
    }

    // Clear all notifications
    clearAll() {
        this.notifications.forEach(n => {
            this.dismissNotification(n.id);
        });
    }
}

// Initialize notification system when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.notificationSystem = new NotificationTooltipSystem(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.notificationSystem.init();
        });
    } else {
        window.notificationSystem.init();
    }

    // Add methods to global mcp object
    window.mcp.notify = (msg, opts) => window.notificationSystem.showNotification(msg, opts);
    window.mcp.confirm = (msg, opts) => window.notificationSystem.confirm(msg, opts);
    window.mcp.clearNotifications = () => window.notificationSystem.clearAll();
}

// Add CSS animations
if (!document.querySelector('#notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }

        .notification:hover {
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .notification-close:hover {
            opacity: 1 !important;
        }

        .context-menu-item:active {
            transform: scale(0.98);
        }
    `;
    document.head.appendChild(style);
}
