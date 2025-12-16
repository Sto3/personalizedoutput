/**
 * AI-Powered Email Triage Service
 *
 * Uses Claude API to automatically categorize and respond to incoming emails.
 * Requires Resend inbound email webhook to be configured.
 *
 * Categories:
 * - product_question: Questions about products
 * - order_issue: Problems with orders
 * - general_inquiry: General questions
 * - complaint: Complaints (URGENT - escalate immediately)
 * - spam: Spam/irrelevant emails
 * - threatening: Threats, harassment, hate speech (AUTO-ARCHIVED, not forwarded)
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'hello@personalizedoutput.com';

// ============================================================
// TYPES
// ============================================================

export type EmailCategory =
  | 'product_question'
  | 'order_issue'
  | 'general_inquiry'
  | 'complaint'
  | 'spam'
  | 'threatening';

export interface IncomingEmail {
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

export interface TriageResult {
  category: EmailCategory;
  confidence: number;
  summary: string;
  suggestedResponse?: string;
  isUrgent: boolean;
  shouldForwardToOwner: boolean;
}

// ============================================================
// AUTO-RESPONSE TEMPLATES
// ============================================================

const AUTO_RESPONSES: Partial<Record<EmailCategory, string>> = {
  product_question: `Hi there,

Thank you for reaching out about our products!

Here are some quick answers to common questions:

**Vision Boards:** Personalized digital vision boards created with AI imagery based on YOUR specific goals. Delivered as high-res PNG files ready to print.

**Santa Messages:** Personalized audio messages from Santa that mention your child by name, their accomplishments, and their wishes. 2-3 minute MP3 files.

**Learning Sessions:** 30-minute personalized audio (or video) lessons that use your child's interests to teach any topic.

**Thought Organizer:** A guided experience that helps you process complex life situations and gain clarity.

If you have a specific question, just reply and a human will get back to you within 24 hours.

Best,
The Personalized Output Team
https://personalizedoutput.com`,

  order_issue: `Hi there,

I'm sorry to hear you're having an issue with your order!

Please reply with your order ID or the email you used for the purchase, and we'll look into it right away.

Common issues we can help with:
- Download links not working
- Didn't receive your product
- Need a modification
- Want a refund

A human will respond within 24 hours (usually much sooner).

Best,
The Personalized Output Team`,

  general_inquiry: `Hi there,

Thanks for reaching out to Personalized Output!

We've received your message and will get back to you within 24-48 hours.

In the meantime, you might find these helpful:
- Products: https://personalizedoutput.com/products
- How It Works: https://personalizedoutput.com/how-it-works
- Pricing: https://personalizedoutput.com/pricing

Best,
The Personalized Output Team`,
};

// ============================================================
// TRIAGE LOGIC
// ============================================================

/**
 * Categorize an incoming email using Claude
 */
