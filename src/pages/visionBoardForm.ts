/**
 * Vision Board Form Page - Premium Dark Theme
 *
 * The personalization experience for vision boards.
 * Features the dark premium theme matching the homepage.
 */

export function renderVisionBoardFormPage(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create Your Vision Board | Personalized Output</title>
  <meta name="description" content="Create a personalized vision board that reflects your authentic dreams and goals.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,700&family=Cormorant+SC:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-dark: #1a1a2e;
      --bg-purple: #2d1b4e;
      --bg-card: rgba(255,255,255,0.08);
      --bg-card-hover: rgba(255,255,255,0.12);
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --purple: #7C3AED;
      --purple-light: #A78BFA;
      --navy: #1a1a2e;
      --text-primary: #ffffff;
      --text-secondary: rgba(255,255,255,0.7);
      --text-muted: rgba(255,255,255,0.5);
      --border: rgba(255,255,255,0.15);
      --border-focus: rgba(124, 58, 237, 0.7);
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-purple) 50%, var(--bg-dark) 100%);
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
      background: linear-gradient(135deg, var(--purple), var(--coral));
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
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      backdrop-filter: blur(10px);
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

    /* Order section (name + order ID inputs) */
    .order-section {
      margin-bottom: 24px;
    }
    .order-section label {
      display: block;
      color: var(--purple-light);
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .order-input {
      width: 100%;
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 1rem;
      transition: border-color 0.2s, background-color 0.2s;
    }
    .order-input:focus {
      outline: none;
      border-color: var(--border-focus);
      background: rgba(255,255,255,0.12);
    }
    .order-input::placeholder {
      color: var(--text-muted);
    }
    .order-hint {
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-top: 8px;
      font-style: italic;
    }

    .btn-start {
      width: 100%;
      background: linear-gradient(135deg, var(--purple), var(--purple-light));
      color: #fff;
      border: none;
      padding: 18px 36px;
      font-size: 1.1rem;
      font-weight: 600;
      font-family: inherit;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
      margin-top: 8px;
    }
    .btn-start:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(124, 58, 237, 0.4);
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
      font-family: 'Cormorant SC', serif;
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
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 1rem;
      min-height: 120px;
      resize: vertical;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .answer-input:focus {
      outline: none;
      border-color: var(--purple);
      background: rgba(255,255,255,0.12);
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.3);
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
      color: var(--purple-light);
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
      border-top-color: var(--purple);
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
      <span class="badge">For Adults</span>
      <h1>Personalized Vision Board</h1>
      <p>A visual reflection of your authentic self</p>
    </div>

    <!-- Start Screen -->
    <div id="startScreen" class="card start-screen">
      <div class="intro-text">
        <p>Your vision board should be more than pretty pictures - it should reflect YOUR authentic dreams, not what you think you "should" want.</p>
        <p>This guided reflection helps you clarify what you truly want to manifest, what feeling you're seeking, and what aesthetic speaks to the person you're becoming.</p>
      </div>

      <div class="order-section" id="nameSection">
        <label for="firstNameInput">Your First Name</label>
        <input type="text" id="firstNameInput" class="order-input"
               placeholder="Enter your first name"
               maxlength="50" required>
        <p class="order-hint">Your vision board will be personalized with your name</p>
      </div>

      <button class="btn-start" onclick="startSession()">Begin Personalization Experience</button>
    </div>

    <!-- Form Area -->
    <div id="formArea" class="form-area">
      <div id="progress" class="progress"></div>

      <div id="previousAnswers" class="previous-answers">
        <h3>What You've Shared</h3>
        <p class="helper-text">Your vision is taking shape. As you go, you'll see your earlier answers here.</p>
        <div id="answersList"></div>
      </div>

      <div id="currentQuestion" class="current-question">
        <div class="current-question-header">Current Question</div>
        <div class="current-question-hint">Share as much or as little as feels right.</div>
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
        <p>Reflecting on your vision...</p>
      </div>
    </div>

    <!-- Summary Screen -->
    <div id="summaryScreen" class="card summary-screen">
      <h2>Your Vision is Taking Shape</h2>
      <p class="body-text">You've just clarified what you want to manifest - the goals, the feelings, and the aesthetic that speaks to you.</p>
      <p class="body-text">When you click below, we'll use what you've shared to create a personalized vision board that reflects your unique dreams.</p>
      <div id="summaryContent" class="summary-content"></div>
      <button class="btn-generate" onclick="generateMessage()">Create My Vision Board</button>
    </div>

    <!-- Result Screen -->
    <div id="resultScreen" class="card result-screen">
      <h2>Your Vision Board is Ready</h2>
      <div id="resultContent" class="result-content"></div>
      <p class="result-note">Your personalized vision board has been generated. Download it, print it, and display it where you'll see it daily.</p>
      <button class="btn-restart" onclick="restart()">Create Another Vision Board</button>
    </div>

    <!-- Error Display -->
    <div id="errorDisplay" class="error hidden"></div>
  </div>

  <script>
    const API_BASE = '/api/thought-chat';

    let sessionId = null;
    let firstName = null;
    let currentQuestion = '';
    let answers = [];
    let questionCount = 0;

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
        const response = await fetch(\`\${API_BASE}/generate\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, firstName })
        });

        if (!response.ok) throw new Error('Failed to generate vision board');

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
      let content = '';

      if (typeof output === 'string') {
        content = output;
      } else if (typeof output === 'object') {
        if (output.imagePath) {
          content = \`Your personalized vision board has been created!\\n\\nImage: \${output.imagePath}\\n\\n\`;
          if (output.oneWord) content += \`Theme: \${output.oneWord}\\n\`;
          if (output.goals) content += \`Goals: \${output.goals.join(', ')}\\n\`;
          if (output.aesthetic) content += \`Aesthetic: \${output.aesthetic}\`;
        } else if (output.summary) {
          content = output.summary;
        } else {
          content = JSON.stringify(output, null, 2);
        }
      }

      document.getElementById('resultContent').textContent = content;
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
