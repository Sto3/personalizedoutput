/**
 * Homework Rescue - Email Service
 *
 * Handles all email notifications:
 * - Order confirmation
 * - Lesson delivery
 * - Remake notifications
 * - Feedback requests
 * - Abandoned checkout recovery
 */

import * as fs from 'fs';
import * as path from 'path';
import { HomeworkOrder } from './types';

// Email templates
const EMAIL_TEMPLATES = {
  orderConfirmation: (order: HomeworkOrder) => ({
    subject: `Creating ${order.intake.childName}'s Personalized Lesson!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5, #818CF8); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #F9FAFB; padding: 30px; border-radius: 0 0 12px 12px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 0.9rem; }
    .highlight { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">We're On It!</h1>
    </div>
    <div class="content">
      <p>Hi there!</p>
      <p>We're creating a personalized lesson for <strong>${order.intake.childName}</strong> right now.</p>

      <div class="highlight">
        <strong>What we're making:</strong><br>
        ${order.intake.subject}: ${order.intake.topic}<br>
        Using ${order.intake.childName}'s love of ${order.intake.interest}
      </div>

      <p><strong>Expected delivery:</strong> Usually within 15 minutes</p>

      <p>You can track progress here:</p>
      <p style="text-align: center; margin: 25px 0;">
        <a href="${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue/order/${order.id}/status" class="button">Watch Progress</a>
      </p>

      <p>We'll email you the moment it's ready!</p>

      <p>Thanks for trusting us with ${order.intake.childName}'s learning.</p>
    </div>
    <div class="footer">
      <p>Personalized Output - Homework Rescue</p>
      <p><a href="${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue">personalizedoutput.com/homework-rescue</a></p>
    </div>
  </div>
</body>
</html>
    `
  }),

  lessonDelivered: (order: HomeworkOrder) => ({
    subject: `${order.intake.childName}'s Lesson is Ready!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #F9FAFB; padding: 30px; border-radius: 0 0 12px 12px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 5px; }
    .button-outline { display: inline-block; background: white; color: #4F46E5; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #4F46E5; margin: 5px; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 0.9rem; }
    .downloads { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Lesson Ready!</h1>
    </div>
    <div class="content">
      <p>Great news! ${order.intake.childName}'s personalized lesson is ready.</p>

      <div class="downloads">
        <h3 style="margin-top: 0;">Your Materials:</h3>
        <p style="text-align: center;">
          <a href="${order.videoUrl}" class="button">Watch Video Lesson</a>
        </p>
        <p style="text-align: center;">
          <a href="${order.practiceSheetUrl}" class="button-outline">Practice Sheet</a>
          <a href="${order.answerKeyUrl}" class="button-outline">Answer Key</a>
          <a href="${order.parentSummaryUrl}" class="button-outline">Parent Summary</a>
        </p>
      </div>

      <h3>How to Use This Lesson</h3>
      <ol>
        <li><strong>Watch together first</strong> - The video is designed with pause points for practice</li>
        <li><strong>Print the practice sheet</strong> - Extra problems to reinforce learning</li>
        <li><strong>Check the answer key</strong> - Review answers together</li>
        <li><strong>Read the parent summary</strong> - Tips to reinforce at home</li>
      </ol>

      <p style="background: #FEF3C7; padding: 15px; border-radius: 8px;">
        <strong>Didn't click?</strong> You get one free remake. <a href="${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue/order/${order.id}/remake">Request a remake</a> with different angles or pacing.
      </p>

      <p>Happy learning!</p>
    </div>
    <div class="footer">
      <p>Personalized Output - Homework Rescue</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  feedbackRequest: (order: HomeworkOrder) => ({
    subject: `Did the lesson help ${order.intake.childName}?`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #F9FAFB; padding: 30px; border-radius: 12px; }
    .button { display: inline-block; background: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
    .button-secondary { display: inline-block; background: #F59E0B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>Quick Question!</h2>
      <p>We sent ${order.intake.childName}'s ${order.intake.subject} lesson yesterday. How did it go?</p>

      <p style="text-align: center;">
        <a href="${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue/order/${order.id}/feedback?clicked=yes" class="button">It Clicked!</a>
        <a href="${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue/order/${order.id}/remake" class="button-secondary">Need a Remake</a>
      </p>

      <p style="font-size: 0.9rem; color: #6B7280;">If it worked, we'd love a quick quote we can share (with your permission). If not, your free remake is waiting!</p>
    </div>
    <div class="footer">
      <p>Personalized Output - Homework Rescue</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  remakeStarted: (order: HomeworkOrder, originalOrderId: string) => ({
    subject: `Remaking ${order.intake.childName}'s Lesson`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5, #818CF8); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #F9FAFB; padding: 30px; border-radius: 0 0 12px 12px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Remake in Progress</h1>
    </div>
    <div class="content">
      <p>We're creating a new version of ${order.intake.childName}'s lesson based on your feedback.</p>

      <p><strong>Changes we're making:</strong></p>
      <p>${order.remakeReason || 'Adjusted approach based on your feedback'}</p>

      <p style="text-align: center; margin: 25px 0;">
        <a href="${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue/order/${order.id}/status" class="button">Track Progress</a>
      </p>

      <p>We'll email you when the new lesson is ready!</p>
    </div>
  </div>
</body>
</html>
    `
  }),

  abandonedCheckout: (sessionData: any) => ({
    subject: `Still need help with ${sessionData.childName}'s homework?`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #F9FAFB; padding: 30px; border-radius: 12px; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>We noticed you didn't finish</h2>
      <p>You were creating a personalized lesson for ${sessionData.childName} about ${sessionData.topic}.</p>

      <p>The homework struggle is real - we get it. That's why we built Homework Rescue.</p>

      <p>Your personalization data is still saved. Pick up where you left off:</p>

      <p style="text-align: center; margin: 25px 0;">
        <a href="${process.env.BASE_URL || 'https://personalizedoutput.com'}/homework-rescue/resume/${sessionData.sessionId}" class="button">Continue My Order</a>
      </p>

      <p style="font-size: 0.9rem; color: #6B7280;">Questions? Reply to this email and we'll help.</p>
    </div>
  </div>
</body>
</html>
    `
  })
};

/**
 * Send an email (logs to file in MVP, integrate with SendGrid/Resend in production)
 */
export async function sendEmail(
  to: string,
  template: keyof typeof EMAIL_TEMPLATES,
  data: any
): Promise<boolean> {
  try {
    const emailContent = EMAIL_TEMPLATES[template](data);

    // For MVP: Log to file
    const logDir = path.join(process.cwd(), 'outputs', 'logs', 'emails');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = {
      to,
      template,
      subject: emailContent.subject,
      timestamp: new Date().toISOString(),
      html: emailContent.html
    };

    const logPath = path.join(logDir, `${Date.now()}_${template}.json`);
    fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2));

    console.log(`[Email] Sent ${template} to ${to}`);

    // In production, integrate with email service:
    // await sendgrid.send({ to, from: 'hello@personalizedoutput.com', ...emailContent });

    return true;
  } catch (error) {
    console.error('[Email] Error sending:', error);
    return false;
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(order: HomeworkOrder): Promise<boolean> {
  return sendEmail(order.email, 'orderConfirmation', order);
}

/**
 * Send lesson delivery email
 */
export async function sendLessonDelivered(order: HomeworkOrder): Promise<boolean> {
  return sendEmail(order.email, 'lessonDelivered', order);
}

/**
 * Send feedback request (24 hours after delivery)
 */
export async function sendFeedbackRequest(order: HomeworkOrder): Promise<boolean> {
  return sendEmail(order.email, 'feedbackRequest', order);
}

/**
 * Send remake started notification
 */
export async function sendRemakeStarted(order: HomeworkOrder, originalOrderId: string): Promise<boolean> {
  return sendEmail(order.email, 'remakeStarted', { ...order, originalOrderId });
}

/**
 * Send abandoned checkout email
 */
export async function sendAbandonedCheckout(email: string, sessionData: any): Promise<boolean> {
  return sendEmail(email, 'abandonedCheckout', sessionData);
}

/**
 * Schedule feedback email for 24 hours after delivery
 */
export function scheduleFeedbackEmail(order: HomeworkOrder): void {
  // In production, use a job queue with delay
  // For MVP, we'll skip automatic scheduling
  console.log(`[Email] Feedback email scheduled for order ${order.id}`);
}
