/**
 * Email Marketing Service using Resend
 * Handles welcome emails, post-purchase emails, and transactional emails
 *
 * Brand Colors:
 * - Dark background: #1a0a1a
 * - Coral CTA: #E85A4F
 * - Purple accent: #7C3AED
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://personalizedoutput.com';
const FROM_EMAIL = 'Personalized Output <hello@personalizedoutput.com>';

// Brand colors
const COLORS = {
  darkBg: '#1a0a1a',
  cardBg: '#2d1a2d',
  coral: '#E85A4F',
  coralLight: '#F08B96',
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  cream: '#FFF8E7',
  textMuted: 'rgba(255,255,255,0.6)',
};

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send email via Resend API
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.log('[Email] Resend API key not configured, skipping email');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        text: text || subject
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Email] Failed to send:', error);
      return { success: false, error };
    }

    const result = await response.json() as { id: string };
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return { success: true, id: result.id };

  } catch (error) {
    console.error('[Email] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Base email template wrapper with dark branding
 */
function wrapEmailTemplate(content: string, showUnsubscribe: boolean = true): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.darkBg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background: ${COLORS.cardBg}; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 30px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: ${COLORS.cream};">
                Personalized<span style="color: ${COLORS.purple};">Output</span>
              </h1>
            </td>
          </tr>

          ${content}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              ${showUnsubscribe ? `
              <p style="margin: 0 0 8px; font-size: 12px; color: ${COLORS.textMuted};">
                You're receiving this because you signed up for updates.
              </p>
              <p style="margin: 0 0 16px; font-size: 12px;">
                <a href="${SITE_URL}/unsubscribe" style="color: ${COLORS.coral}; text-decoration: none;">Unsubscribe</a>
              </p>
              ` : ''}
              <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.3);">
                &copy; ${new Date().getFullYear()} Personalized Output
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
 * Welcome email for new subscribers
 */
export async function sendWelcomeEmail(
  email: string,
  name: string = 'there'
): Promise<EmailResult> {
  const subject = 'Welcome to Personalized Output!';

  const content = `
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; font-size: 20px; color: ${COLORS.cream};">Hey ${name}!</p>

              <p style="margin: 0 0 20px; font-size: 16px; color: ${COLORS.textMuted}; line-height: 1.6;">
                Welcome to the community! At Personalized Output, we believe every gift should feel uniquely made for the person receiving it.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; color: ${COLORS.textMuted}; line-height: 1.6;">
                Here's what you can create:
              </p>

              <!-- Product Cards -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px; background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 12px;">
                    <strong style="color: ${COLORS.purpleLight};">Vision Boards</strong>
                    <p style="margin: 6px 0 0; color: ${COLORS.textMuted}; font-size: 14px;">AI-generated images to visualize your goals</p>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background: rgba(232, 90, 79, 0.1); border: 1px solid rgba(232, 90, 79, 0.2); border-radius: 12px;">
                    <strong style="color: ${COLORS.coralLight};">Thought Organizer</strong>
                    <p style="margin: 6px 0 0; color: ${COLORS.textMuted}; font-size: 14px;">Deep reflection planners built for how YOU think</p>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background: rgba(255, 248, 231, 0.05); border: 1px solid rgba(255, 248, 231, 0.1); border-radius: 12px;">
                    <strong style="color: ${COLORS.cream};">Santa Messages</strong>
                    <p style="margin: 6px 0 0; color: ${COLORS.textMuted}; font-size: 14px;">Personalized audio messages from Santa himself</p>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${SITE_URL}" style="display: inline-block; background: ${COLORS.coral}; color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                  Start Creating
                </a>
              </div>

              <p style="margin: 24px 0 0; font-size: 14px; color: ${COLORS.textMuted}; text-align: center;">
                Questions? Just reply to this email - we're here to help!
              </p>
            </td>
          </tr>`;

  return sendEmail(email, subject, wrapEmailTemplate(content));
}

/**
 * Post-purchase thank you email
 */
