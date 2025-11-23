// Accessibility and Keyboard Navigation Enhancements
// Improved keyboard navigation, ARIA support, and accessibility features

class AccessibilityEnhancements {
    constructor(mcp) {
        this.mcp = mcp;
        this.focusableElements = [];
        this.currentFocusIndex = -1;
        this.shortcuts = new Map();
        this.announcer = null;
        this.highContrastMode = false;
        this.fontSize = 100;
    }

    // Initialize accessibility features
    init() {
        this.setupKeyboardNavigation();
        this.setupScreenReaderAnnouncements();
        this.setupARIAAttributes();
        this.setupFocusManagement();
        this.setupAccessibilityControls();
        this.setupKeyboardShortcuts();
        this.setupSkipLinks();

        console.log('Accessibility enhancements initialized');
    }

    // Setup comprehensive keyboard navigation
    setupKeyboardNavigation() {
        // Global keyboard event handler
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboard(e);
        });

        // Tab key navigation enhancement
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.updateFocusableElements();
                this.highlightFocusedElement();
            }
        });

        // Arrow key navigation for lists and grids
        document.querySelectorAll('[role="listbox"], [role="grid"], [role="menu"]').forEach(container => {
            container.addEventListener('keydown', (e) => {
                this.handleListNavigation(e, container);
            });
        });
    }

    // Handle global keyboard shortcuts
    handleGlobalKeyboard(e) {
        const key = this.getKeyCombo(e);

        // Check registered shortcuts
        const handler = this.shortcuts.get(key);
        if (handler) {
            e.preventDefault();
            handler(e);
            return;
        }

        // Built-in shortcuts
        switch (key) {
            case 'Escape':
                this.handleEscape();
                break;

            case '?':
            case '/':
                if (!this.isInputFocused()) {
                    e.preventDefault();
                    this.showKeyboardShortcuts();
                }
                break;

            case 'Alt+1':
            case 'Alt+2':
            case 'Alt+3':
            case 'Alt+4':
            case 'Alt+5':
            case 'Alt+6':
            case 'Alt+7':
                e.preventDefault();
                this.navigateToSection(parseInt(key.slice(-1)));
                break;

            case 'Ctrl+/':
            case 'Cmd+/':
                e.preventDefault();
                this.toggleCommandPalette();
                break;

            case 'Ctrl+b':
            case 'Cmd+b':
                e.preventDefault();
                this.toggleSidebar();
                break;

            case 'Ctrl+.':
            case 'Cmd+.':
                e.preventDefault();
                this.openAccessibilityMenu();
                break;
        }
    }

    // Handle list/grid navigation with arrow keys
    handleListNavigation(e, container) {
        const items = Array.from(container.querySelectorAll('[role="option"], [role="row"], [role="menuitem"]'));
        const currentItem = document.activeElement;
        const currentIndex = items.indexOf(currentItem);

        let nextIndex = currentIndex;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = (currentIndex + 1) % items.length;
                break;

            case 'ArrowUp':
                e.preventDefault();
                nextIndex = (currentIndex - 1 + items.length) % items.length;
                break;

            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;

            case 'End':
                e.preventDefault();
                nextIndex = items.length - 1;
                break;

            case 'Enter':
            case ' ':
                if (currentItem) {
                    e.preventDefault();
                    currentItem.click();
                }
                break;
        }

        if (nextIndex !== currentIndex && items[nextIndex]) {
            items[nextIndex].focus();
            this.announce(`${items[nextIndex].textContent.trim()}, item ${nextIndex + 1} of ${items.length}`);
        }
    }

    // Setup screen reader announcements
    setupScreenReaderAnnouncements() {
        // Create ARIA live region for announcements
        this.announcer = document.createElement('div');
        this.announcer.setAttribute('role', 'status');
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.className = 'sr-only';
        this.announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(this.announcer);

        // Announce page changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('active') && target.classList.contains('section')) {
                        const sectionName = target.querySelector('h2')?.textContent || 'Unknown section';
                        this.announce(`Navigated to ${sectionName}`);
                    }
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class']
        });
    }

    // Announce message to screen readers
    announce(message, priority = 'polite') {
        if (!this.announcer) return;

        this.announcer.setAttribute('aria-live', priority);
        this.announcer.textContent = '';

        // Small delay to ensure screen reader picks up the change
        setTimeout(() => {
            this.announcer.textContent = message;
        }, 100);
    }

    // Setup comprehensive ARIA attributes
    setupARIAAttributes() {
        // Navigation
        const nav = document.querySelector('nav');
        if (nav) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Main navigation');
        }

        // Sections
        document.querySelectorAll('.section').forEach(section => {
            section.setAttribute('role', 'region');
            const heading = section.querySelector('h2');
            if (heading) {
                const id = `section-${section.id}`;
                heading.id = id;
                section.setAttribute('aria-labelledby', id);
            }
        });

        // Buttons without text
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            const title = button.getAttribute('title');
            const text = button.textContent.trim();

            if (!text && title) {
                button.setAttribute('aria-label', title);
            }
        });

        // Form controls
        document.querySelectorAll('input, select, textarea').forEach(control => {
            if (!control.getAttribute('aria-label') && !control.id) {
                const label = control.closest('.form-group')?.querySelector('label');
                if (label) {
                    const labelId = `label-${Math.random().toString(36).substr(2, 9)}`;
                    label.id = labelId;
                    control.setAttribute('aria-labelledby', labelId);
                }
            }
        });

        // Tables
        document.querySelectorAll('table').forEach(table => {
            table.setAttribute('role', 'table');
            const caption = table.querySelector('caption') || table.previousElementSibling;
            if (caption) {
                table.setAttribute('aria-label', caption.textContent);
            }
        });

        // Modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');

            const heading = modal.querySelector('h3, h2, h1');
            if (heading) {
                const id = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
                heading.id = id;
                modal.setAttribute('aria-labelledby', id);
            }
        });
    }

    // Setup focus management
    setupFocusManagement() {
        // Focus trap for modals
        document.querySelectorAll('.modal').forEach(modal => {
            this.setupFocusTrap(modal);
        });

        // Return focus after modal close
        this.lastFocusedElement = null;

        document.addEventListener('focusin', (e) => {
            if (!e.target.closest('.modal')) {
                this.lastFocusedElement = e.target;
            }
        });

        // Visible focus indicator
        this.addFocusStyles();
    }

    // Setup focus trap for modal dialogs
    setupFocusTrap(container) {
        const getFocusableElements = () => {
            return Array.from(container.querySelectorAll(
                'a[href], button:not([disabled]), textarea:not([disabled]), ' +
                'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(el => {
                return el.offsetParent !== null; // Visible elements only
            });
        };

        container.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }

    // Add visible focus styles
    addFocusStyles() {
        if (document.querySelector('#a11y-focus-styles')) return;

        const style = document.createElement('style');
        style.id = 'a11y-focus-styles';
        style.textContent = `
            *:focus {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
            }

            *:focus:not(:focus-visible) {
                outline: none;
            }

            *:focus-visible {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
            }

            .focus-highlight {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
            }

            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border-width: 0;
            }

            .high-contrast {
                filter: contrast(1.5);
            }

            .large-text {
                font-size: 120%;
            }

            .reduced-motion * {
                animation: none !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Setup accessibility controls panel
    setupAccessibilityControls() {
        const controlsHTML = `
            <div id="a11y-controls" class="accessibility-controls" style="position: fixed; top: 60px; right: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; display: none; z-index: 10000; box-shadow: var(--shadow-lg); min-width: 250px;">
                <h3 style="margin-top: 0; font-size: 16px;">Accessibility Options</h3>

                <div style="display: grid; gap: 12px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="a11y-high-contrast" onchange="window.accessibility.toggleHighContrast()">
                        <span>High Contrast</span>
                    </label>

                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="a11y-large-text" onchange="window.accessibility.toggleLargeText()">
                        <span>Large Text</span>
                    </label>

                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="a11y-reduced-motion" onchange="window.accessibility.toggleReducedMotion()">
                        <span>Reduce Motion</span>
                    </label>

                    <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 4px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 13px;">
                            Font Size: <span id="a11y-font-size-value">100%</span>
                        </label>
                        <input type="range" id="a11y-font-size" min="80" max="150" value="100" step="10"
                               onchange="window.accessibility.setFontSize(this.value)"
                               style="width: 100%;">
                    </div>

                    <button class="btn btn-sm" onclick="window.accessibility.showKeyboardShortcuts()">
                        ⌨️ Keyboard Shortcuts
                    </button>

                    <button class="btn btn-sm" onclick="window.accessibility.resetAccessibility()">
                        🔄 Reset Settings
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', controlsHTML);

        // Load saved preferences
        this.loadAccessibilityPreferences();
    }

    // Setup keyboard shortcuts help
    setupKeyboardShortcuts() {
        this.registerShortcut('Ctrl+h', () => this.showKeyboardShortcuts(), 'Show keyboard shortcuts');
        this.registerShortcut('Ctrl+Alt+a', () => this.openAccessibilityMenu(), 'Open accessibility menu');
    }

    // Setup skip links for keyboard navigation
    setupSkipLinks() {
        const skipLinksHTML = `
            <div class="skip-links" style="position: absolute; top: 0; left: 0; z-index: 10001;">
                <a href="#main" class="skip-link" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;">Skip to main content</a>
                <a href="#navigation" class="skip-link" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;">Skip to navigation</a>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', skipLinksHTML);

        // Make skip links visible on focus
        const style = document.createElement('style');
        style.textContent = `
            .skip-link:focus {
                position: fixed;
                top: 10px;
                left: 10px;
                width: auto;
                height: auto;
                padding: 10px 20px;
                background: var(--bg-primary);
                color: var(--text-primary);
                border: 2px solid var(--color-primary);
                border-radius: 4px;
                z-index: 10002;
                text-decoration: none;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    // Register keyboard shortcut
    registerShortcut(combo, handler, description = '') {
        this.shortcuts.set(combo, handler);

        // Store description for help display
        if (!this.shortcuts.has('_descriptions')) {
            this.shortcuts.set('_descriptions', new Map());
        }
        this.shortcuts.get('_descriptions').set(combo, description);
    }

    // Get key combination string
    getKeyCombo(e) {
        const parts = [];

        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Cmd');

        if (e.key && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Meta') {
            parts.push(e.key);
        }

        return parts.join('+');
    }

    // Handle Escape key
    handleEscape() {
        // Close modals
        const activeModal = document.querySelector('.modal[style*="display: block"], .modal[style*="display:block"]');
        if (activeModal) {
            activeModal.style.display = 'none';
            if (this.lastFocusedElement) {
                this.lastFocusedElement.focus();
            }
            return;
        }

        // Close accessibility menu
        const a11yControls = document.getElementById('a11y-controls');
        if (a11yControls && a11yControls.style.display !== 'none') {
            a11yControls.style.display = 'none';
            return;
        }

        // Clear search/filter inputs
        const activeInput = document.activeElement;
        if (activeInput && (activeInput.tagName === 'INPUT' || activeInput.tagName === 'TEXTAREA')) {
            activeInput.value = '';
            activeInput.blur();
        }
    }

    // Navigate to section by index
    navigateToSection(index) {
        const navLinks = document.querySelectorAll('.nav-link');
        if (navLinks[index - 1]) {
            navLinks[index - 1].click();
            this.announce(`Navigated to ${navLinks[index - 1].textContent}`);
        }
    }

    // Toggle command palette
    toggleCommandPalette() {
        this.mcp.showToast('Command palette coming soon!', 'info');
        // TODO: Implement command palette
    }

    // Toggle sidebar
    toggleSidebar() {
        this.mcp.showToast('Sidebar toggle coming soon!', 'info');
        // TODO: Implement sidebar toggle
    }

    // Open accessibility menu
    openAccessibilityMenu() {
        const controls = document.getElementById('a11y-controls');
        if (controls) {
            const isVisible = controls.style.display !== 'none';
            controls.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                this.announce('Accessibility menu opened');
                // Focus first control
                const firstControl = controls.querySelector('input, button');
                if (firstControl) {
                    setTimeout(() => firstControl.focus(), 100);
                }
            }
        }
    }

    // Show keyboard shortcuts
    showKeyboardShortcuts() {
        const shortcuts = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">Keyboard Shortcuts</h3>
                <div style="display: grid; gap: 8px; font-size: 13px;">
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Alt + 1-7</kbd>
                        <span>Navigate to section</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Ctrl + /</kbd>
                        <span>Toggle command palette</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Ctrl + .</kbd>
                        <span>Accessibility menu</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Ctrl + K</kbd>
                        <span>Focus search (Chat)</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Ctrl + E</kbd>
                        <span>Export (context-aware)</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Escape</kbd>
                        <span>Close modal/clear input</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Tab</kbd>
                        <span>Navigate forward</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Shift + Tab</kbd>
                        <span>Navigate backward</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>↑ / ↓</kbd>
                        <span>Navigate lists</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px; border-bottom: 1px solid var(--border-color);">
                        <kbd>Enter / Space</kbd>
                        <span>Activate button/link</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px;">
                        <kbd>? or /</kbd>
                        <span>Show this help</span>
                    </div>
                </div>
            </div>
        `;

        this.mcp.showToast(shortcuts, 'info', 15000);
    }

    // Toggle high contrast mode
    toggleHighContrast() {
        this.highContrastMode = !this.highContrastMode;
        document.body.classList.toggle('high-contrast', this.highContrastMode);
        this.saveAccessibilityPreferences();
        this.announce(`High contrast ${this.highContrastMode ? 'enabled' : 'disabled'}`);
    }

    // Toggle large text
    toggleLargeText() {
        const enabled = document.getElementById('a11y-large-text').checked;
        document.body.classList.toggle('large-text', enabled);
        this.saveAccessibilityPreferences();
        this.announce(`Large text ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Toggle reduced motion
    toggleReducedMotion() {
        const enabled = document.getElementById('a11y-reduced-motion').checked;
        document.body.classList.toggle('reduced-motion', enabled);
        this.saveAccessibilityPreferences();
        this.announce(`Reduced motion ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Set font size
    setFontSize(size) {
        this.fontSize = parseInt(size);
        document.documentElement.style.fontSize = `${size}%`;
        document.getElementById('a11y-font-size-value').textContent = `${size}%`;
        this.saveAccessibilityPreferences();
        this.announce(`Font size set to ${size}%`);
    }

    // Save accessibility preferences
    saveAccessibilityPreferences() {
        const prefs = {
            highContrast: this.highContrastMode,
            largeText: document.getElementById('a11y-large-text')?.checked || false,
            reducedMotion: document.getElementById('a11y-reduced-motion')?.checked || false,
            fontSize: this.fontSize
        };

        localStorage.setItem('mcp_a11y_preferences', JSON.stringify(prefs));
    }

    // Load accessibility preferences
    loadAccessibilityPreferences() {
        try {
            const saved = localStorage.getItem('mcp_a11y_preferences');
            if (!saved) return;

            const prefs = JSON.parse(saved);

            if (prefs.highContrast) {
                this.highContrastMode = true;
                document.body.classList.add('high-contrast');
                document.getElementById('a11y-high-contrast').checked = true;
            }

            if (prefs.largeText) {
                document.body.classList.add('large-text');
                document.getElementById('a11y-large-text').checked = true;
            }

            if (prefs.reducedMotion) {
                document.body.classList.add('reduced-motion');
                document.getElementById('a11y-reduced-motion').checked = true;
            }

            if (prefs.fontSize) {
                this.setFontSize(prefs.fontSize);
                document.getElementById('a11y-font-size').value = prefs.fontSize;
            }
        } catch (error) {
            console.error('Failed to load accessibility preferences:', error);
        }
    }

    // Reset all accessibility settings
    resetAccessibility() {
        this.highContrastMode = false;
        this.fontSize = 100;

        document.body.classList.remove('high-contrast', 'large-text', 'reduced-motion');
        document.documentElement.style.fontSize = '100%';

        document.getElementById('a11y-high-contrast').checked = false;
        document.getElementById('a11y-large-text').checked = false;
        document.getElementById('a11y-reduced-motion').checked = false;
        document.getElementById('a11y-font-size').value = 100;
        document.getElementById('a11y-font-size-value').textContent = '100%';

        this.saveAccessibilityPreferences();
        this.announce('Accessibility settings reset to defaults');
        this.mcp.showToast('Accessibility settings reset', 'success');
    }

    // Update focusable elements list
    updateFocusableElements() {
        this.focusableElements = Array.from(document.querySelectorAll(
            'a[href], button:not([disabled]), textarea:not([disabled]), ' +
            'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null);
    }

    // Highlight focused element
    highlightFocusedElement() {
        // Remove previous highlights
        document.querySelectorAll('.focus-highlight').forEach(el => {
            el.classList.remove('focus-highlight');
        });

        // Add highlight to current focus
        if (document.activeElement) {
            document.activeElement.classList.add('focus-highlight');
        }
    }

    // Check if input is focused
    isInputFocused() {
        const active = document.activeElement;
        return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    }
}

// Initialize accessibility enhancements when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.accessibility = new AccessibilityEnhancements(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.accessibility.init();
        });
    } else {
        window.accessibility.init();
    }

    // Add methods to global mcp object
    window.mcp.showKeyboardShortcuts = () => window.accessibility.showKeyboardShortcuts();
    window.mcp.openAccessibilityMenu = () => window.accessibility.openAccessibilityMenu();
    window.mcp.announce = (msg) => window.accessibility.announce(msg);
}
