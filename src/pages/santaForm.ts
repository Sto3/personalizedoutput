/**
 * Santa Message Form Page - Premium Dark Theme
 *
 * The personalization experience for Santa messages.
 * Features the dark premium theme matching the homepage.
 */

export function renderSantaFormPage(token?: string): string {
  const tokenParam = token ? `?token=${token}` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create Your Santa Message | Personalized Output</title>
  <meta name="description" content="Create a magical, personalized audio message from Santa for your child.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-dark: #1a0a1a;
      --bg-card: #0a0a10;
      --bg-card-hover: #12121a;
      --coral: #E85A4F;
      --coral-light: #F08B96;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
      --text-primary: #ffffff;
      --text-secondary: rgba(255,255,255,0.7);
      --text-muted: rgba(255,255,255,0.5);
      --border: rgba(255,255,255,0.1);
      --border-focus: rgba(124, 58, 237, 0.5);
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-dark);
      min-height: 100vh;
      color: var(--text-primary);
      line-height: 1.6;
    }

    /* Header */
    .header {
      background: var(--purple);
      padding: 16px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-inner {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      text-decoration: none;
    }
    .logo span { color: var(--coral); }
    .back-link {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: color 0.2s;
    }
    .back-link:hover { color: #fff; }

    /* Main container */
    .container {
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* Page title */
    .page-title {
      text-align: center;
      margin-bottom: 40px;
    }
    .page-title .badge {
      display: inline-block;
      background: linear-gradient(135deg, var(--coral), var(--purple));
      color: #fff;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    .page-title h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(1.75rem, 5vw, 2.5rem);
      font-weight: 700;
      margin-bottom: 12px;
      line-height: 1.2;
    }
    .page-title p {
      color: var(--text-secondary);
      font-size: 1.1rem;
    }

    /* Card styling */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px;
      margin-bottom: 24px;
    }

    /* Start screen */
    .start-screen .intro-text {
      color: var(--text-secondary);
      margin-bottom: 32px;
      line-height: 1.8;
    }
    .start-screen .intro-text p {
      margin-bottom: 16px;
    }
    .start-screen .intro-text p:last-child {
      margin-bottom: 0;
    }

    .btn-start {
      width: 100%;
      background: linear-gradient(135deg, var(--coral), var(--coral-light));
      color: #fff;
      border: none;
      padding: 18px 36px;
      font-size: 1.1rem;
      font-weight: 600;
      font-family: inherit;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(232, 90, 79, 0.3);
    }
    .btn-start:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(232, 90, 79, 0.4);
    }

    /* Form area */
    .form-area {
      display: none;
    }
    .form-area.active {
      display: block;
    }

    /* Previous answers */
    .previous-answers {
      margin-bottom: 24px;
    }
    .previous-answers h3 {
      color: var(--purple-light);
      font-family: 'Bodoni Moda', serif;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .previous-answers h3::before {
      content: '';
      width: 4px;
      height: 20px;
      background: var(--purple);
      border-radius: 2px;
    }
    .helper-text {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 16px;
      font-style: italic;
    }
    .no-answers {
      color: var(--text-muted);
      font-style: italic;
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
    }
    .answer-pair {
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid var(--border);
    }
    .answer-pair .question {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-bottom: 8px;
    }
    .answer-pair .answer {
      color: var(--text-primary);
      font-size: 0.95rem;
    }

    /* Current question */
    .current-question {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }
    .current-question-header {
      color: var(--purple-light);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    .current-question-hint {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-bottom: 16px;
      font-style: italic;
    }
    .question-label {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 20px;
      line-height: 1.4;
    }
    .answer-input {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 1rem;
      min-height: 120px;
      resize: vertical;
      transition: border-color 0.2s;
    }
    .answer-input:focus {
      outline: none;
      border-color: var(--border-focus);
      background: rgba(124, 58, 237, 0.05);
    }
    .answer-input::placeholder {
      color: var(--text-muted);
    }

    .btn-next {
      width: 100%;
      background: var(--purple);
      color: #fff;
      border: none;
      padding: 16px 32px;
      font-size: 1rem;
      font-weight: 600;
      font-family: inherit;
      border-radius: 10px;
      cursor: pointer;
      margin-top: 16px;
      transition: all 0.2s;
    }
    .btn-next:hover:not(:disabled) {
      background: var(--purple-light);
      transform: translateY(-1px);
    }
    .btn-next:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Summary screen */
    .summary-screen {
      display: none;
    }
    .summary-screen.active {
      display: block;
    }
    .summary-screen h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      text-align: center;
      margin-bottom: 16px;
    }
    .body-text {
      color: var(--text-secondary);
      text-align: center;
      margin-bottom: 12px;
      line-height: 1.7;
    }
    .summary-content {
      margin: 32px 0;
      max-height: 400px;
      overflow-y: auto;
    }
    .summary-item {
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid var(--border);
    }
    .summary-item .q {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-bottom: 8px;
    }
    .summary-item .a {
      color: var(--text-primary);
      font-size: 0.95rem;
    }
    .btn-generate {
      width: 100%;
      background: linear-gradient(135deg, var(--coral), var(--coral-light));
      color: #fff;
      border: none;
      padding: 18px 36px;
      font-size: 1.1rem;
      font-weight: 600;
      font-family: inherit;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(232, 90, 79, 0.3);
    }
    .btn-generate:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(232, 90, 79, 0.4);
    }

    /* Result screen */
    .result-screen {
      display: none;
    }
    .result-screen.active {
      display: block;
    }
    .result-screen h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      text-align: center;
      margin-bottom: 24px;
      color: var(--coral);
    }
    .result-content {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 24px;
      white-space: pre-wrap;
      line-height: 1.8;
      font-size: 1.05rem;
      color: var(--text-secondary);
      margin-bottom: 24px;
      border: 1px solid var(--border);
    }
    .audio-player {
      background: rgba(124, 58, 237, 0.1);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      text-align: center;
      border: 1px solid rgba(124, 58, 237, 0.3);
    }
    .audio-player h4 {
      color: var(--purple-light);
      margin-bottom: 16px;
      font-size: 1rem;
    }
    .audio-player audio {
      width: 100%;
      max-width: 400px;
    }
    .result-note {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-style: italic;
      text-align: center;
      margin-bottom: 24px;
    }
    .btn-restart {
      display: block;
      width: 100%;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      padding: 14px 28px;
      font-size: 0.95rem;
      font-family: inherit;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-restart:hover {
      background: rgba(255,255,255,0.05);
      color: var(--text-primary);
    }

    /* Loading state */
    .loading {
      text-align: center;
      padding: 60px 40px;
      color: var(--text-muted);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--border);
      border-top-color: var(--coral);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Progress indicator */
    .progress {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;
    }
    .progress-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      transition: all 0.3s;
    }
    .progress-dot.completed {
      background: var(--purple);
    }
    .progress-dot.current {
      background: var(--coral);
      box-shadow: 0 0 12px rgba(232, 90, 79, 0.5);
    }

    /* Error state */
    .error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .hidden {
      display: none !important;
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .container {
        padding: 24px 16px 60px;
      }
      .card {
        padding: 28px 20px;
        border-radius: 16px;
      }
      .page-title h1 {
        font-size: 1.75rem;
      }
      .question-label {
        font-size: 1.1rem;
      }
      .btn-start, .btn-generate {
        padding: 16px 28px;
        font-size: 1rem;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo">personalized<span>output</span></a>
      <a href="/" class="back-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 1L4 8l7 7" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        Back to Home
      </a>
    </div>
  </header>

  <div class="container">
    <div class="page-title">
      <span class="badge">Christmas Magic</span>
      <h1>Personalized Santa Message</h1>
      <p>A magical audio message crafted from your stories</p>
    </div>

    <!-- Start Screen -->
    <div id="startScreen" class="card start-screen">
      <div class="intro-text">
        <p>In a few thoughtful questions, we'll help you remember the moments, details, and quiet acts of courage that you most want Santa to notice about your child.</p>
        <p>This isn't a quiz and it's not therapy. It's a focused space to organize your thoughts so the final Santa message feels specific, honest, and deeply personal - without any pressure on you to "say it perfectly."</p>
      </div>
      <button class="btn-start" onclick="startSession()">Begin the Questions</button>
    </div>

    <!-- Form Area -->
    <div id="formArea" class="form-area">
      <div id="progress" class="progress"></div>

      <div id="previousAnswers" class="previous-answers">
        <h3>What You've Shared</h3>
        <p class="helper-text">As you go, you'll see your earlier answers here. There are no "right" answers - we're just collecting the details that will help shape your child's message.</p>
        <div id="answersList"></div>
      </div>

      <div id="currentQuestion" class="current-question">
        <div class="current-question-header">Current Question</div>
        <div class="current-question-hint">Your next question may change slightly based on what you've already shared.</div>
        <div id="questionLabel" class="question-label"></div>
        <textarea
          id="answerInput"
          class="answer-input"
          placeholder="Type your answer here..."
          onkeydown="handleKeyDown(event)"
        ></textarea>
        <button id="nextBtn" class="btn-next" onclick="submitAnswer()">Next</button>
      </div>

      <div id="loadingQuestion" class="loading hidden">
        <div class="spinner"></div>
        <p>Thinking...</p>
      </div>
    </div>

    <!-- Summary Screen -->
    <div id="summaryScreen" class="card summary-screen">
      <h2>You've reached the end of the questions</h2>
      <p class="body-text">You've just done the hardest and most important part: putting into words what this year has really been like for your child, and what you most want them to hear.</p>
      <p class="body-text">When you click below, we'll use everything you've shared to create a personalized Santa message that names their courage, kindness, and growth in a way that feels true to them.</p>
      <div id="summaryContent" class="summary-content"></div>
      <button class="btn-generate" onclick="generateMessage()">Generate Santa Message</button>
    </div>

    <!-- Result Screen -->
    <div id="resultScreen" class="card result-screen">
      <h2>Your Personalized Santa Message is Ready</h2>
      <div id="resultContent" class="result-content"></div>
      <div id="audioPlayer" class="audio-player hidden">
        <h4>Listen to the Message</h4>
        <audio id="audioElement" controls></audio>
      </div>
      <p class="result-note">This is your final digital file. Check your email for the download link.</p>
      <button class="btn-restart" onclick="restart()">Create Another Message</button>
    </div>

    <!-- Error Display -->
    <div id="errorDisplay" class="error hidden"></div>
  </div>

  <script>
    const API_BASE = '/api/thought-chat';

    // Get token from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('token');

    let sessionId = null;
    let currentQuestion = '';
    let answers = [];
    let questionCount = 0;

    async function startSession() {
      hideError();
      document.getElementById('startScreen').style.display = 'none';
      document.getElementById('formArea').classList.add('active');
      showLoading(true);

      try {
        const requestBody = { productId: 'santa_message' };
        if (accessToken) {
          requestBody.token = accessToken;
        }

        const response = await fetch(\`\${API_BASE}/start\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to start session');
        }

        const data = await response.json();
        sessionId = data.sessionId;
        currentQuestion = data.firstAssistantMessage || data.message || '';
        questionCount = 1;

        showLoading(false);
        displayQuestion();
        updateProgress();

      } catch (err) {
        showError(err.message);
        showLoading(false);
      }
    }

    function displayQuestion() {
      document.getElementById('questionLabel').textContent = currentQuestion;
      document.getElementById('answerInput').value = '';
      document.getElementById('answerInput').focus();
      document.getElementById('currentQuestion').classList.remove('hidden');
      updateAnswersList();
    }

    function updateAnswersList() {
      const list = document.getElementById('answersList');

      if (answers.length === 0) {
        list.innerHTML = '<p class="no-answers">Your previous answers will appear here.</p>';
        return;
      }

      list.innerHTML = answers.map((item, i) => \`
        <div class="answer-pair">
          <div class="question">\${escapeHtml(item.question)}</div>
          <div class="answer">\${escapeHtml(item.answer)}</div>
        </div>
      \`).join('');
    }

    function updateProgress() {
      const progress = document.getElementById('progress');
      const maxDots = 10;

      let dots = '';
      for (let i = 0; i < maxDots; i++) {
        if (i < questionCount - 1) {
          dots += '<div class="progress-dot completed"></div>';
        } else if (i === questionCount - 1) {
          dots += '<div class="progress-dot current"></div>';
        } else {
          dots += '<div class="progress-dot"></div>';
        }
      }
      progress.innerHTML = dots;
    }

    async function submitAnswer() {
      const input = document.getElementById('answerInput');
      const answer = input.value.trim();

      if (!answer) return;

      hideError();
      answers.push({ question: currentQuestion, answer: answer });

      document.getElementById('currentQuestion').classList.add('hidden');
      showLoading(true);

      try {
        const response = await fetch(\`\${API_BASE}/continue\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userMessage: answer })
        });

        if (!response.ok) throw new Error('Failed to continue session');

        const data = await response.json();

        if (data.status === 'ready_for_generation') {
          showLoading(false);
          document.getElementById('formArea').classList.remove('active');
          showSummary();
        } else {
          currentQuestion = data.assistantMessage || data.message || '';
          questionCount++;
          showLoading(false);
          displayQuestion();
          updateProgress();
        }

      } catch (err) {
        showError(err.message);
        showLoading(false);
        document.getElementById('currentQuestion').classList.remove('hidden');
      }
    }

    function showSummary() {
      const content = document.getElementById('summaryContent');
      content.innerHTML = answers.map(item => \`
        <div class="summary-item">
          <div class="q">\${escapeHtml(item.question)}</div>
          <div class="a">\${escapeHtml(item.answer)}</div>
        </div>
      \`).join('');

      document.getElementById('summaryScreen').classList.add('active');
    }

    async function generateMessage() {
      hideError();
      document.getElementById('summaryScreen').classList.remove('active');
      document.getElementById('formArea').classList.add('active');
      showLoading(true);
      document.getElementById('previousAnswers').classList.add('hidden');

      try {
        const requestBody = { sessionId };
        if (accessToken) {
          requestBody.token = accessToken;
        }

        const response = await fetch(\`\${API_BASE}/generate\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate message');
        }

        const data = await response.json();

        showLoading(false);
        document.getElementById('formArea').classList.remove('active');
        showResult(data.output);

      } catch (err) {
        showError(err.message);
        showLoading(false);
        document.getElementById('summaryScreen').classList.add('active');
        document.getElementById('formArea').classList.remove('active');
      }
    }

    function showResult(output) {
      let messageText = '';
      let audioUrl = null;

      if (typeof output === 'string') {
        messageText = output;
      } else if (typeof output === 'object') {
        messageText = output.messageText || output.script || output.message || output.text || '';
        audioUrl = output.audioUrl || output.audioPath || output.audio || null;

        if (audioUrl && !audioUrl.startsWith('http') && !audioUrl.startsWith('/')) {
          audioUrl = '/outputs/' + audioUrl;
        }

        if (!messageText) {
          messageText = JSON.stringify(output, null, 2);
        }
      }

      document.getElementById('resultContent').textContent = messageText;

      const audioPlayer = document.getElementById('audioPlayer');
      const audioElement = document.getElementById('audioElement');

      if (audioUrl) {
        audioElement.src = audioUrl;
        audioPlayer.classList.remove('hidden');
      } else {
        audioPlayer.classList.add('hidden');
      }

      document.getElementById('resultScreen').classList.add('active');
    }

    function restart() {
      sessionId = null;
      currentQuestion = '';
      answers = [];
      questionCount = 0;

      document.getElementById('resultScreen').classList.remove('active');
      document.getElementById('summaryScreen').classList.remove('active');
      document.getElementById('formArea').classList.remove('active');
      document.getElementById('previousAnswers').classList.remove('hidden');
      document.getElementById('startScreen').style.display = 'block';
      document.getElementById('audioPlayer').classList.add('hidden');
      hideError();
    }

    function showLoading(show) {
      document.getElementById('loadingQuestion').classList.toggle('hidden', !show);
      document.getElementById('nextBtn').disabled = show;
    }

    function showError(message) {
      const el = document.getElementById('errorDisplay');
      el.textContent = message;
      el.classList.remove('hidden');
    }

    function hideError() {
      document.getElementById('errorDisplay').classList.add('hidden');
    }

    function handleKeyDown(event) {
      if (event.key === 'Enter' && event.metaKey) {
        submitAnswer();
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>
  `;
}