export async function triageEmail(email: IncomingEmail): Promise<TriageResult> {
  if (!ANTHROPIC_API_KEY) {
    console.error('[EmailTriage] Anthropic API key not configured');
    return {
      category: 'general_inquiry',
      confidence: 0,
      summary: 'Could not categorize - API key missing',
      isUrgent: false,
      shouldForwardToOwner: true,
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are an email triage system for Personalized Output, a company that sells personalized digital products (vision boards, Santa messages, learning sessions, thought organizers).

Categorize this incoming email and provide a brief summary.

FROM: ${email.from}
SUBJECT: ${email.subject}
BODY:
${email.body.substring(0, 2000)}

Respond with JSON only:
{
  "category": "product_question" | "order_issue" | "general_inquiry" | "complaint" | "spam" | "threatening",
  "confidence": 0.0-1.0,
  "summary": "Brief 1-sentence summary of what they need (for threatening emails, just say 'Threatening content detected')",
  "isUrgent": true/false,
  "suggestedResponse": "Optional suggested response if you can answer their question"
}

IMPORTANT:
- "complaint" should be marked urgent
- "order_issue" with words like "urgent", "angry", "frustrated" should be urgent
- "spam" should NOT be forwarded to owner
- "threatening" = emails with threats, harassment, hate speech, violent language, or abusive content
  - These should NOT be forwarded to owner
  - Do NOT include any content from threatening emails in the summary
  - Just categorize and move on
- All other emails should be forwarded to owner for visibility`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as { content: Array<{ text: string }> };
    const text = data.content[0]?.text || '{}';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const result = JSON.parse(jsonMatch[0]) as {
      category: EmailCategory;
      confidence: number;
      summary: string;
      isUrgent: boolean;
      suggestedResponse?: string;
    };

    // Never forward spam or threatening emails to owner
    const shouldForward = result.category !== 'spam' && result.category !== 'threatening';

    return {
      ...result,
      shouldForwardToOwner: shouldForward,
    };

  } catch (error) {
    console.error('[EmailTriage] Error:', error);
    // Default to forwarding to owner if triage fails
    return {
      category: 'general_inquiry',
      confidence: 0,
      summary: 'Triage failed - requires manual review',
      isUrgent: false,
      shouldForwardToOwner: true,
    };
  }
}

/**
 * Log threatening email metadata (without content) for records
 */
function logThreateningEmail(email: IncomingEmail): void {
  // Log only metadata, never the content
  const logEntry = {
    timestamp: new Date().toISOString(),
    from: email.from,
    receivedAt: email.receivedAt.toISOString(),
    action: 'auto_archived_threatening',
    // DO NOT log subject or body content
  };
  console.log('[EmailTriage] THREATENING EMAIL ARCHIVED:', JSON.stringify(logEntry));
  // Could also write to a secure log file if needed for legal records
}

/**
 * Process an incoming email: triage, auto-respond if possible, forward to owner
 */
export async function processIncomingEmail(email: IncomingEmail): Promise<{
  triageResult: TriageResult;
  autoResponded: boolean;
  forwardedToOwner: boolean;
}> {
  console.log(`[EmailTriage] Processing email from ${email.from}`);

  // Step 1: Triage the email
  const triageResult = await triageEmail(email);

  // Step 1.5: Handle threatening emails immediately - archive and exit
  if (triageResult.category === 'threatening') {
    logThreateningEmail(email);
    return {
      triageResult,
      autoResponded: false,
      forwardedToOwner: false,
    };
  }

  console.log(`[EmailTriage] Category: ${triageResult.category} (${(triageResult.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`[EmailTriage] Summary: ${triageResult.summary}`);

  let autoResponded = false;
  let forwardedToOwner = false;

  // Step 2: Auto-respond if we have a template and confidence is high
  if (triageResult.confidence >= 0.7 && AUTO_RESPONSES[triageResult.category]) {
    // Would send auto-response here using Resend
    console.log(`[EmailTriage] Auto-responding with ${triageResult.category} template`);
    autoResponded = true;
    // await sendAutoResponse(email.from, AUTO_RESPONSES[triageResult.category]!);
  }

  // Step 3: Forward to owner if needed
  if (triageResult.shouldForwardToOwner) {
    // Would forward email to owner here
    console.log(`[EmailTriage] Forwarding to owner: ${OWNER_EMAIL}`);
    forwardedToOwner = true;
    // await forwardToOwner(email, triageResult);
  }

  // Step 4: Alert immediately if urgent
  if (triageResult.isUrgent) {
    console.log(`[EmailTriage] URGENT EMAIL - Sending immediate alert`);
    // await sendUrgentAlert(email, triageResult);
  }

  return {
    triageResult,
    autoResponded,
    forwardedToOwner,
  };
}

/**
 * Webhook handler for Resend inbound emails
 * Set up webhook URL: POST /api/email/inbound
 */
export async function handleInboundWebhook(payload: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const email: IncomingEmail = {
    from: payload.from,
    subject: payload.subject,
    body: payload.text || '',
    receivedAt: new Date(),
  };

  await processIncomingEmail(email);
}

// Export for route setup
export { AUTO_RESPONSES };
