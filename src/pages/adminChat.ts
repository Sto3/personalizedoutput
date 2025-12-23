/**
 * Admin Chat Page (Stor Interface)
 *
 * Chat UI for the Stor AI business assistant.
 */

export function renderAdminChatPage(adminEmail: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stor - AI Business Assistant</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          background: #0f0f0f;
          min-height: 100vh;
          color: #fff;
          display: flex;
          flex-direction: column;
        }
        .header {
          background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .logo {
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo span { color: #7C3AED; }
        .stor-badge {
          background: linear-gradient(135deg, #7C3AED, #EC4899);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .back-link {
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .back-link:hover { color: #fff; }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
          padding: 0 24px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }
        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .message.assistant {
          align-self: flex-start;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .user .avatar {
          background: #7C3AED;
        }
        .assistant .avatar {
          background: linear-gradient(135deg, #7C3AED, #EC4899);
        }

        .bubble {
          padding: 14px 18px;
          border-radius: 18px;
          line-height: 1.5;
          font-size: 0.9375rem;
        }
        .user .bubble {
          background: #7C3AED;
          border-bottom-right-radius: 4px;
        }
        .assistant .bubble {
          background: rgba(255,255,255,0.1);
          border-bottom-left-radius: 4px;
        }

        .sensitive-badge {
          display: inline-block;
          background: rgba(251, 191, 36, 0.2);
          color: #FCD34D;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 600;
          margin-top: 8px;
        }

        .input-area {
          padding: 24px 0;
          flex-shrink: 0;
        }
        .input-container {
          display: flex;
          gap: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 8px 8px 8px 20px;
          align-items: flex-end;
        }
        textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 1rem;
          font-family: inherit;
          resize: none;
          outline: none;
          max-height: 150px;
          line-height: 1.5;
          padding: 8px 0;
        }
        textarea::placeholder {
          color: rgba(255,255,255,0.4);
        }
        .send-btn {
          background: #7C3AED;
          border: none;
          border-radius: 12px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .send-btn:hover { background: #6D28D9; }
        .send-btn:disabled {
          background: rgba(124, 58, 237, 0.3);
          cursor: not-allowed;
        }
        .send-btn svg {
          width: 20px;
          height: 20px;
          fill: #fff;
        }

        .welcome {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255,255,255,0.6);
        }
        .welcome h2 {
          color: #fff;
          font-size: 1.5rem;
          margin-bottom: 12px;
        }
        .welcome p {
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.6;
        }
        .suggestion-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-top: 24px;
        }
        .chip {
          background: rgba(124, 58, 237, 0.2);
          border: 1px solid rgba(124, 58, 237, 0.3);
          padding: 10px 18px;
          border-radius: 20px;
          font-size: 0.875rem;
          color: #A78BFA;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chip:hover {
          background: rgba(124, 58, 237, 0.3);
          color: #fff;
        }

        .typing {
          display: flex;
          gap: 4px;
          padding: 12px;
        }
        .typing span {
          width: 8px;
          height: 8px;
          background: rgba(255,255,255,0.4);
          border-radius: 50%;
          animation: typing 1.4s ease-in-out infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
        }

        /* Markdown-like formatting */
        .bubble code {
          background: rgba(0,0,0,0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.875em;
        }
        .bubble ul, .bubble ol {
          padding-left: 20px;
          margin: 8px 0;
        }
        .bubble li {
          margin: 4px 0;
        }
        .bubble p + p {
          margin-top: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <span class="stor-badge">STOR</span>
          AI Business Assistant
        </div>
        <a href="/admin" class="back-link">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
          Back to Dashboard
        </a>
      </div>

      <div class="main">
        <div class="messages" id="messages">
          <div class="welcome" id="welcome">
            <h2>Hi, I'm Stor</h2>
            <p>I'm your AI business assistant. I can help you analyze your business, answer questions about operations, and provide strategic insights.</p>
            <div class="suggestion-chips">
              <button class="chip" onclick="sendSuggestion('What are our best-selling products?')">Best sellers</button>
              <button class="chip" onclick="sendSuggestion('How can we improve our marketing?')">Marketing ideas</button>
              <button class="chip" onclick="sendSuggestion('Summarize today\\'s activity')">Today's activity</button>
              <button class="chip" onclick="sendSuggestion('Help me write social media copy')">Social copy</button>
            </div>
          </div>
        </div>

        <div class="input-area">
          <div class="input-container">
            <textarea
              id="input"
              placeholder="Ask me anything about the business..."
              rows="1"
              onkeydown="handleKeydown(event)"
              oninput="autoResize(this)"
            ></textarea>
            <button class="send-btn" id="sendBtn" onclick="sendMessage()">
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <script>
        let sessionId = null;
        const messagesEl = document.getElementById('messages');
        const inputEl = document.getElementById('input');
        const sendBtn = document.getElementById('sendBtn');
        const welcomeEl = document.getElementById('welcome');

        // Create a new session on load
        async function initSession() {
          try {
            const res = await fetch('/api/stor/sessions', { method: 'POST' });
            const data = await res.json();
            sessionId = data.session?.id;
          } catch (err) {
            console.error('Failed to create session:', err);
          }
        }
        initSession();

        function autoResize(el) {
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 150) + 'px';
        }

        function handleKeydown(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        }

        function sendSuggestion(text) {
          inputEl.value = text;
          sendMessage();
        }

        function addMessage(role, content, isSensitive = false) {
          // Hide welcome on first message
          if (welcomeEl) welcomeEl.style.display = 'none';

          const div = document.createElement('div');
          div.className = 'message ' + role;

          const avatar = document.createElement('div');
          avatar.className = 'avatar';
          avatar.textContent = role === 'user' ? '👤' : '🤖';

          const bubble = document.createElement('div');
          bubble.className = 'bubble';
          bubble.innerHTML = formatContent(content);

          if (isSensitive) {
            const badge = document.createElement('span');
            badge.className = 'sensitive-badge';
            badge.textContent = '⚠️ Sensitive';
            bubble.appendChild(badge);
          }

          div.appendChild(avatar);
          div.appendChild(bubble);
          messagesEl.appendChild(div);
          messagesEl.scrollTop = messagesEl.scrollHeight;

          return div;
        }

        function formatContent(content) {
          // Basic markdown-like formatting
          return content
            .replace(/\\n\\n/g, '</p><p>')
            .replace(/\\n/g, '<br>')
            .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
            .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
            .replace(/^/g, '<p>')
            .replace(/$/g, '</p>');
        }

        function addTypingIndicator() {
          const div = document.createElement('div');
          div.className = 'message assistant';
          div.id = 'typing';

          const avatar = document.createElement('div');
          avatar.className = 'avatar';
          avatar.textContent = '🤖';

          const typing = document.createElement('div');
          typing.className = 'typing';
          typing.innerHTML = '<span></span><span></span><span></span>';

          div.appendChild(avatar);
          div.appendChild(typing);
          messagesEl.appendChild(div);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function removeTypingIndicator() {
          const typing = document.getElementById('typing');
          if (typing) typing.remove();
        }

        async function sendMessage() {
          const message = inputEl.value.trim();
          if (!message || !sessionId) return;

          inputEl.value = '';
          inputEl.style.height = 'auto';
          sendBtn.disabled = true;

          addMessage('user', message);
          addTypingIndicator();

          try {
            const res = await fetch('/api/stor/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, message }),
            });

            const data = await res.json();
            removeTypingIndicator();

            if (data.error) {
              addMessage('assistant', 'Sorry, I encountered an error: ' + data.error);
            } else {
              addMessage('assistant', data.message.content, data.isSensitive);
            }
          } catch (err) {
            removeTypingIndicator();
            addMessage('assistant', 'Sorry, I couldn\\'t connect. Please try again.');
          }

          sendBtn.disabled = false;
          inputEl.focus();
        }
      </script>
    </body>
    </html>
  `;
}
