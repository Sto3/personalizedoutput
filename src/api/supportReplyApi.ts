/**
 * Support Reply API
 *
 * Allows sending emails FROM support@personalizedoutput.com
 * while receiving to your personal inbox.
 *
 * Use case: Reply to customer emails professionally without
 * exposing your personal email.
 */

import { Router, Request, Response } from 'express';

const router = Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPPORT_EMAIL = 'support@personalizedoutput.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-this-secret';

interface SendReplyRequest {
  to: string;
  subject: string;
  body: string;
  secret: string;
}

/**
 * Send an email reply from support@personalizedoutput.com
 *
 * POST /api/support/reply
 * Body: { to, subject, body, secret }
 */
router.post('/reply', async (req: Request, res: Response) => {
  const { to, subject, body, secret } = req.body as SendReplyRequest;

  // Validate admin secret
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate inputs
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
  }

  // Validate email format
  if (!to.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Resend API key not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Personalized Output Support <${SUPPORT_EMAIL}>`,
        to: [to],
        subject: subject,
        html: formatEmailHtml(body),
        text: body
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[SupportReply] Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    const result = await response.json() as { id: string };
    console.log(`[SupportReply] Email sent to ${to}: ${subject}`);

    return res.json({
      success: true,
      messageId: result.id,
      message: `Email sent to ${to}`
    });

  } catch (error) {
    console.error('[SupportReply] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Format plain text into nice HTML email
 */
function formatEmailHtml(text: string): string {
  const paragraphs = text.split('\n\n').map(p => `<p style="margin: 0 0 16px; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background: #f9fafb; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Personalized Output Support</strong><br>
                <a href="https://personalizedoutput.com" style="color: #7C3AED;">personalizedoutput.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Simple admin page for sending support emails
 *
 * GET /api/support/compose
 */
router.get('/compose', (req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Email Composer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: white;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { margin-bottom: 2rem; color: #a8edea; }
    form { background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 12px; }
    label { display: block; margin-bottom: 0.5rem; color: #a8edea; font-size: 0.9rem; }
    input, textarea {
      width: 100%;
      padding: 12px;
      margin-bottom: 1.5rem;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: white;
      font-size: 1rem;
    }
    textarea { min-height: 200px; resize: vertical; }
    button {
      background: linear-gradient(135deg, #7C3AED, #E85A6B);
      color: white;
      border: none;
      padding: 14px 32px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 50px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover { transform: translateY(-2px); }
    .result { margin-top: 1.5rem; padding: 1rem; border-radius: 8px; }
    .success { background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; }
    .error { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Support Email Composer</h1>
    <form id="emailForm">
      <label for="secret">Admin Secret</label>
      <input type="password" id="secret" name="secret" required placeholder="Enter admin secret">

      <label for="to">To (Customer Email)</label>
      <input type="email" id="to" name="to" required placeholder="customer@example.com">

      <label for="subject">Subject</label>
      <input type="text" id="subject" name="subject" required placeholder="Re: Your order question">

      <label for="body">Message</label>
      <textarea id="body" name="body" required placeholder="Hi there,

Thanks for reaching out...

Best,
The Personalized Output Team"></textarea>

      <button type="submit">Send Email</button>
    </form>
    <div id="result"></div>
  </div>

  <script>
    document.getElementById('emailForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = document.getElementById('result');
      result.innerHTML = '<p>Sending...</p>';
      result.className = 'result';

      const formData = new FormData(e.target);
      const data = {
        secret: formData.get('secret'),
        to: formData.get('to'),
        subject: formData.get('subject'),
        body: formData.get('body')
      };

      try {
        const res = await fetch('/api/support/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const json = await res.json();

        if (res.ok) {
          result.innerHTML = '<p>Email sent successfully!</p>';
          result.className = 'result success';
          e.target.reset();
        } else {
          result.innerHTML = '<p>Error: ' + (json.error || 'Unknown error') + '</p>';
          result.className = 'result error';
        }
      } catch (err) {
        result.innerHTML = '<p>Error: ' + err.message + '</p>';
        result.className = 'result error';
      }
    });
  </script>
</body>
</html>`;

  res.send(html);
});

export default router;
