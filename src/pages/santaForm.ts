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
  <meta name="description" content="Create a deeply personal audio experience from Santa for your child.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,700&family=Cormorant+SC:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-black: #0a0a0f;
      --bg-card: rgba(255,255,255,0.05);
      --bg-card-hover: rgba(255,255,255,0.08);
      --coral: #E85A4F;
      --coral-light: #F08B96;
      --text-primary: #F5EEF0;
      --text-secondary: rgba(245,238,240,0.7);
      --text-muted: rgba(245,238,240,0.5);
      --border: rgba(255,255,255,0.12);
      --border-focus: rgba(232, 90, 79, 0.6);
    }

    body {
      font-family: 'Bodoni Moda', Georgia, serif;
      background: var(--bg-black);
      min-height: 100vh;
      color: var(--text-primary);
      line-height: 1.7;
    }

    /* Header */
    .header {
      background: var(--bg-black);
      border-bottom: 1px solid var(--border);
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
      color: var(--text-primary);
      text-decoration: none;
    }
    .logo span { color: var(--coral); }
    .back-link {
      font-family: 'Bodoni Moda', serif;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: color 0.2s;
    }
    .back-link:hover { color: var(--coral); }

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
      background: transparent;
      border: 1px solid var(--coral);
      color: var(--coral);
      padding: 6px 16px;
      border-radius: 20px;
      font-family: 'Bodoni Moda', serif;
      font-size: 0.8rem;
      font-weight: 400;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    .page-title h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: clamp(1.75rem, 5vw, 2.5rem);
      font-weight: 400;
      margin-bottom: 12px;
      line-height: 1.3;
      color: var(--text-primary);
    }
    .page-title h1 em {
      font-style: italic;
      color: var(--coral);
    }
    .page-title p {
      font-family: 'Bodoni Moda', serif;
      color: var(--text-secondary);
      font-size: 1.1rem;
      font-weight: 400;
    }

    /* Card styling */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 24px;
    }

    /* Start screen - white card */
    .start-screen {
      background: #ffffff;
      border: none;
    }
    .start-screen .intro-text {
      font-family: 'Bodoni Moda', serif;
      color: #333;
      margin-bottom: 32px;
      line-height: 1.9;
      font-size: 1.05rem;
    }
    .start-screen .intro-text p {
      margin-bottom: 16px;
    }
    .start-screen .intro-text p:last-child {
      margin-bottom: 0;
    }

    .btn-start {
      width: 100%;
      background: var(--coral);
      color: #fff;
      border: none;
      padding: 18px 36px;
      font-size: 1.1rem;
      font-weight: 400;
      font-family: 'Bodoni Moda', serif;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      letter-spacing: 0.02em;
    }
    .btn-start:hover {
      background: var(--coral-light);
      transform: translateY(-1px);
    }

    /* Form area */
    .form-area {
      display: none;
    }
    .form-area.active {
      display: block;
    }

    /* Current question */
    .current-question {
      background: #ffffff;
      border: none;
      border-radius: 16px;
      padding: 32px;
    }
    .question-label {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.2rem;
      font-weight: 400;
      color: #1a1a1a;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .answer-input {
      width: 100%;
      background: #f8f8f8;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      color: #1a1a1a;
      font-family: 'Bodoni Moda', serif;
      font-size: 1rem;
      min-height: 100px;
      resize: vertical;
      transition: border-color 0.2s;
      line-height: 1.7;
    }
    .answer-input:focus {
      outline: none;
      border-color: var(--coral);
      background: #ffffff;
    }
    .answer-input::placeholder {
      color: #888;
      font-style: italic;
    }

    .btn-next {
      width: 100%;
      background: var(--coral);
      color: #fff;
      border: none;
      padding: 16px 32px;
      font-size: 1rem;
      font-weight: 400;
      font-family: 'Bodoni Moda', serif;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 16px;
      transition: all 0.2s;
      letter-spacing: 0.02em;
    }
    .btn-next:hover:not(:disabled) {
      background: var(--coral-light);
      transform: translateY(-1px);
    }
    .btn-next:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Summary screen - white */
    .summary-screen {
      display: none;
      background: #ffffff;
      border: none;
    }
    .summary-screen.active {
      display: block;
    }
    .summary-screen h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      font-weight: 400;
      text-align: center;
      margin-bottom: 16px;
      color: #1a1a1a;
    }
    .body-text {
      font-family: 'Bodoni Moda', serif;
      color: #555;
      text-align: center;
      margin-bottom: 12px;
      line-height: 1.8;
    }
    .summary-content {
      margin: 32px 0;
      max-height: 400px;
      overflow-y: auto;
    }
    .summary-item {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid #e0e0e0;
    }
    .summary-item .q {
      font-family: 'Bodoni Moda', serif;
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 8px;
    }
    .summary-item .a {
      font-family: 'Bodoni Moda', serif;
      color: #1a1a1a;
      font-size: 1rem;
    }
    .btn-generate {
      width: 100%;
      background: var(--coral);
      color: #fff;
      border: none;
      padding: 18px 36px;
      font-size: 1.1rem;
      font-weight: 400;
      font-family: 'Bodoni Moda', serif;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      letter-spacing: 0.02em;
    }
    .btn-generate:hover {
      background: var(--coral-light);
      transform: translateY(-1px);
    }

    /* Result screen - white */
    .result-screen {
      display: none;
      background: #ffffff;
      border: none;
    }
    .result-screen.active {
      display: block;
    }
    .result-screen h2 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      font-weight: 400;
      text-align: center;
      margin-bottom: 24px;
      color: var(--coral);
    }
    .result-content {
      font-family: 'Bodoni Moda', serif;
      background: #f5f5f5;
      border-radius: 12px;
      padding: 24px;
      white-space: pre-wrap;
      line-height: 1.9;
      font-size: 1rem;
      color: #333;
      margin-bottom: 24px;
      border: 1px solid #e0e0e0;
    }
    .audio-player {
      background: #f8f8f8;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      text-align: center;
      border: 1px solid #e0e0e0;
    }
    .audio-player audio {
      width: 100%;
      margin-bottom: 16px;
    }
    .btn-download {
      display: inline-block;
      background: var(--coral);
      color: #fff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-family: 'Bodoni Moda', serif;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .btn-download:hover {
      background: var(--coral-light);
      transform: translateY(-1px);
    }
    .tag-us-cta {
      background: #f8f8f8;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .tag-us-title {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.1rem;
      font-weight: 400;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .tag-us-text {
      font-family: 'Bodoni Moda', serif;
      color: #666;
      font-size: 0.95rem;
      margin-bottom: 12px;
    }
    .tag-us-handle {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--coral);
      margin: 0;
    }
    .btn-restart {
      display: block;
      width: 100%;
      background: transparent;
      color: #666;
      border: 1px solid #ddd;
      padding: 14px 28px;
      font-size: 0.95rem;
      font-family: inherit;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-restart:hover {
      background: #f5f5f5;
      color: #333;
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
      <span class="badge">Holiday Favorite</span>
      <h1>Personalized Santa</h1>
      <p>A heartfelt audio experience crafted from your stories</p>
    </div>

    <!-- Start Screen -->
    <div id="startScreen" class="card start-screen">
      <div class="intro-text">
        <p>Answer a few questions about your child's year - their proud moments, growth, and what makes them special. We'll use your answers to create a personalized audio message from Santa.</p>
        <p>Takes about 5 minutes.</p>
      </div>
      <button class="btn-start" onclick="startSession()">Let's Begin Your<br>Personalization Experience</button>
    </div>

    <!-- Form Area -->
    <div id="formArea" class="form-area">
      <div id="progress" class="progress"></div>

      <div id="currentQuestion" class="current-question">
        <div id="questionLabel" class="question-label"></div>
        <textarea
          id="answerInput"
          class="answer-input"
          placeholder="Type your answer here..."
          onkeydown="handleKeyDown(event)"
        ></textarea>
        <button id="nextBtn" class="btn-next" onclick="submitAnswer()">Continue</button>
      </div>

      <div id="loadingQuestion" class="loading hidden">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- Summary Screen -->
    <div id="summaryScreen" class="card summary-screen">
      <h2>Ready to Create</h2>
      <p class="body-text">Review your answers below, then click Create to generate your personalized Santa message.</p>
      <div id="summaryContent" class="summary-content"></div>
      <button class="btn-generate" onclick="generateMessage()">Create Santa Message</button>
    </div>

    <!-- Result Screen -->
    <div id="resultScreen" class="card result-screen">
      <h2>Your Santa Message is Ready!</h2>

      <div id="audioPlayer" class="audio-player hidden">
        <audio id="audioElement" controls style="width: 100%;"></audio>
        <a id="downloadBtn" class="btn-download hidden" href="#" download="santa-message.mp3">Download Audio File</a>
      </div>

      <div id="resultContent" class="result-content"></div>

      <div class="tag-us-cta">
        <p class="tag-us-title">We'd love to see the reaction!</p>
        <p class="tag-us-text">Tag us in your reaction videos - we might share them!</p>
        <p class="tag-us-handle">@personalizedoutput</p>
      </div>

      <button class="btn-restart" onclick="restart()">Create Another Message</button>
    </div>

    <!-- Error Display -->
    <div id="errorDisplay" class="error hidden"></div>
  </div>

  <script>
    const API_BASE = '/api/thought-chat';
    const STORAGE_KEY = 'santa_session_progress';

    // Get token from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('token');

    let sessionId = null;
    let currentQuestion = '';
    let answers = [];
    let questionCount = 0;

    // Save progress to localStorage
    function saveProgress() {
      if (!sessionId) return;
      const progress = {
        sessionId,
        currentQuestion,
        answers,
        questionCount,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }

    // Clear saved progress
    function clearProgress() {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Check for saved progress on page load
    function checkSavedProgress() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      try {
        const progress = JSON.parse(saved);
        // Check if saved within last 2 hours
        const twoHours = 2 * 60 * 60 * 1000;
        if (Date.now() - progress.savedAt > twoHours) {
          clearProgress();
          return;
        }

        // Show resume prompt
        document.getElementById('startScreen').innerHTML = \`
          <div class="intro-text">
            <p><strong>Welcome back!</strong> You have a session in progress with \${progress.answers.length} answer(s) saved.</p>
          </div>
          <button class="btn-start" onclick="resumeSession()" style="margin-bottom: 12px;">Continue Where You Left Off</button>
          <button class="btn-restart" onclick="startFresh()">Start Fresh</button>
        \`;
      } catch (e) {
        clearProgress();
      }
    }

    // Resume saved session
    async function resumeSession() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        startSession();
        return;
      }

      try {
        const progress = JSON.parse(saved);

        // Verify session still exists on server
        const response = await fetch(\`\${API_BASE}/session/\${progress.sessionId}\`);
        if (!response.ok) {
          clearProgress();
          showError('Your saved session has expired. Starting fresh.');
          setTimeout(() => startSession(), 1500);
          return;
        }

        // Restore state
        sessionId = progress.sessionId;
        currentQuestion = progress.currentQuestion;
        answers = progress.answers;
        questionCount = progress.questionCount;

        // Show form
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('formArea').classList.add('active');
        displayQuestion();
        updateProgress();

      } catch (e) {
        clearProgress();
        startSession();
      }
    }

    // Start fresh (clear saved and begin new)
    function startFresh() {
      clearProgress();
      // Reset the start screen HTML
      document.getElementById('startScreen').innerHTML = \`
        <div class="intro-text">
          <p>Answer a few questions about your child's year - their proud moments, growth, and what makes them special. We'll use your answers to create a personalized audio message from Santa.</p>
          <p>Takes about 5 minutes.</p>
        </div>
        <button class="btn-start" onclick="startSession()">Let's Begin Your<br>Personalization Experience</button>
      \`;
      startSession();
    }

    // Check for saved progress when page loads
    checkSavedProgress();

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

        saveProgress(); // Save after starting

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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.sessionExpired) {
            showSessionExpiredError();
            return;
          }
          throw new Error(errorData.error || 'Failed to continue session');
        }

        const data = await response.json();

        if (data.status === 'ready_for_generation') {
          // Skip review - go straight to generation
          generateMessage();
          return;
        } else {
          currentQuestion = data.assistantMessage || data.message || '';
          questionCount++;
          saveProgress(); // Save after each answer
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
        console.log('[Santa] Generation response:', data);

        showLoading(false);
        document.getElementById('formArea').classList.remove('active');
        showResult(data);

      } catch (err) {
        showError(err.message);
        showLoading(false);
        document.getElementById('formArea').classList.remove('active');
      }
    }

    function showResult(data) {
      // API returns { script, audioUrl, ... } at top level
      const messageText = data.script || data.message || '';
      let audioUrl = data.audioUrl || null;

      console.log('[Santa] Showing result - script:', messageText?.substring(0, 50), 'audioUrl:', audioUrl);

      // Show the script text
      const resultContent = document.getElementById('resultContent');
      if (messageText) {
        resultContent.textContent = messageText;
        resultContent.style.display = 'block';
      } else {
        resultContent.style.display = 'none';
      }

      // Handle audio player and download
      const audioPlayer = document.getElementById('audioPlayer');
      const audioElement = document.getElementById('audioElement');
      const downloadBtn = document.getElementById('downloadBtn');

      if (audioUrl) {
        audioElement.src = audioUrl;
        audioPlayer.classList.remove('hidden');
        if (downloadBtn) {
          downloadBtn.href = audioUrl;
          downloadBtn.download = 'santa-message.mp3';
          downloadBtn.classList.remove('hidden');
        }
      } else {
        audioPlayer.classList.add('hidden');
        if (downloadBtn) downloadBtn.classList.add('hidden');
      }

      document.getElementById('resultScreen').classList.add('active');
      clearProgress();
    }

    function restart() {
      sessionId = null;
      currentQuestion = '';
      answers = [];
      questionCount = 0;
      clearProgress();

      document.getElementById('resultScreen').classList.remove('active');
      document.getElementById('summaryScreen').classList.remove('active');
      document.getElementById('formArea').classList.remove('active');
      document.getElementById('startScreen').style.display = 'block';
      document.getElementById('startScreen').innerHTML = \`
        <div class="intro-text">
          <p>Answer a few questions about your child's year - their proud moments, growth, and what makes them special. We'll use your answers to create a personalized audio message from Santa.</p>
          <p>Takes about 5 minutes.</p>
        </div>
        <button class="btn-start" onclick="startSession()">Let's Begin Your<br>Personalization Experience</button>
      \`;
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

    function showSessionExpiredError() {
      showLoading(false);
      document.getElementById('formArea').classList.remove('active');
      document.getElementById('errorDisplay').innerHTML = \`
        <div style="text-align: center;">
          <p style="margin-bottom: 16px;">Your session has expired. This can happen if you were away for a while or there was a brief server update.</p>
          <button onclick="window.location.reload()" style="background: var(--coral); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-family: inherit;">
            Start Fresh
          </button>
        </div>
      \`;
      document.getElementById('errorDisplay').classList.remove('hidden');
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
