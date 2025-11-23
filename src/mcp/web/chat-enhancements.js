// Chat Interface Enhancements
// Advanced features for AI chat interface

class ChatEnhancements {
    constructor(mcp) {
        this.mcp = mcp;
        this.messageHistory = [];
        this.conversationThreads = [];
        this.currentThread = null;
        this.messageIdCounter = 0;
        this.searchQuery = '';
        this.filterTags = [];
    }

    // Initialize enhanced chat features
    init() {
        this.setupEnhancedUI();
        this.loadConversationHistory();
        this.setupKeyboardShortcuts();
        this.setupCodeHighlighting();
    }

    // Setup enhanced chat UI elements
    setupEnhancedUI() {
        const chatContainer = document.querySelector('#chat');
        if (!chatContainer) return;

        // Add enhanced controls to chat section
        const controlsHTML = `
            <div class="chat-enhanced-controls" style="display: flex; gap: 10px; margin-bottom: 15px; padding: 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px;">
                <input type="text" id="chat-search" class="form-control form-control-sm" placeholder="Search messages..." style="max-width: 250px;">
                <button class="btn btn-sm" onclick="window.chatEnhancements.exportConversation('json')">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M8 12L4 8H6V4H10V8H12L8 12Z" fill="currentColor"/>
                        <path d="M2 14H14" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Export JSON
                </button>
                <button class="btn btn-sm" onclick="window.chatEnhancements.exportConversation('markdown')">
                    📝 Export MD
                </button>
                <button class="btn btn-sm" onclick="window.chatEnhancements.exportConversation('text')">
                    📄 Export TXT
                </button>
                <button class="btn btn-sm" onclick="window.chatEnhancements.toggleThreadView()">
                    🧵 Thread View
                </button>
                <button class="btn btn-sm" onclick="window.chatEnhancements.showConversationStats()">
                    📊 Stats
                </button>
                <select id="chat-filter-type" class="form-select form-select-sm" onchange="window.chatEnhancements.filterMessages(this.value)" style="max-width: 150px;">
                    <option value="all">All Messages</option>
                    <option value="user">User Only</option>
                    <option value="assistant">AI Only</option>
                    <option value="tool">Tool Results</option>
                    <option value="error">Errors Only</option>
                </select>
            </div>
        `;

        // Insert controls before chat container
        const sectionHeader = chatContainer.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.insertAdjacentHTML('afterend', controlsHTML);
        }

