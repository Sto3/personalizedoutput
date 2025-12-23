/**
 * Vision Board Form Page - Clean Light Theme
 *
 * The personalization experience for vision boards.
 * Features a clean white background with black text for readability.
 */

export function renderVisionBoardFormPage(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create Your Vision Board | Personalized Output</title>
  <meta name="description" content="Create a personalized vision board - a visual representation of your goals and the life you're building.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,700&family=Cormorant+SC:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-dark: #0a0a0f;
      --bg-card: #ffffff;
      --coral: #E85A4F;
      --coral-light: #F08B96;
      --text-primary: #1a1a1a;
      --text-secondary: #333333;
      --text-muted: #666666;
      --text-light: #F5EEF0;
      --border: #e0e0e0;
      --border-dark: rgba(255,255,255,0.12);
    }

    body {
      font-family: 'Bodoni Moda', Georgia, serif;
      background: var(--bg-dark);
      min-height: 100vh;
      color: var(--text-light);
      line-height: 1.7;
    }

    /* Header */
    .header {
      background: var(--bg-dark);
      border-bottom: 1px solid var(--border-dark);
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
      color: var(--text-light);
    }
    .page-title h1 em {
      font-style: italic;
      color: var(--coral);
    }
    .page-title p {
      font-family: 'Bodoni Moda', serif;
      color: rgba(245,238,240,0.7);
      font-size: 1.1rem;
      font-weight: 400;
    }

    /* Card styling */
    .card {
      background: var(--bg-card);
      border: none;
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 24px;
    }

    /* Start screen */
    .start-screen .intro-text {
      font-family: 'Bodoni Moda', serif;
      color: var(--text-primary);
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

    /* Order section (name input) */
    .order-section {
      margin-bottom: 24px;
    }
    .order-section label {
      display: block;
      font-family: 'Bodoni Moda', serif;
      color: var(--coral);
      font-size: 0.9rem;
      font-weight: 400;
      margin-bottom: 8px;
      letter-spacing: 0.03em;
    }
    .order-input {
      width: 100%;
      background: #f8f8f8;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      color: var(--text-primary);
      font-family: 'Bodoni Moda', serif;
      font-size: 1rem;
      transition: border-color 0.2s, background-color 0.2s;
    }
    .order-input:focus {
      outline: none;
      border-color: var(--coral);
      background: #ffffff;
    }
    .order-input::placeholder {
      color: #888;
      font-style: italic;
    }
    .order-hint {
      font-family: 'Bodoni Moda', serif;
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-top: 8px;
      font-style: italic;
    }

    .btn-start {
      width: 100%;
      background: var(--coral);
      color: #fff;
      border: none;
      padding: 18px 36px;
      font-size: 0.95rem;
      font-weight: 500;
      font-family: 'Bodoni Moda', serif;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 8px;
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
    .current-question-header {
      font-family: 'Bodoni Moda', serif;
      color: var(--coral);
      font-size: 0.85rem;
      font-weight: 400;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .current-question-hint {
      font-family: 'Bodoni Moda', serif;
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 16px;
      font-style: italic;
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
      font-weight: 400;
      text-align: center;
      margin-bottom: 24px;
      color: var(--coral);
    }
    .vision-board-image {
      width: 100%;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .result-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .btn-download {
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
      transition: all 0.2s;
      text-decoration: none;
      text-align: center;
      display: block;
    }
    .btn-download:hover {
      background: var(--coral-light);
      transform: translateY(-1px);
    }
    .result-note {
      font-family: 'Bodoni Moda', serif;
      color: #666;
      font-size: 0.95rem;
      font-style: italic;
      text-align: center;
      margin-bottom: 24px;
    }
    .btn-restart {
      display: block;
      width: 100%;
      background: transparent;
      color: #666;
      border: 1px solid #e0e0e0;
      padding: 14px 28px;
      font-size: 0.95rem;
      font-family: 'Bodoni Moda', serif;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-restart:hover {
      background: #f8f8f8;
      color: #1a1a1a;
      border-color: var(--coral);
    }

    /* Loading state */
    .loading {
      font-family: 'Bodoni Moda', serif;
      text-align: center;
      padding: 60px 40px;
      color: var(--text-light);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid #e0e0e0;
      border-top-color: var(--coral);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    .loading-message {
      font-size: 1.1rem;
      color: var(--text-light);
      margin-top: 16px;
      line-height: 1.6;
    }
    .loading-message strong {
      display: block;
      font-size: 1.25rem;
      color: var(--coral);
      margin-bottom: 8px;
    }
    .loading-message small {
      display: block;
      margin-top: 12px;
      font-size: 0.85rem;
      color: var(--text-muted);
      opacity: 0.8;
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
      background: #ddd;
      transition: all 0.3s;
    }
    .progress-dot.completed {
      background: var(--coral);
    }
    .progress-dot.current {
      background: var(--coral);
      box-shadow: 0 0 12px rgba(232, 90, 79, 0.4);
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
      <span class="badge">For Adults</span>
      <h1>Personalized Vision Board</h1>
      <p>A visual reflection of your authentic self</p>
    </div>

    <!-- Start Screen -->
    <div id="startScreen" class="card start-screen">
      <div class="intro-text">
        <p>Answer a few questions about your goals and vision. We'll create a personalized vision board based on your answers.</p>
        <p>Takes about 5 minutes.</p>
      </div>

      <div class="order-section" id="nameSection">
        <label for="firstNameInput">Your First Name</label>
        <input type="text" id="firstNameInput" class="order-input"
               placeholder="Enter your first name"
               maxlength="50" required>
      </div>

      <button class="btn-start" onclick="startSession()">Begin Personalization Experience</button>
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
        <div id="loadingMessage" class="loading-message"></div>
      </div>
    </div>

    <!-- Result Screen -->
    <div id="resultScreen" class="card result-screen">
      <h2>Your Vision Board is Ready</h2>
      <img id="visionBoardImage" class="vision-board-image" alt="Your Personalized Vision Board" />
      <div class="result-actions">
        <a id="downloadBtn" class="btn-download" download>Download Your Vision Board</a>
      </div>
      <p class="result-note">Print it, set it as your wallpaper, and display it where you'll see it daily.</p>
      <button class="btn-restart" onclick="restart()">Create Another Vision Board</button>
    </div>

    <!-- Error Display -->
    <div id="errorDisplay" class="error hidden"></div>
  </div>

  <script>
    const API_BASE = '/api/thought-chat';
    const STORAGE_KEY = 'visionboard_session_progress';

    let sessionId = null;
    let firstName = null;
    let currentQuestion = '';
    let answers = [];
    let questionCount = 0;

    // Save progress to localStorage
    function saveProgress() {
      if (!sessionId) return;
      const progress = {
        sessionId,
        firstName,
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
    async function checkSavedProgress() {
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

        // Verify session still exists on server
        const response = await fetch(\`\${API_BASE}/session/\${progress.sessionId}\`);
        if (!response.ok) {
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
        location.reload();
        return;
      }

      try {
        const progress = JSON.parse(saved);

        const response = await fetch(\`\${API_BASE}/session/\${progress.sessionId}\`);
        if (!response.ok) {
          clearProgress();
          location.reload();
          return;
        }

        sessionId = progress.sessionId;
        firstName = progress.firstName;
        currentQuestion = progress.currentQuestion;
        answers = progress.answers;
        questionCount = progress.questionCount;

        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('formArea').classList.add('active');
        displayQuestion();
        updateProgress();

      } catch (e) {
        clearProgress();
        location.reload();
      }
    }

    // Start fresh
    function startFresh() {
      clearProgress();
      location.reload();
    }

    // Check for saved progress when page loads
    checkSavedProgress().catch(() => clearProgress());

    async function startSession() {
      const nameInput = document.getElementById('firstNameInput');
      firstName = nameInput.value.trim();

      if (!firstName || firstName.length < 1) {
        showError('Please enter your first name');
        return;
      }

      hideError();
      document.getElementById('startScreen').style.display = 'none';
      document.getElementById('formArea').classList.add('active');
      showLoading(true);

      try {
        const response = await fetch(\`\${API_BASE}/start\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: 'vision_board' })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to start session');
        }

        const data = await response.json();
        sessionId = data.sessionId;
        currentQuestion = data.firstAssistantMessage || data.message || '';
        questionCount = 1;

        saveProgress();

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
      const maxDots = 7;

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
      saveProgress();

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
          // Skip summary, go straight to generation
          generateMessage();
        } else {
          currentQuestion = data.assistantMessage || data.message || '';
          questionCount++;
          saveProgress();
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

    async function generateMessage() {
      hideError();
      document.getElementById('formArea').classList.add('active');

      const generatingMessage = \`
        <strong>Creating Your Vision Board</strong>
        We're generating 12 unique images just for you.<br>
        This typically takes 2-3 minutes.
        <small>Please don't refresh or close this page.</small>
      \`;
      showLoading(true, generatingMessage);

      try {
        const response = await fetch(\`\${API_BASE}/generate\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, firstName })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate vision board. Please try again.');
        }

        const data = await response.json();

        clearProgress(); // Clear progress after successful generation
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
      console.log('[VisionBoard] Result data:', data);
      const imageUrl = data.imageUrl;

      if (imageUrl) {
        console.log('[VisionBoard] Image URL:', imageUrl);
        // Display the vision board image
        const img = document.getElementById('visionBoardImage');
        img.onerror = function() {
          console.error('[VisionBoard] Failed to load image:', imageUrl);
          img.style.display = 'none';
          document.getElementById('resultScreen').querySelector('h2').textContent = 'Generation In Progress';
          document.querySelector('.result-note').textContent = 'Your vision board is being created. This may take a few minutes. Please check back or refresh the page.';
        };
        img.onload = function() {
          console.log('[VisionBoard] Image loaded successfully');
        };
        img.src = imageUrl;
        img.alt = firstName ? \`\${firstName}'s Vision Board\` : 'Your Vision Board';

        // Set up download button
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.href = imageUrl;
        downloadBtn.download = firstName ? \`\${firstName}_vision_board.png\` : 'vision_board.png';
      } else {
        console.error('[VisionBoard] No imageUrl in response');
        // Show error state
        document.getElementById('visionBoardImage').style.display = 'none';
        document.getElementById('resultScreen').querySelector('h2').textContent = 'Something Went Wrong';
        document.querySelector('.result-note').textContent = 'We couldn\\'t generate your vision board. Please try again or contact support.';
      }

      document.getElementById('resultScreen').classList.add('active');
    }

    function restart() {
      clearProgress();
      sessionId = null;
      firstName = null;
      currentQuestion = '';
      answers = [];
      questionCount = 0;

      document.getElementById('resultScreen').classList.remove('active');
      document.getElementById('formArea').classList.remove('active');
      document.getElementById('startScreen').style.display = 'block';
      hideError();
    }

    function showLoading(show, message = '') {
      document.getElementById('loadingQuestion').classList.toggle('hidden', !show);
      document.getElementById('nextBtn').disabled = show;
      document.getElementById('loadingMessage').innerHTML = message;
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
