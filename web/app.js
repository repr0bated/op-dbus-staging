// System Brain Chat Interface - HuggingChat-inspired MCP Client
class SystemBrainChat {
    constructor() {
        this.apiKey = localStorage.getItem('apiKey') || '';
        this.serverUrl = this.detectServerUrl();
        this.model = localStorage.getItem('model') || 'mistral';
        this.autoScroll = localStorage.getItem('autoScroll') !== 'false';
        this.conversationId = this.generateConversationId();
        this.isConnected = false;

        this.initializeElements();
        this.setupEventListeners();
        this.updateConnectionStatus();
        this.loadSettings();
        this.focusInput();

        // Auto-connect on load
        this.connect();
    }

    initializeElements() {
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.chatMessages = document.getElementById('chat-messages');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.connectionStatus = document.getElementById('connection-status');
        this.charCount = document.getElementById('char-count');
        this.clearChatBtn = document.getElementById('clear-chat');
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.saveSettingsBtn = document.getElementById('save-settings');
        this.cancelSettingsBtn = document.getElementById('cancel-settings');
    }

    setupEventListeners() {
        // Message input
        this.messageInput.addEventListener('input', this.handleInput.bind(this));
        this.messageInput.addEventListener('keydown', this.handleKeydown.bind(this));

        // Send button
        this.sendButton.addEventListener('click', this.sendMessage.bind(this));

        // Clear chat
        this.clearChatBtn.addEventListener('click', this.clearChat.bind(this));

        // Settings
        this.settingsBtn.addEventListener('click', this.showSettings.bind(this));
        this.saveSettingsBtn.addEventListener('click', this.saveSettings.bind(this));
        this.cancelSettingsBtn.addEventListener('click', this.hideSettings.bind(this));

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', this.hideSettings.bind(this));
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });

        // Auto-scroll
        this.chatMessages.addEventListener('scroll', this.handleScroll.bind(this));
    }

    detectServerUrl() {
        // Use the same origin as the current page (MCP server serves the frontend)
        return window.location.origin;
    }

    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async connect() {
        try {
            // Test connection to MCP server
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                this.isConnected = true;
                this.updateConnectionStatus();
                this.showToast('Connected to System Brain', 'success');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.isConnected = false;
            this.updateConnectionStatus();
            this.showToast(`Connection failed: ${error.message}`, 'error');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiKey) {
            headers['x-api-key'] = this.apiKey;
        }

        return headers;
    }

    handleInput() {
        const text = this.messageInput.value.trim();
        const length = text.length;

        // Update character count
        this.charCount.textContent = `${length}/2000`;

        // Enable/disable send button
        this.sendButton.disabled = length === 0 || !this.isConnected;

        // Auto-resize textarea
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 128) + 'px';
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.isConnected) return;

        // Add user message to chat
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.handleInput();

        // Show typing indicator
        this.showTyping();

        try {
            const response = await fetch(`${this.serverUrl}/mcp`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'chat/send',
                    params: {
                        message: message,
                        conversationId: this.conversationId
                    }
                })
            });

            const data = await response.json();

            if (data.result) {
                this.addMessage('assistant', data.result.content || data.result.response || 'Response received');
            } else if (data.error) {
                throw new Error(data.error.message || 'Unknown error');
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            this.addMessage('assistant', `Error: ${error.message}`, true);
        } finally {
            this.hideTyping();
        }
    }

    addMessage(role, content, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message ${isError ? 'error' : ''}`;

        const avatar = role === 'user' ? '👤' : '🧠';
        const author = role === 'user' ? 'You' : 'System Brain';

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-time">${this.formatTime(new Date())}</span>
                </div>
                <div class="message-text">${this.escapeHtml(content)}</div>
            </div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showTyping() {
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        if (this.autoScroll) {
            setTimeout(() => {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }, 100);
        }
    }

    handleScroll() {
        const isAtBottom = this.chatMessages.scrollTop + this.chatMessages.clientHeight >= this.chatMessages.scrollHeight - 10;
        this.autoScroll = isAtBottom;
    }

    clearChat() {
        // Keep only the welcome message
        const welcomeMessage = this.chatMessages.querySelector('.system-message');
        this.chatMessages.innerHTML = '';
        if (welcomeMessage) {
            this.chatMessages.appendChild(welcomeMessage);
        }
        this.conversationId = this.generateConversationId();
        this.showToast('Chat cleared', 'info');
    }

    updateConnectionStatus() {
        if (this.isConnected) {
            this.connectionStatus.textContent = '🟢 Connected';
            this.connectionStatus.className = 'status-connected';
        } else {
            this.connectionStatus.textContent = '🔴 Disconnected';
            this.connectionStatus.className = 'status-disconnected';
        }
    }

    showSettings() {
        document.getElementById('api-key').value = this.apiKey;
        document.getElementById('server-url').value = this.serverUrl;
        document.getElementById('model-select').value = this.model;
        document.getElementById('auto-scroll').checked = this.autoScroll;
        this.settingsModal.style.display = 'flex';
    }

    hideSettings() {
        this.settingsModal.style.display = 'none';
    }

    saveSettings() {
        this.apiKey = document.getElementById('api-key').value;
        this.model = document.getElementById('model-select').value;
        this.autoScroll = document.getElementById('auto-scroll').checked;

        localStorage.setItem('apiKey', this.apiKey);
        localStorage.setItem('model', this.model);
        localStorage.setItem('autoScroll', this.autoScroll.toString());

        this.hideSettings();
        this.connect(); // Reconnect with new settings
        this.showToast('Settings saved', 'success');
    }

    loadSettings() {
        // Settings are loaded in constructor
    }

    focusInput() {
        this.messageInput.focus();
    }

    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#64748b'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Add toast animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.systemBrainChat = new SystemBrainChat();
});

// Export for debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemBrainChat;
}