        // Setup search functionality
        const searchInput = document.getElementById('chat-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterMessages('all');
            });
        }
    }

    // Add message to history with enhanced metadata
    addMessageToHistory(message, role = 'user', metadata = {}) {
        const messageId = `msg-${this.messageIdCounter++}`;
        const timestamp = new Date();

        const messageObj = {
            id: messageId,
            role,
            content: message,
            timestamp,
            metadata: {
                ...metadata,
                tokens: this.estimateTokens(message),
                hasCode: this.detectCode(message),
                hasTool: this.detectToolCall(message)
            }
        };

        this.messageHistory.push(messageObj);
        this.saveConversationHistory();

        return messageId;
    }

    // Enhanced message rendering with tool results and code highlighting
    renderEnhancedMessage(messageId, content, role = 'assistant', metadata = {}) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${role}`;
        messageEl.dataset.messageId = messageId;
        messageEl.dataset.role = role;

        const avatar = role === 'user' ? '👤' : '🤖';
        const time = new Date().toLocaleTimeString();

        // Detect and render code blocks
        let renderedContent = this.renderCodeBlocks(content);

        // Detect and render tool results
        if (metadata.toolResult) {
            renderedContent += this.renderToolResult(metadata.toolResult);
        }

        messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span class="message-role" style="font-weight: 600; font-size: 12px; color: var(--text-secondary);">
                        ${role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <div class="message-actions" style="display: flex; gap: 5px;">
                        <button class="btn-icon" onclick="window.chatEnhancements.copyMessage('${messageId}')" title="Copy message">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M3 11V3C3 2.4 3.4 2 4 2H10" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                        ${role === 'user' ? `<button class="btn-icon" onclick="window.chatEnhancements.editMessage('${messageId}')" title="Edit message">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M12 4L14 6L6 14H4V12L12 4Z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>` : ''}
                        <button class="btn-icon" onclick="window.chatEnhancements.deleteMessage('${messageId}')" title="Delete message">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6V14H12V6M2 4H14M6 4V2H10V4M6 8V12M10 8V12" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="message-text">${renderedContent}</div>
                ${metadata.tokens ? `<div class="message-meta" style="font-size: 11px; color: var(--text-tertiary); margin-top: 8px;">
                    ~${metadata.tokens} tokens • ${time}
                </div>` : `<div class="message-time">${time}</div>`}
            </div>
        `;

        messagesContainer.appendChild(messageEl);
        this.scrollToBottom();
    }

    // Detect and render code blocks with syntax highlighting
    renderCodeBlocks(content) {
        // Match code blocks (```language\ncode\n```)
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

        let result = content.replace(codeBlockRegex, (match, language, code) => {
            const lang = language || 'text';
            return `
                <div class="code-block" style="margin: 10px 0; position: relative;">
                    <div class="code-header" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 6px 6px 0 0; border: 1px solid var(--border-color); border-bottom: none;">
                        <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${lang}</span>
                        <button class="btn btn-xs" onclick="window.chatEnhancements.copyCode(this)" title="Copy code">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M3 11V3C3 2.4 3.4 2 4 2H10" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                    </div>
                    <pre class="code-content" style="margin: 0; padding: 12px; background: var(--bg-code); border: 1px solid var(--border-color); border-radius: 0 0 6px 6px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.5;"><code class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>
                </div>
            `;
        });

        // Match inline code (`code`)
        const inlineCodeRegex = /`([^`]+)`/g;
        result = result.replace(inlineCodeRegex, (match, code) => {
            return `<code class="inline-code" style="padding: 2px 6px; background: var(--bg-tertiary); border-radius: 3px; font-family: 'Courier New', monospace; font-size: 13px;">${this.escapeHtml(code)}</code>`;
        });

        return result;
    }

    // Render tool execution results
    renderToolResult(toolResult) {
        const { tool, params, result, success, error } = toolResult;

        return `
            <div class="tool-result" style="margin: 12px 0; padding: 12px; background: ${success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-left: 3px solid ${success ? '#10b981' : '#ef4444'}; border-radius: 6px;">
                <div class="tool-result-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 16px;">${success ? '✅' : '❌'}</span>
                    <strong style="font-size: 14px;">Tool: ${tool}</strong>
                </div>
                ${params ? `<div class="tool-params" style="margin-bottom: 8px; font-size: 12px;">
                    <strong>Parameters:</strong>
                    <pre style="margin: 4px 0; padding: 8px; background: var(--bg-code); border-radius: 4px; overflow-x: auto; font-size: 11px;">${JSON.stringify(params, null, 2)}</pre>
                </div>` : ''}
                ${result ? `<div class="tool-output" style="font-size: 12px;">
                    <strong>Output:</strong>
                    <pre style="margin: 4px 0; padding: 8px; background: var(--bg-code); border-radius: 4px; overflow-x: auto; font-size: 11px; max-height: 300px;">${this.escapeHtml(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))}</pre>
                </div>` : ''}
                ${error ? `<div class="tool-error" style="font-size: 12px; color: #ef4444;">
                    <strong>Error:</strong> ${this.escapeHtml(error)}
                </div>` : ''}
            </div>
        `;
    }

    // Export conversation in various formats
    async exportConversation(format = 'json') {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify({
                    exportDate: new Date().toISOString(),
                    messageCount: this.messageHistory.length,
                    messages: this.messageHistory
                }, null, 2);
                filename = `conversation-${timestamp}.json`;
                mimeType = 'application/json';
                break;

            case 'markdown':
                content = this.generateMarkdownExport();
                filename = `conversation-${timestamp}.md`;
                mimeType = 'text/markdown';
                break;

            case 'text':
                content = this.generateTextExport();
                filename = `conversation-${timestamp}.txt`;
                mimeType = 'text/plain';
                break;

            default:
                this.mcp.showToast('Invalid export format', 'error');
                return;
        }

        this.downloadFile(content, filename, mimeType);
        this.mcp.showToast(`Conversation exported as ${format.toUpperCase()}`, 'success');
    }

    // Generate markdown export
    generateMarkdownExport() {
        let md = `# Chat Conversation Export\n\n`;
        md += `**Date:** ${new Date().toLocaleString()}\n`;
        md += `**Messages:** ${this.messageHistory.length}\n\n`;
        md += `---\n\n`;

        this.messageHistory.forEach(msg => {
            const role = msg.role === 'user' ? '**You**' : '**AI Assistant**';
            const time = new Date(msg.timestamp).toLocaleTimeString();

            md += `### ${role} (${time})\n\n`;
            md += `${msg.content}\n\n`;

            if (msg.metadata.hasTool) {
                md += `_[Tool execution]_\n\n`;
            }

            md += `---\n\n`;
        });

        return md;
    }

    // Generate plain text export
    generateTextExport() {
        let txt = `CHAT CONVERSATION EXPORT\n`;
        txt += `========================\n\n`;
        txt += `Date: ${new Date().toLocaleString()}\n`;
        txt += `Messages: ${this.messageHistory.length}\n\n`;
        txt += `${'='.repeat(60)}\n\n`;

        this.messageHistory.forEach(msg => {
            const role = msg.role === 'user' ? 'YOU' : 'AI ASSISTANT';
            const time = new Date(msg.timestamp).toLocaleTimeString();

            txt += `[${role}] ${time}\n`;
            txt += `${'-'.repeat(60)}\n`;
            txt += `${msg.content}\n\n`;
        });

        return txt;
    }

    // Download file helper
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Copy message to clipboard
    copyMessage(messageId) {
        const message = this.messageHistory.find(m => m.id === messageId);
        if (!message) return;

        navigator.clipboard.writeText(message.content).then(() => {
            this.mcp.showToast('Message copied to clipboard', 'success');
        }).catch(() => {
            this.mcp.showToast('Failed to copy message', 'error');
        });
    }

    // Copy code block
    copyCode(button) {
        const codeBlock = button.closest('.code-block');
        const codeContent = codeBlock.querySelector('code').textContent;

        navigator.clipboard.writeText(codeContent).then(() => {
            this.mcp.showToast('Code copied to clipboard', 'success');
            button.innerHTML = '✓';
            setTimeout(() => {
                button.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M3 11V3C3 2.4 3.4 2 4 2H10" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                `;
            }, 2000);
        }).catch(() => {
            this.mcp.showToast('Failed to copy code', 'error');
        });
    }

    // Edit message (re-send with edited content)
    editMessage(messageId) {
        const message = this.messageHistory.find(m => m.id === messageId);
        if (!message || message.role !== 'user') return;

        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = message.content;
            chatInput.focus();
            this.mcp.showToast('Message loaded for editing', 'info');
        }
    }

    // Delete message
    deleteMessage(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                messageEl.remove();
                this.messageHistory = this.messageHistory.filter(m => m.id !== messageId);
                this.saveConversationHistory();
                this.mcp.showToast('Message deleted', 'info');
            }, 300);
        }
    }

    // Filter messages by type
    filterMessages(type) {
        const messages = document.querySelectorAll('.chat-message');

        messages.forEach(msg => {
            const role = msg.dataset.role;
            const content = msg.textContent.toLowerCase();

            let visible = true;

            // Apply type filter
            if (type !== 'all') {
                if (type === 'user' && role !== 'user') visible = false;
                if (type === 'assistant' && role !== 'assistant') visible = false;
                if (type === 'tool' && !msg.querySelector('.tool-result')) visible = false;
                if (type === 'error' && !content.includes('error')) visible = false;
            }

            // Apply search filter
            if (this.searchQuery && !content.includes(this.searchQuery)) {
                visible = false;
            }

            msg.style.display = visible ? 'flex' : 'none';
        });
    }

    // Show conversation statistics
    showConversationStats() {
        const totalMessages = this.messageHistory.length;
        const userMessages = this.messageHistory.filter(m => m.role === 'user').length;
        const aiMessages = this.messageHistory.filter(m => m.role === 'assistant').length;
        const totalTokens = this.messageHistory.reduce((sum, m) => sum + (m.metadata.tokens || 0), 0);
        const codeBlocks = this.messageHistory.filter(m => m.metadata.hasCode).length;
        const toolCalls = this.messageHistory.filter(m => m.metadata.hasTool).length;

        const statsHTML = `
            <div style="padding: 20px; background: var(--bg-secondary); border-radius: 8px; max-width: 400px;">
                <h3 style="margin-top: 0;">Conversation Statistics</h3>
                <div style="display: grid; gap: 12px;">
                    <div><strong>Total Messages:</strong> ${totalMessages}</div>
                    <div><strong>User Messages:</strong> ${userMessages}</div>
                    <div><strong>AI Messages:</strong> ${aiMessages}</div>
                    <div><strong>Estimated Tokens:</strong> ~${totalTokens.toLocaleString()}</div>
                    <div><strong>Code Blocks:</strong> ${codeBlocks}</div>
                    <div><strong>Tool Calls:</strong> ${toolCalls}</div>
                    <div><strong>Duration:</strong> ${this.getConversationDuration()}</div>
                </div>
            </div>
        `;

        this.mcp.showToast(statsHTML, 'info', 8000);
    }

    // Get conversation duration
    getConversationDuration() {
        if (this.messageHistory.length === 0) return '0 minutes';

        const first = new Date(this.messageHistory[0].timestamp);
        const last = new Date(this.messageHistory[this.messageHistory.length - 1].timestamp);
        const duration = (last - first) / 1000 / 60; // minutes

        if (duration < 1) return 'Less than 1 minute';
        if (duration < 60) return `${Math.round(duration)} minutes`;

        const hours = Math.floor(duration / 60);
        const minutes = Math.round(duration % 60);
        return `${hours}h ${minutes}m`;
    }

    // Toggle thread view
    toggleThreadView() {
        this.mcp.showToast('Thread view coming soon!', 'info');
        // TODO: Implement message threading
    }

    // Estimate token count (rough approximation)
    estimateTokens(text) {
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    // Detect code in message
    detectCode(text) {
        return /```[\s\S]*?```|`[^`]+`/.test(text);
    }

    // Detect tool calls
    detectToolCall(text) {
        return /\[Tool:|\btool\s*\{|\bexecute_tool/i.test(text);
    }

    // Escape HTML for safe rendering
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Scroll chat to bottom
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K: Focus chat search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('chat-search')?.focus();
            }

            // Ctrl/Cmd + E: Export as JSON
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                const activeSection = document.querySelector('.section.active');
                if (activeSection?.id === 'chat') {
                    e.preventDefault();
                    this.exportConversation('json');
                }
            }

            // Ctrl/Cmd + /: Show keyboard shortcuts
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showKeyboardShortcuts();
            }
        });
    }

    // Show keyboard shortcuts help
    showKeyboardShortcuts() {
        const shortcuts = `
            <div style="padding: 20px; background: var(--bg-secondary); border-radius: 8px; max-width: 400px;">
                <h3 style="margin-top: 0;">Keyboard Shortcuts</h3>
                <div style="display: grid; gap: 8px; font-size: 13px;">
                    <div><kbd>Ctrl+K</kbd> - Focus search</div>
                    <div><kbd>Ctrl+E</kbd> - Export conversation</div>
                    <div><kbd>Ctrl+/</kbd> - Show this help</div>
                    <div><kbd>Enter</kbd> - Send message</div>
                    <div><kbd>Shift+Enter</kbd> - New line</div>
                </div>
            </div>
        `;

        this.mcp.showToast(shortcuts, 'info', 6000);
    }

    // Setup code highlighting (if Prism.js is available)
    setupCodeHighlighting() {
        // Check if Prism.js is loaded
        if (typeof Prism !== 'undefined') {
            // Prism is available, use it
            console.log('Code highlighting enabled with Prism.js');
        } else {
            // Use basic highlighting
            console.log('Using basic code highlighting');
        }
    }

    // Save conversation to localStorage
    saveConversationHistory() {
        try {
            localStorage.setItem('mcp_chat_history', JSON.stringify(this.messageHistory));
        } catch (error) {
            console.error('Failed to save conversation history:', error);
        }
    }

    // Load conversation from localStorage
    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('mcp_chat_history');
            if (saved) {
                this.messageHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load conversation history:', error);
        }
    }

    // Clear conversation history
    clearHistory() {
        this.messageHistory = [];
        this.saveConversationHistory();

        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="chat-message assistant">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <div class="message-text">Chat history cleared. How can I help you?</div>
                        <div class="message-time">${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        }

        this.mcp.showToast('Chat history cleared', 'info');
    }
}

// Initialize chat enhancements when DOM is ready
if (typeof window.mcp !== 'undefined') {
    window.chatEnhancements = new ChatEnhancements(window.mcp);

    // Auto-initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.chatEnhancements.init();
        });
    } else {
        window.chatEnhancements.init();
    }

    // Add methods to global mcp object
    window.mcp.exportChat = (format) => window.chatEnhancements.exportConversation(format);
    window.mcp.chatStats = () => window.chatEnhancements.showConversationStats();
    window.mcp.clearChatHistory = () => window.chatEnhancements.clearHistory();
}
