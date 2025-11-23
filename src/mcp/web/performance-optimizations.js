// Performance Optimizations
// Lazy loading, caching, debouncing, and rendering optimizations

class PerformanceOptimizer {
    constructor(mcp) {
        this.mcp = mcp;
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.observedElements = new WeakMap();
        this.requestQueue = [];
        this.maxCacheAge = 5 * 60 * 1000; // 5 minutes
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
    }

    // Initialize all performance optimizations
    init() {
        this.setupLazyLoading();
        this.setupIntersectionObserver();
        this.setupRequestBatching();
        this.setupMemoryManagement();
        this.setupVirtualScrolling();
        this.optimizeDOMOperations();
        this.setupServiceWorker();

        console.log('Performance optimizations initialized');
    }

    // Setup lazy loading for sections
    setupLazyLoading() {
        const sections = document.querySelectorAll('.section');

        sections.forEach(section => {
            // Don't lazy load the dashboard (first section)
            if (section.id === 'dashboard') return;

            // Mark section as lazy-loadable
            section.dataset.lazyLoad = 'true';
            section.dataset.loaded = 'false';

            // Clear initial content to save memory
            const contentElements = section.querySelectorAll('.tools-grid, .agents-table, .discovery-results');
            contentElements.forEach(el => {
                if (el.children.length === 0) {
                    el.dataset.lazyContent = 'pending';
                }
            });
        });

        // Add load handler to navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const originalClick = link.onclick;

            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href) {
                    const sectionId = href.replace('#', '');
                    this.loadSectionIfNeeded(sectionId);
                }
            });
        });
    }

    // Load section content on demand
    async loadSectionIfNeeded(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section || section.dataset.loaded === 'true') return;

        const startTime = performance.now();

        // Show loading indicator
        this.showSectionLoader(section);

        // Simulate loading section-specific content
        await this.loadSectionContent(sectionId);

        section.dataset.loaded = 'true';

        // Hide loading indicator
        this.hideSectionLoader(section);

        const loadTime = performance.now() - startTime;
        console.log(`Section ${sectionId} loaded in ${loadTime.toFixed(2)}ms`);
    }

    // Load section-specific content
    async loadSectionContent(sectionId) {
        switch (sectionId) {
            case 'tools':
                await this.loadToolsContent();
                break;
            case 'agents':
                await this.loadAgentsContent();
                break;
            case 'discovery':
                await this.loadDiscoveryContent();
                break;
            case 'workflow':
                await this.loadWorkflowContent();
                break;
            case 'logs':
                await this.loadLogsContent();
                break;
        }
    }

    // Load tools content
    async loadToolsContent() {
        const cached = this.getFromCache('tools-list');
        if (cached) {
            this.renderTools(cached);
            return;
        }

        try {
            const response = await fetch('/api/tools');
            const data = await response.json();

            if (data.success) {
                this.setCache('tools-list', data.tools);
                this.renderTools(data.tools);
            }
        } catch (error) {
            console.error('Failed to load tools:', error);
        }
    }

    // Load agents content
    async loadAgentsContent() {
        // Agent content is loaded by agent-enhancements.js
        console.log('Agents content loaded');
    }

    // Load discovery content
    async loadDiscoveryContent() {
        // Discovery content is loaded on-demand by user action
        console.log('Discovery content ready');
    }

    // Load workflow content
    async loadWorkflowContent() {
        // Workflow builder is already initialized
        console.log('Workflow content ready');
    }

    // Load logs content
    async loadLogsContent() {
        const cached = this.getFromCache('recent-logs');
        if (cached) {
            this.renderLogs(cached);
            return;
        }

        // Logs are streamed, so just mark as ready
        console.log('Logs content ready');
    }

    // Setup Intersection Observer for lazy image loading
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            console.warn('IntersectionObserver not supported');
            return;
        }

        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });

        // Observe all lazy images
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));

        this.imageObserver = imageObserver;
    }

    // Setup request batching to reduce network calls
    setupRequestBatching() {
        this.batchInterval = 100; // ms
        this.batchTimer = null;

        window.mcpBatchRequest = (url, options = {}) => {
            return new Promise((resolve, reject) => {
                this.requestQueue.push({ url, options, resolve, reject });

                if (!this.batchTimer) {
                    this.batchTimer = setTimeout(() => {
                        this.processBatchedRequests();
                    }, this.batchInterval);
                }
            });
        };
    }

    // Process batched requests
    async processBatchedRequests() {
        const requests = this.requestQueue.splice(0);
        this.batchTimer = null;

        if (requests.length === 0) return;

        // Group requests by URL
        const grouped = new Map();
        requests.forEach(req => {
            if (!grouped.has(req.url)) {
                grouped.set(req.url, []);
            }
            grouped.get(req.url).push(req);
        });

        // Execute batched requests
        for (const [url, reqs] of grouped) {
            try {
                const response = await fetch(url, reqs[0].options);
                const data = await response.json();

                // Resolve all requests with same URL
                reqs.forEach(req => req.resolve(data));
            } catch (error) {
                // Reject all requests with same URL
                reqs.forEach(req => req.reject(error));
            }
        }
    }

    // Cache management
    setCache(key, value, ttl = this.maxCacheAge) {
        this.cache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + ttl);
    }

    getFromCache(key) {
        const expiry = this.cacheExpiry.get(key);

        if (!expiry || Date.now() > expiry) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return null;
        }

        return this.cache.get(key);
    }

    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
        console.log('Cache cleared');
    }

    // Debounce function
    debounce(key, func, delay = 300) {
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);

        this.debounceTimers.set(key, timer);
    }

    // Throttle function
    throttle(key, func, delay = 300) {
        const existingTimer = this.throttleTimers.get(key);

        if (existingTimer) {
            return; // Already throttled
        }

        func();

        const timer = setTimeout(() => {
            this.throttleTimers.delete(key);
        }, delay);

        this.throttleTimers.set(key, timer);
    }

    // Setup memory management
    setupMemoryManagement() {
        // Monitor memory usage
        if (performance.memory) {
            setInterval(() => {
                const usedMemory = performance.memory.usedJSHeapSize;
                const totalMemory = performance.memory.totalJSHeapSize;
                const percentage = (usedMemory / totalMemory) * 100;

                if (percentage > 90) {
                    console.warn('High memory usage detected:', percentage.toFixed(2) + '%');
                    this.performMemoryCleanup();
                }
            }, 30000); // Check every 30 seconds
        }

        // Cleanup on tab visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.performMemoryCleanup();
            }
        });
    }

    // Perform memory cleanup
    performMemoryCleanup() {
        console.log('Performing memory cleanup...');

        // Clear old cache entries
        const now = Date.now();
        for (const [key, expiry] of this.cacheExpiry) {
            if (now > expiry) {
                this.cache.delete(key);
                this.cacheExpiry.delete(key);
            }
        }

        // Clear message history beyond a limit
        if (window.chatEnhancements && window.chatEnhancements.messageHistory.length > 100) {
            window.chatEnhancements.messageHistory =
                window.chatEnhancements.messageHistory.slice(-100);
        }

        // Clear old log entries
        const logsContainer = document.getElementById('logs-container');
        if (logsContainer && logsContainer.children.length > 500) {
            const toRemove = logsContainer.children.length - 500;
            for (let i = 0; i < toRemove; i++) {
                logsContainer.removeChild(logsContainer.firstChild);
            }
        }

        console.log('Memory cleanup complete');
    }

    // Setup virtual scrolling for large lists
    setupVirtualScrolling() {
        // Virtual scrolling for logs
        const logsContainer = document.getElementById('logs-container');
        if (logsContainer) {
            this.setupVirtualList(logsContainer, {
                itemHeight: 40,
                buffer: 10
            });
        }

        // Virtual scrolling for discovery results
        const discoveryResults = document.getElementById('discovery-results');
        if (discoveryResults) {
            this.setupVirtualList(discoveryResults, {
                itemHeight: 60,
                buffer: 5
            });
        }
    }

    // Setup virtual list
    setupVirtualList(container, options = {}) {
        const { itemHeight = 50, buffer = 5 } = options;

        let allItems = [];
        let visibleStart = 0;
        let visibleEnd = 0;

        const updateVisibleItems = () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;

            visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            visibleEnd = Math.min(
                allItems.length,
                Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
            );

            renderVisibleItems();
        };

        const renderVisibleItems = () => {
            // Clear container
            container.innerHTML = '';

            // Add spacer for scrolled items
            if (visibleStart > 0) {
                const topSpacer = document.createElement('div');
                topSpacer.style.height = `${visibleStart * itemHeight}px`;
                container.appendChild(topSpacer);
            }

            // Render visible items
            for (let i = visibleStart; i < visibleEnd; i++) {
                if (allItems[i]) {
                    container.appendChild(allItems[i]);
                }
            }

            // Add spacer for items below
            if (visibleEnd < allItems.length) {
                const bottomSpacer = document.createElement('div');
                bottomSpacer.style.height = `${(allItems.length - visibleEnd) * itemHeight}px`;
                container.appendChild(bottomSpacer);
            }
        };

        // Attach scroll listener with throttling
        container.addEventListener('scroll', () => {
            this.throttle('virtual-scroll-' + container.id, updateVisibleItems, 16);
        });

        // Store reference for external updates
        container.virtualList = {
            setItems: (items) => {
                allItems = items;
                updateVisibleItems();
            },
            refresh: updateVisibleItems
        };
    }

    // Optimize DOM operations
    optimizeDOMOperations() {
        // Use DocumentFragment for batch DOM insertions
        window.mcpBatchDOM = (parent, elements) => {
            const fragment = document.createDocumentFragment();

            elements.forEach(el => {
                if (typeof el === 'string') {
                    const temp = document.createElement('div');
                    temp.innerHTML = el;
                    fragment.appendChild(temp.firstChild);
                } else {
                    fragment.appendChild(el);
                }
            });

            parent.appendChild(fragment);
        };

        // Debounce resize handlers
        window.addEventListener('resize', () => {
            this.debounce('window-resize', () => {
                // Trigger resize handlers
                window.dispatchEvent(new Event('mcpResize'));
            }, 150);
        });
    }

    // Setup Service Worker for offline caching
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            // Service worker registration would go here
            // This is a placeholder for future implementation
            console.log('Service Worker support detected (not registered)');
        }
    }

    // Show section loader
    showSectionLoader(section) {
        const loader = document.createElement('div');
        loader.className = 'section-loader';
        loader.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 100;
        `;
        loader.innerHTML = `
            <div class="spinner" style="
                border: 3px solid rgba(59, 130, 246, 0.3);
                border-top: 3px solid #3b82f6;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            "></div>
            <div style="margin-top: 12px; color: var(--text-secondary); font-size: 14px;">
                Loading section...
            </div>
        `;

        section.style.position = 'relative';
        section.appendChild(loader);
    }

    // Hide section loader
    hideSectionLoader(section) {
        const loader = section.querySelector('.section-loader');
        if (loader) {
            loader.remove();
        }
    }

    // Render tools (helper)
    renderTools(tools) {
        const grid = document.getElementById('tools-grid');
        if (!grid) return;

        grid.innerHTML = '';

        tools.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.innerHTML = `
                <div class="tool-header">
                    <h3>${tool.name}</h3>
                </div>
                <div class="tool-description">${tool.description || 'No description'}</div>
                <div class="tool-actions">
                    <button class="btn btn-sm" onclick="testTool('${tool.name}')">Test</button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Render logs (helper)
    renderLogs(logs) {
        const container = document.getElementById('logs-container');
        if (!container || !container.virtualList) return;

        const logElements = logs.map(log => {
            const el = document.createElement('div');
            el.className = 'log-entry';
            el.textContent = log.message;
            return el;
        });

        container.virtualList.setItems(logElements);
    }

    // Get performance metrics
    getMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        return {
            pageLoad: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null,
            cacheSize: this.cache.size,
            cachedKeys: Array.from(this.cache.keys())
        };
    }

    // Show performance dashboard
    showPerformanceDashboard() {
        const metrics = this.getMetrics();

        const dashboard = `
            <div style="padding: 20px; max-width: 600px;">
                <h3 style="margin-top: 0;">Performance Metrics</h3>
                <div style="display: grid; gap: 12px; font-size: 13px;">
                    <div><strong>Page Load:</strong> ${metrics.pageLoad.toFixed(2)}ms</div>
                    <div><strong>DOM Content Loaded:</strong> ${metrics.domContentLoaded.toFixed(2)}ms</div>
                    <div><strong>First Paint:</strong> ${metrics.firstPaint.toFixed(2)}ms</div>
                    <div><strong>First Contentful Paint:</strong> ${metrics.firstContentfulPaint.toFixed(2)}ms</div>
                    ${metrics.memory ? `
                        <div style="margin-top: 12px;">
                            <strong>Memory Usage:</strong>
                            <div style="margin-top: 4px;">
                                Used: ${(metrics.memory.used / 1024 / 1024).toFixed(2)} MB<br>
                                Total: ${(metrics.memory.total / 1024 / 1024).toFixed(2)} MB<br>
                                Limit: ${(metrics.memory.limit / 1024 / 1024).toFixed(2)} MB
                            </div>
                        </div>
                    ` : ''}
                    <div style="margin-top: 12px;">
                        <strong>Cache:</strong> ${metrics.cacheSize} entries<br>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                            ${metrics.cachedKeys.join(', ') || 'Empty'}
                        </div>
                    </div>
                    <div style="margin-top: 12px;">
                        <button class="btn btn-sm" onclick="window.performanceOptimizer.clearCache()">Clear Cache</button>
                        <button class="btn btn-sm" onclick="window.performanceOptimizer.performMemoryCleanup()">Cleanup Memory</button>
                    </div>
                </div>
            </div>
        `;

        this.mcp.showToast(dashboard, 'info', 15000);
    }
}

// Initialize performance optimizer when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.performanceOptimizer = new PerformanceOptimizer(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.performanceOptimizer.init();
        });
    } else {
        window.performanceOptimizer.init();
    }

    // Add methods to global mcp object
    window.mcp.showPerformanceMetrics = () => window.performanceOptimizer.showPerformanceDashboard();
    window.mcp.clearCache = () => window.performanceOptimizer.clearCache();
    window.mcp.cleanupMemory = () => window.performanceOptimizer.performMemoryCleanup();
}

// Add CSS animation for spinner
if (!document.querySelector('#perf-animations')) {
    const style = document.createElement('style');
    style.id = 'perf-animations';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes slideOut {
            0% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(-20px); }
        }

        .btn-icon {
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;
        }

        .btn-icon:hover {
            opacity: 1;
        }

        kbd {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            padding: 2px 6px;
            font-family: monospace;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);
}
