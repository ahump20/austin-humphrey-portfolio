/**
 * Enhanced AI Chatbot with Real API Integration
 * Supports both Claude 4 Sonnet and ChatGPT-5 with thinking modes
 */

class PortfolioAIAssistant {
    constructor() {
        this.state = {
            isOpen: false,
            activeAI: 'chatgpt',
            thinkingMode: 'auto',
            conversationHistory: [],
            isThinking: false,
            currentStream: null
        };

        this.thinkingModes = {
            auto: { name: "Auto", description: "Decides how long to think" },
            fast: { name: "Fast", description: "Instant answers" },
            mini: { name: "Thinking mini", description: "Thinks quickly" },
            thinking: { name: "Thinking", description: "Thinks longer for better answers" },
            pro: { name: "Pro", description: "Research-grade intelligence" }
        };

        this.init();
    }

    init() {
        this.createChatInterface();
        this.setupEventListeners();
        this.selectAI('chatgpt'); // Default to ChatGPT
        this.showTooltipAfterDelay();
    }

    createChatInterface() {
        // Chat interface is already in HTML, this method could be used for dynamic creation
        console.log('AI Assistant initialized');
    }

    setupEventListeners() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#thinking-dropdown') && !e.target.closest('[onclick="toggleThinkingMode()"]')) {
                const dropdown = document.getElementById('thinking-dropdown');
                if (dropdown) dropdown.classList.add('hidden');
            }
        });

        // Handle Enter key in chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Track visitor behavior for analytics
        this.trackVisitorBehavior();
    }

    toggleChat() {
        this.state.isOpen = !this.state.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const tooltip = document.getElementById('chat-tooltip');
        
        if (this.state.isOpen) {
            chatWindow?.classList.remove('hidden');
            tooltip?.classList.add('hidden');
            this.trackEvent('chat_opened');
        } else {
            chatWindow?.classList.add('hidden');
            this.state.currentStream?.abort();
        }
    }

    selectAI(ai) {
        this.state.activeAI = ai;
        
        // Update UI
        document.getElementById('claude-btn')?.classList.remove('border-orange-500', 'bg-orange-900');
        document.getElementById('chatgpt-btn')?.classList.remove('border-green-500', 'bg-green-900');
        
        if (ai === 'claude') {
            document.getElementById('claude-btn')?.classList.add('border-orange-500', 'bg-orange-900');
        } else {
            document.getElementById('chatgpt-btn')?.classList.add('border-green-500', 'bg-green-900');
        }

        this.trackEvent('ai_selected', { ai });
    }

    toggleThinkingMode() {
        const dropdown = document.getElementById('thinking-dropdown');
        dropdown?.classList.toggle('hidden');
    }

    setThinkingMode(mode) {
        this.state.thinkingMode = mode;
        const modeConfig = this.thinkingModes[mode];
        
        // Update display
        const modeName = document.getElementById('mode-name');
        const modeDesc = document.querySelector('#thinking-mode-display .text-gray-400');
        
        if (modeName) modeName.textContent = modeConfig.name;
        if (modeDesc) modeDesc.textContent = modeConfig.description;
        
        // Hide dropdown
        document.getElementById('thinking-dropdown')?.classList.add('hidden');
        
        this.trackEvent('thinking_mode_changed', { mode });
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input?.value.trim();
        
        if (!message || this.state.isThinking) return;
        
        // Add user message to conversation
        this.addMessage('user', message);
        this.state.conversationHistory.push({ role: 'user', content: message });
        input.value = '';
        
        // Show thinking indicator
        this.showThinking();
        
        try {
            // Call appropriate AI API
            if (this.state.activeAI === 'claude') {
                await this.callClaudeAPI(message);
            } else {
                await this.callChatGPTAPI(message);
            }
        } catch (error) {
            console.error('AI API Error:', error);
            this.hideThinking();
            this.addMessage('ai', 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.');
        }
    }

    async callClaudeAPI(message) {
        try {
            const response = await fetch('/api/claude-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    thinkingMode: this.state.thinkingMode,
                    conversationHistory: this.state.conversationHistory.slice(-10) // Keep last 10 messages for context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await this.handleStreamingResponse(response, 'claude');
        } catch (error) {
            console.error('Claude API Error:', error);
            throw error;
        }
    }

    async callChatGPTAPI(message) {
        try {
            const response = await fetch('/api/chatgpt-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    thinkingMode: this.state.thinkingMode,
                    conversationHistory: this.state.conversationHistory.slice(-10)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await this.handleStreamingResponse(response, 'chatgpt');
        } catch (error) {
            console.error('ChatGPT API Error:', error);
            throw error;
        }
    }

    async handleStreamingResponse(response, aiType) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponseText = '';
        let messageDiv = null;

        this.hideThinking();

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        
                        if (data === '[DONE]') {
                            // Streaming complete
                            if (aiResponseText) {
                                this.state.conversationHistory.push({ 
                                    role: 'ai', 
                                    content: aiResponseText 
                                });
                            }
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            
                            if (parsed.text) {
                                aiResponseText += parsed.text;
                                
                                // Create or update message div
                                if (!messageDiv) {
                                    messageDiv = this.createStreamingMessage(aiType);
                                }
                                
                                this.updateStreamingMessage(messageDiv, aiResponseText);
                            }
                            
                            if (parsed.reasoning) {
                                // Handle reasoning tokens for ChatGPT o1 models
                                this.showReasoningIndicator(parsed.reasoning);
                            }
                        } catch (e) {
                            console.warn('Failed to parse streaming data:', data);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming error:', error);
            throw error;
        }
    }

    createStreamingMessage(aiType) {
        const messagesDiv = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        
        const aiName = aiType === 'claude' ? 'Claude 4' : 'ChatGPT-5';
        const aiColor = aiType === 'claude' ? 'text-orange-400' : 'text-green-400';
        
        messageDiv.className = 'message-ai p-3 rounded-lg max-w-[80%]';
        messageDiv.innerHTML = `
            <div class="text-sm ${aiColor} mb-1">
                ${aiName} (${this.thinkingModes[this.state.thinkingMode].name})
            </div>
            <div class="text-white" id="streaming-content"></div>
        `;
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        return messageDiv;
    }

    updateStreamingMessage(messageDiv, content) {
        const contentDiv = messageDiv.querySelector('#streaming-content');
        if (contentDiv) {
            // Convert markdown-like formatting to HTML
            const formattedContent = this.formatMessageContent(content);
            contentDiv.innerHTML = formattedContent;
        }
        
        // Auto-scroll to bottom
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    formatMessageContent(content) {
        // Basic markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>');
    }

    addMessage(sender, text) {
        const messagesDiv = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        
        if (sender === 'user') {
            messageDiv.className = 'message-user p-3 rounded-lg text-white ml-auto max-w-[80%]';
            messageDiv.innerHTML = `
                <div class="text-sm opacity-75 mb-1">You</div>
                <div>${this.formatMessageContent(text)}</div>
            `;
        } else {
            const aiName = this.state.activeAI === 'claude' ? 'Claude 4' : 'ChatGPT-5';
            const aiColor = this.state.activeAI === 'claude' ? 'text-orange-400' : 'text-green-400';
            messageDiv.className = 'message-ai p-3 rounded-lg max-w-[80%]';
            messageDiv.innerHTML = `
                <div class="text-sm ${aiColor} mb-1">
                    ${aiName} (${this.thinkingModes[this.state.thinkingMode].name})
                </div>
                <div class="text-white">${this.formatMessageContent(text)}</div>
            `;
        }
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    showThinking() {
        this.state.isThinking = true;
        const thinkingStatus = document.getElementById('thinking-status');
        thinkingStatus?.classList.remove('hidden');
    }

    hideThinking() {
        this.state.isThinking = false;
        const thinkingStatus = document.getElementById('thinking-status');
        thinkingStatus?.classList.add('hidden');
    }

    showReasoningIndicator(reasoning) {
        // Show reasoning tokens for advanced thinking modes
        if (this.state.thinkingMode === 'thinking' || this.state.thinkingMode === 'pro') {
            console.log('AI Reasoning:', reasoning);
            // Could add a special UI indicator for reasoning process
        }
    }

    showTooltipAfterDelay() {
        setTimeout(() => {
            const tooltip = document.getElementById('chat-tooltip');
            tooltip?.classList.remove('hidden');
        }, 3000);
        
        setTimeout(() => {
            const tooltip = document.getElementById('chat-tooltip');
            tooltip?.classList.add('hidden');
        }, 8000);
    }

    trackVisitorBehavior() {
        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
            }
        });

        // Track time on site
        const startTime = Date.now();
        
        // Track page unload
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_end', {
                duration: Math.round((Date.now() - startTime) / 1000),
                maxScroll,
                messagesExchanged: this.state.conversationHistory.length
            });
        });
    }

    trackEvent(event, data = {}) {
        // Analytics tracking
        console.log('Analytics Event:', event, data);
        
        // In production, send to your analytics service
        // Example: gtag('event', event, data);
        // Example: mixpanel.track(event, data);
    }
}

// Global functions for HTML onclick handlers
let portfolioAI;

function toggleChat() {
    portfolioAI?.toggleChat();
}

function selectAI(ai) {
    portfolioAI?.selectAI(ai);
}

function toggleThinkingMode() {
    portfolioAI?.toggleThinkingMode();
}

function setThinkingMode(mode) {
    portfolioAI?.setThinkingMode(mode);
}

function sendMessage() {
    portfolioAI?.sendMessage();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    portfolioAI = new PortfolioAIAssistant();
    console.log('%c🤖 Dual-AI Portfolio Assistant Initialized', 
                'font-size: 18px; font-weight: bold; color: #BF5700;');
});