export async function sendPurchaseConfirmation(
  email: string,
  productName: string,
  orderDetails: {
    orderId: string;
    amount: number;
    accessUrl?: string;
  }
): Promise<EmailResult> {
  const subject = `Order Confirmed - ${productName}`;

  const content = `
          <!-- Success Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.purple} 0%, #5B21B6 100%); padding: 32px 30px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 8px;">&#10003;</div>
              <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">Order Confirmed!</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; font-size: 18px; color: ${COLORS.cream};">Your order is being prepared!</p>

              <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="color: ${COLORS.textMuted}; padding: 10px 0; font-size: 14px;">Order ID</td>
                    <td style="color: ${COLORS.cream}; font-weight: 600; text-align: right; font-size: 14px;">${orderDetails.orderId}</td>
                  </tr>
                  <tr>
                    <td style="color: ${COLORS.textMuted}; padding: 10px 0; font-size: 14px;">Product</td>
                    <td style="color: ${COLORS.cream}; font-weight: 600; text-align: right; font-size: 14px;">${productName}</td>
                  </tr>
                  <tr>
                    <td style="color: ${COLORS.textMuted}; padding: 10px 0; font-size: 14px;">Total</td>
                    <td style="color: ${COLORS.coral}; font-weight: 700; text-align: right; font-size: 20px;">$${(orderDetails.amount / 100).toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              ${orderDetails.accessUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${orderDetails.accessUrl}" style="display: inline-block; background: ${COLORS.coral}; color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                  Access Your ${productName}
                </a>
              </div>
              ` : ''}

              <p style="margin: 24px 0 0; font-size: 14px; color: ${COLORS.textMuted}; line-height: 1.6;">
                <strong style="color: ${COLORS.cream};">What happens next?</strong><br>
                You'll receive another email with your personalized content once it's ready. This usually takes just a few minutes!
              </p>
            </td>
          </tr>`;

  return sendEmail(email, subject, wrapEmailTemplate(content, false));
}

/**
 * Referral reward notification
 */
export async function sendReferralRewardEmail(
  email: string,
  rewardsCount: number,
  referralCode: string
): Promise<EmailResult> {
  const subject = `You earned ${rewardsCount} free month${rewardsCount > 1 ? 's' : ''}!`;

  const content = `
          <!-- Celebration Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.coral} 0%, ${COLORS.purple} 100%); padding: 32px 30px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 8px;">&#127881;</div>
              <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">Congratulations!</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 24px; font-size: 18px; color: ${COLORS.cream};">
                Your friends signed up, and you're being rewarded!
              </p>

              <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(232, 90, 79, 0.2) 100%); border-radius: 16px; padding: 32px; margin: 24px 0;">
                <p style="font-size: 56px; font-weight: 700; color: ${COLORS.coral}; margin: 0;">${rewardsCount}</p>
                <p style="font-size: 18px; color: ${COLORS.cream}; margin: 12px 0 0;">Free Month${rewardsCount > 1 ? 's' : ''} Earned!</p>
              </div>

              <p style="margin: 24px 0; font-size: 16px; color: ${COLORS.textMuted}; line-height: 1.6;">
                Your next ${rewardsCount} billing cycle${rewardsCount > 1 ? 's' : ''} will be automatically skipped.<br>
                Keep sharing your code to earn more!
              </p>

              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px; font-size: 12px; color: ${COLORS.textMuted};">Your Referral Code</p>
                <p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: ${COLORS.cream};">${referralCode}</p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${SITE_URL}/referrals" style="display: inline-block; background: ${COLORS.coral}; color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                  View Your Rewards
                </a>
              </div>
            </td>
          </tr>`;

  return sendEmail(email, subject, wrapEmailTemplate(content, false));
}

/**
 * Product delivery email (when personalized content is ready)
 */
export async function sendProductDeliveryEmail(
  email: string,
  productName: string,
  downloadUrl: string
): Promise<EmailResult> {
  const subject = `Your ${productName} is ready!`;

  const content = `
          <!-- Ready Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.coral} 0%, ${COLORS.coralLight} 100%); padding: 32px 30px; text-align: center;">
              <div style="font-size: 40px; margin-bottom: 8px;">&#10024;</div>
              <h2 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">Your ${productName} is Ready!</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 32px; font-size: 18px; color: ${COLORS.cream};">
                Great news! Your personalized ${productName} has been created and is ready for you.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${downloadUrl}" style="display: inline-block; background: ${COLORS.coral}; color: white; text-decoration: none; padding: 20px 50px; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 20px rgba(232, 90, 79, 0.3);">
                  View / Download
                </a>
              </div>

              <p style="margin: 32px 0 0; font-size: 14px; color: ${COLORS.textMuted}; line-height: 1.6;">
                This link will expire in 7 days. Make sure to download your content before then!
              </p>

              <!-- Tag Us CTA -->
              <div style="margin-top: 32px; padding: 24px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(232, 90, 79, 0.15) 100%); border-radius: 16px; border: 1px solid rgba(124, 58, 237, 0.3);">
                <p style="margin: 0 0 8px; font-size: 18px; color: ${COLORS.cream}; font-weight: 600;">
                  We'd love to see the reaction!
                </p>
                <p style="margin: 0 0 16px; font-size: 15px; color: ${COLORS.textMuted}; line-height: 1.6;">
                  Tag us in your reaction videos - we might share them!
                </p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${COLORS.purple};">
                  @personalizedoutput
                </p>
              </div>

              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="margin: 0 0 12px; font-size: 14px; color: ${COLORS.cream};">
                  Love what you see? Share with friends!
                </p>
                <p style="margin: 0; font-size: 14px;">
                  <a href="${SITE_URL}" style="color: ${COLORS.purple}; text-decoration: none;">personalizedoutput.com</a>
                </p>
              </div>
            </td>
          </tr>`;

  return sendEmail(email, subject, wrapEmailTemplate(content, false));
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}
