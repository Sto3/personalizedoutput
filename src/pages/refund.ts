/**
 * Refund Request Page
 *
 * Allows customers to request a refund with no questions asked.
 * Processes refunds automatically via Stripe.
 */

export function renderRefundPage(orderId?: string, email?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Refund - Personalized Output</title>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --coral: #E85A6B;
      --coral-light: #F08B96;
      --purple: #7C3AED;
      --navy: #1a1a2e;
    }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: linear-gradient(135deg, var(--navy) 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 20px;
    }

    .container {
      width: 100%;
      max-width: 500px;
    }

    .card {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 48px 40px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .logo {
      text-align: center;
      font-family: 'Bodoni Moda', serif;
      font-size: 1.5rem;
      font-weight: 500;
      margin-bottom: 32px;
    }

    h1 {
      font-family: 'Bodoni Moda', serif;
      font-size: 1.75rem;
      font-weight: 500;
      text-align: center;
      margin-bottom: 16px;
    }

    .subtitle {
      text-align: center;
      color: rgba(255,255,255,0.7);
      margin-bottom: 32px;
      line-height: 1.6;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 8px;
      color: rgba(255,255,255,0.85);
    }

    input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      background: rgba(0,0,0,0.2);
      color: #fff;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input:focus {
      outline: none;
      border-color: var(--coral);
      box-shadow: 0 0 0 3px rgba(232, 90, 107, 0.2);
    }

    input::placeholder {
      color: rgba(255,255,255,0.4);
    }

    .btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: var(--coral);
      color: #fff;
      margin-top: 8px;
    }

    .btn:hover {
      background: var(--coral-light);
      transform: translateY(-2px);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .message {
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 24px;
      text-align: center;
    }

    .message.error {
      background: rgba(232, 90, 107, 0.2);
      border: 1px solid var(--coral);
    }

    .message.success {
      background: rgba(74, 222, 128, 0.15);
      border: 1px solid #4ade80;
    }

    .back-link {
      display: block;
      text-align: center;
      margin-top: 24px;
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .back-link:hover { color: #fff; }

    .note {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.5);
      text-align: center;
      margin-top: 20px;
      line-height: 1.5;
    }

    #resultArea {
      display: none;
    }

    #resultArea.show {
      display: block;
    }

    .success-icon {
      font-size: 48px;
      text-align: center;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Personalized Output</div>

      <div id="formArea">
        <h1>Request a Refund</h1>
        <p class="subtitle">No questions asked. We'll process your refund immediately.</p>

        <div id="errorMessage" class="message error" style="display: none;"></div>

        <form id="refundForm">
          <div class="form-group">
            <label for="orderId">Order ID</label>
            <input type="text" id="orderId" name="orderId" placeholder="e.g., abc123..." value="${orderId || ''}" required>
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="The email you used for purchase" value="${email || ''}" required>
          </div>

          <button type="submit" class="btn" id="submitBtn">Request Refund</button>
        </form>

        <p class="note">Refunds are typically processed within 5-10 business days and will appear on your original payment method.</p>
      </div>

      <div id="resultArea">
        <div class="success-icon">✓</div>
        <h1>Refund Processed</h1>
        <p class="subtitle" id="resultMessage">Your refund has been submitted. You'll receive a confirmation email shortly.</p>
      </div>
    </div>

    <a href="/" class="back-link">← Back to home</a>
  </div>

  <script>
    const form = document.getElementById('refundForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const formArea = document.getElementById('formArea');
    const resultArea = document.getElementById('resultArea');
    const resultMessage = document.getElementById('resultMessage');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const orderId = document.getElementById('orderId').value.trim();
      const email = document.getElementById('email').value.trim();

      if (!orderId || !email) {
        showError('Please fill in all fields');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      errorMessage.style.display = 'none';

      try {
        const response = await fetch('/api/refund/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, email })
        });

        const data = await response.json();

        if (data.success) {
          formArea.style.display = 'none';
          resultArea.classList.add('show');
          resultMessage.textContent = data.message || 'Your refund has been processed. You\\'ll see it on your statement within 5-10 business days.';
        } else {
          showError(data.error || 'Unable to process refund. Please contact support.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Request Refund';
        }
      } catch (err) {
        showError('Connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Refund';
      }
    });

    function showError(msg) {
      errorMessage.textContent = msg;
      errorMessage.style.display = 'block';
    }
  </script>
</body>
</html>
  `;
}
