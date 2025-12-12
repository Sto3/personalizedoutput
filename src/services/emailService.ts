/**
 * Email Marketing Service using Resend
 * Handles welcome emails, post-purchase emails, and transactional emails
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://personalizedoutput.com';
const FROM_EMAIL = 'Personalized Output <hello@personalizedoutput.com>';

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
 * Welcome email for new subscribers
 */
export async function sendWelcomeEmail(
  email: string,
  name: string = 'there'
): Promise<EmailResult> {
  const subject = 'Welcome to Personalized Output! ';

  const html = `
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #e94560 0%, #cd7f32 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">Welcome to Personalized Output!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 18px; color: #333;">Hey ${name}!</p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #555; line-height: 1.6;">
                We're thrilled to have you join our community! At Personalized Output, we believe that every gift should feel uniquely made for the person receiving it.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #555; line-height: 1.6;">
                Here's what you can create with us:
              </p>

              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background: #fef3f4; border-radius: 8px; margin-bottom: 10px;">
                    <strong style="color: #e94560;">Personalized Santa Videos</strong>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Santa knows their name, their pet, their wish!</p>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background: #fff8f0; border-radius: 8px;">
                    <strong style="color: #cd7f32;">Custom Vision Boards</strong>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Visualize and manifest your 2025 goals</p>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background: #f0f7ff; border-radius: 8px;">
                    <strong style="color: #3b82f6;">Personalized Flash Cards</strong>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Learning made fun with their interests</p>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background: #f0fdf4; border-radius: 8px;">
                    <strong style="color: #22c55e;">Clarity Planners</strong>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">Planning systems built for how YOU think</p>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #cd7f32 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px;">
                  Start Creating
                </a>
              </div>

              <p style="margin: 30px 0 0; font-size: 14px; color: #888; text-align: center;">
                Questions? Just reply to this email - we're here to help!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                Personalized Output | Making moments magical<br>
                <a href="${SITE_URL}/unsubscribe" style="color: #888;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail(email, subject, html);
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
  const subject = `Thank you for your purchase! - ${productName}`;

  const html = `
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;"></div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Order Confirmed!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 18px; color: #333;">Your order is being prepared!</p>

              <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="color: #666; padding: 8px 0;">Order ID:</td>
                    <td style="color: #333; font-weight: 600; text-align: right;">${orderDetails.orderId}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 8px 0;">Product:</td>
                    <td style="color: #333; font-weight: 600; text-align: right;">${productName}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; padding: 8px 0;">Total:</td>
                    <td style="color: #10b981; font-weight: 700; text-align: right; font-size: 18px;">$${(orderDetails.amount / 100).toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              ${orderDetails.accessUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${orderDetails.accessUrl}" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #cd7f32 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px;">
                  Access Your ${productName}
                </a>
              </div>
              ` : ''}

              <p style="margin: 30px 0 0; font-size: 14px; color: #666; line-height: 1.6;">
                <strong>What happens next?</strong><br>
                You'll receive another email with your personalized content once it's ready. This usually takes just a few minutes!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                Questions? Reply to this email or visit <a href="${SITE_URL}" style="color: #e94560;">personalizedoutput.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail(email, subject, html);
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

  const html = `
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f8b500 0%, #cd7f32 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;"></div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Congratulations!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 20px; font-size: 18px; color: #333;">
                Your friends signed up, and you're being rewarded!
              </p>

              <div style="background: linear-gradient(135deg, #fef3f4 0%, #fff8f0 100%); border-radius: 16px; padding: 30px; margin: 20px 0;">
                <p style="font-size: 48px; font-weight: 700; color: #e94560; margin: 0;">${rewardsCount}</p>
                <p style="font-size: 18px; color: #666; margin: 10px 0 0;">Free Month${rewardsCount > 1 ? 's' : ''} Earned!</p>
              </div>

              <p style="margin: 20px 0; font-size: 16px; color: #555; line-height: 1.6;">
                Your next ${rewardsCount} billing cycle${rewardsCount > 1 ? 's' : ''} will be automatically skipped. Keep sharing your code to earn more!
              </p>

              <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 5px; font-size: 12px; color: #888;">Your Referral Code</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 3px; color: #333;">${referralCode}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${SITE_URL}/referrals" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #cd7f32 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px;">
                  View Your Rewards
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #888;">
                Personalized Output | Refer 3 friends, get 1 month free!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail(email, subject, html);
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

  const html = `
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #e94560 0%, #cd7f32 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;"></div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Your ${productName} is Ready!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 30px; font-size: 18px; color: #333;">
                Great news! Your personalized ${productName} has been created and is ready for you.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #e94560 0%, #cd7f32 100%); color: white; text-decoration: none; padding: 20px 50px; border-radius: 30px; font-weight: 600; font-size: 18px;">
                  View/Download Your ${productName}
                </a>
              </div>

              <p style="margin: 30px 0 0; font-size: 14px; color: #666; line-height: 1.6;">
                This link will expire in 7 days. Make sure to download your content before then!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                Love what you see? Share with friends!
              </p>
              <p style="margin: 0; font-size: 12px; color: #888;">
                <a href="${SITE_URL}" style="color: #e94560;">personalizedoutput.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail(email, subject, html);
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}
