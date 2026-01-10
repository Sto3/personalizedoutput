/**
 * Homework Rescue - Policy Pages
 *
 * Legal and policy pages:
 * - Terms of Use
 * - Privacy Policy
 * - Refund Policy
 * - Child Safety Policy
 */

import { renderPageStart, renderPageEnd } from '../components/layout';

const POLICY_STYLES = `
<style>
  .policy-container {
    max-width: 800px;
    margin: 60px auto;
    padding: 20px;
    line-height: 1.8;
  }

  .policy-container h1 {
    font-size: 2rem;
    margin-bottom: 10px;
    color: #1F2937;
  }

  .policy-container .last-updated {
    color: #6B7280;
    font-size: 0.9rem;
    margin-bottom: 30px;
  }

  .policy-container h2 {
    font-size: 1.4rem;
    margin-top: 40px;
    margin-bottom: 15px;
    color: #1F2937;
  }

  .policy-container h3 {
    font-size: 1.1rem;
    margin-top: 25px;
    margin-bottom: 10px;
    color: #374151;
  }

  .policy-container p, .policy-container li {
    color: #4B5563;
  }

  .policy-container ul {
    margin-left: 20px;
    margin-bottom: 20px;
  }

  .policy-container li {
    margin-bottom: 8px;
  }

  .policy-container a {
    color: #4F46E5;
  }

  .policy-container .highlight-box {
    background: #F3F4F6;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }

  .policy-container .contact-box {
    background: #EEF2FF;
    padding: 20px;
    border-radius: 8px;
    margin-top: 40px;
  }
</style>
`;

// ============================================================
// TERMS OF USE
// ============================================================

export function renderTermsOfUsePage(): string {
  return `
${renderPageStart({ title: 'Terms of Use | Homework Rescue' })}
${POLICY_STYLES}

<div class="policy-container">
  <h1>Terms of Use</h1>
  <p class="last-updated">Last updated: January 2026</p>

  <p>Welcome to Homework Rescue by Personalized Output ("we," "us," or "our"). By using our services, you agree to these Terms of Use.</p>

  <h2>1. Service Description</h2>
  <p>Homework Rescue provides personalized educational video lessons for children in grades K-6, covering Math and Reading topics. Our service includes:</p>
  <ul>
    <li>Personalized video lessons based on information you provide</li>
    <li>Printable practice sheets and answer keys</li>
    <li>Parent summary documents</li>
    <li>One free remake per purchase if the initial lesson doesn't meet your needs</li>
  </ul>

  <h2>2. Eligibility</h2>
  <p>Our service is intended for purchase by adults (18 years or older) on behalf of children. By making a purchase, you confirm that:</p>
  <ul>
    <li>You are at least 18 years old</li>
    <li>You are the parent, legal guardian, or authorized caregiver of the child for whom the lesson is being created</li>
    <li>You have authority to provide information about the child</li>
  </ul>

  <h2>3. User Responsibilities</h2>
  <p>You agree to:</p>
  <ul>
    <li>Provide accurate information during the personalization process</li>
    <li>Not use the service for any unlawful purpose</li>
    <li>Not share, resell, or redistribute our content without permission</li>
    <li>Use the lessons for personal, non-commercial educational purposes only</li>
  </ul>

  <h2>4. Intellectual Property</h2>
  <p>All content we create, including video lessons, scripts, and materials, remains our intellectual property. You receive a personal, non-transferable license to use the content for your child's education.</p>

  <h2>5. Accuracy Disclaimer</h2>
  <div class="highlight-box">
    <p><strong>Important:</strong> While we employ quality assurance measures, our lessons are educational aids and may occasionally contain errors. We recommend:</p>
    <ul>
      <li>Parents review lessons before or with their child</li>
      <li>Using lessons as a supplement to, not replacement for, classroom instruction</li>
      <li>Consulting teachers or tutors for ongoing educational concerns</li>
    </ul>
  </div>

  <h2>6. Delivery Guarantee</h2>
  <p>We aim to deliver lessons within 15 minutes and guarantee delivery within 1 hour of order completion. If we fail to meet this guarantee, you may request a full refund or credit.</p>

  <h2>7. Remake Policy</h2>
  <p>Each purchase includes one free remake. To request a remake:</p>
  <ul>
    <li>Submit your request within 30 days of original delivery</li>
    <li>Provide feedback on what didn't work</li>
    <li>Additional remakes may be subject to fees</li>
  </ul>

  <h2>8. Limitation of Liability</h2>
  <p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our service.</p>

  <h2>9. Modifications</h2>
  <p>We may update these Terms from time to time. Continued use of our service after changes constitutes acceptance of the new Terms.</p>

  <div class="contact-box">
    <h3>Questions?</h3>
    <p>Contact us at <a href="mailto:support@personalizedoutput.com">support@personalizedoutput.com</a></p>
  </div>
</div>

${renderPageEnd()}
  `;
}

// ============================================================
// PRIVACY POLICY
// ============================================================

export function renderPrivacyPolicyPage(): string {
  return `
${renderPageStart({ title: 'Privacy Policy | Homework Rescue' })}
${POLICY_STYLES}

<div class="policy-container">
  <h1>Privacy Policy</h1>
  <p class="last-updated">Last updated: January 2026</p>

  <p>Personalized Output ("we," "us," or "our") is committed to protecting your privacy and your child's privacy. This policy explains how we collect, use, and protect information.</p>

  <h2>1. Information We Collect</h2>

  <h3>Information You Provide</h3>
  <ul>
    <li><strong>Parent/Guardian Information:</strong> Email address for delivery and communication</li>
    <li><strong>Child Information:</strong> First name, grade level, learning struggles, interests, and learning preferences</li>
    <li><strong>Payment Information:</strong> Processed securely through Stripe; we do not store card details</li>
  </ul>

  <h3>Automatically Collected Information</h3>
  <ul>
    <li>Device type and browser information</li>
    <li>IP address (anonymized for analytics)</li>
    <li>Page views and feature usage</li>
  </ul>

  <h2>2. How We Use Information</h2>
  <p>We use the information to:</p>
  <ul>
    <li>Create personalized educational content for your child</li>
    <li>Deliver lessons and materials to you</li>
    <li>Process payments</li>
    <li>Respond to support requests</li>
    <li>Improve our services</li>
    <li>Send order-related communications</li>
  </ul>

  <h2>3. Children's Privacy (COPPA Compliance)</h2>
  <div class="highlight-box">
    <p><strong>We take children's privacy seriously:</strong></p>
    <ul>
      <li>We collect only the minimum information needed to create personalized lessons</li>
      <li>We never collect children's email addresses, phone numbers, or location</li>
      <li>We never share children's information with advertisers</li>
      <li>We never allow children to make purchases directly</li>
      <li>Parents can request deletion of their child's information at any time</li>
    </ul>
  </div>

  <h2>4. Data Sharing</h2>
  <p>We do not sell your information. We share data only with:</p>
  <ul>
    <li><strong>Stripe:</strong> For payment processing</li>
    <li><strong>AI Services (Claude, ElevenLabs):</strong> To generate lesson content (data is not retained by these services)</li>
    <li><strong>Email Services:</strong> To deliver order communications</li>
  </ul>

  <h2>5. Data Retention</h2>
  <ul>
    <li><strong>Order data:</strong> Retained for 2 years for support and remake requests</li>
    <li><strong>Lesson content:</strong> Stored for 90 days, then deleted</li>
    <li><strong>Payment records:</strong> Retained as required by law (typically 7 years)</li>
  </ul>

  <h2>6. Data Deletion</h2>
  <p>You can request deletion of your data by emailing <a href="mailto:privacy@personalizedoutput.com">privacy@personalizedoutput.com</a>. We will:</p>
  <ul>
    <li>Delete all child information within 30 days</li>
    <li>Delete all personal data except records required by law</li>
    <li>Confirm deletion via email</li>
  </ul>

  <h2>7. Security</h2>
  <p>We protect your data with:</p>
  <ul>
    <li>HTTPS encryption for all data transmission</li>
    <li>Secure cloud infrastructure</li>
    <li>Limited employee access to personal data</li>
    <li>Regular security reviews</li>
  </ul>

  <h2>8. Your Rights</h2>
  <p>You have the right to:</p>
  <ul>
    <li>Access your data</li>
    <li>Correct inaccurate information</li>
    <li>Delete your data</li>
    <li>Opt out of marketing communications</li>
    <li>Lodge a complaint with a supervisory authority</li>
  </ul>

  <h2>9. Cookies</h2>
  <p>We use essential cookies for site functionality and analytics cookies to understand usage. You can control cookies through your browser settings.</p>

  <div class="contact-box">
    <h3>Privacy Questions?</h3>
    <p>Contact our privacy team at <a href="mailto:privacy@personalizedoutput.com">privacy@personalizedoutput.com</a></p>
  </div>
</div>

${renderPageEnd()}
  `;
}

// ============================================================
// REFUND POLICY
// ============================================================

export function renderRefundPolicyPage(): string {
  return `
${renderPageStart({ title: 'Refund Policy | Homework Rescue' })}
${POLICY_STYLES}

<div class="policy-container">
  <h1>Refund Policy</h1>
  <p class="last-updated">Last updated: January 2026</p>

  <p>We want you to be completely satisfied with your Homework Rescue lesson. Here's our refund policy:</p>

  <h2>Free Remake Guarantee</h2>
  <div class="highlight-box">
    <p><strong>Before requesting a refund, try our free remake!</strong></p>
    <p>Every purchase includes one free remake. If the lesson didn't click:</p>
    <ul>
      <li>Tell us what didn't work</li>
      <li>We'll create a new version with a different approach</li>
      <li>No additional charge</li>
    </ul>
    <p><a href="/homework-rescue/remake">Request a Remake</a></p>
  </div>

  <h2>Full Refund Eligibility</h2>
  <p>You are eligible for a full refund if:</p>
  <ul>
    <li><strong>Delivery Failure:</strong> We fail to deliver your lesson within 1 hour</li>
    <li><strong>Technical Issues:</strong> The video or materials are corrupted or unplayable</li>
    <li><strong>Order Error:</strong> We made a significant error in the lesson (wrong topic, wrong grade level)</li>
    <li><strong>Remake Unsatisfactory:</strong> You've used your free remake and are still unsatisfied</li>
  </ul>

  <h2>How to Request a Refund</h2>
  <ol>
    <li>Email <a href="mailto:support@personalizedoutput.com">support@personalizedoutput.com</a> with your order ID</li>
    <li>Briefly explain why the lesson didn't meet your needs</li>
    <li>We'll respond within 24 hours</li>
    <li>Refunds are processed within 5-7 business days</li>
  </ol>

  <h2>Partial Refunds</h2>
  <p>We may offer partial refunds or credits in cases where:</p>
  <ul>
    <li>The lesson was mostly satisfactory but had minor issues</li>
    <li>You've used the materials but want additional lessons</li>
    <li>Delivery was delayed but ultimately successful</li>
  </ul>

  <h2>Non-Refundable Situations</h2>
  <p>Refunds are generally not available for:</p>
  <ul>
    <li>Change of mind after the lesson has been delivered and viewed</li>
    <li>Providing inaccurate information during personalization</li>
    <li>Requests made more than 30 days after purchase</li>
  </ul>

  <h2>Credit Option</h2>
  <p>Instead of a refund, you can request account credit for future lessons at 110% of your purchase value.</p>

  <div class="contact-box">
    <h3>Need Help?</h3>
    <p>Our support team is here to help. Email <a href="mailto:support@personalizedoutput.com">support@personalizedoutput.com</a> and we'll make it right.</p>
  </div>
</div>

${renderPageEnd()}
  `;
}

// ============================================================
// CHILD SAFETY POLICY
// ============================================================

export function renderChildSafetyPolicyPage(): string {
  return `
${renderPageStart({ title: 'Child Safety Policy | Homework Rescue' })}
${POLICY_STYLES}

<div class="policy-container">
  <h1>Child Safety Policy</h1>
  <p class="last-updated">Last updated: January 2026</p>

  <p>The safety and wellbeing of children is our highest priority. This policy outlines our commitment to child safety.</p>

  <h2>Our Commitment</h2>
  <div class="highlight-box">
    <p>We are committed to creating a safe, supportive, and positive learning experience for every child. Our content is designed to educate, encourage, and never harm.</p>
  </div>

  <h2>Content Standards</h2>
  <p>Every lesson we create adheres to strict content standards:</p>

  <h3>We Always:</h3>
  <ul>
    <li>Use age-appropriate language and concepts</li>
    <li>Encourage and celebrate effort, not just results</li>
    <li>Use positive, supportive tone throughout</li>
    <li>Focus on learning and understanding</li>
    <li>Respect diverse backgrounds and perspectives</li>
  </ul>

  <h3>We Never:</h3>
  <ul>
    <li>Use shaming, criticism, or discouraging language</li>
    <li>Include violent, scary, or disturbing content</li>
    <li>Reference inappropriate topics for children</li>
    <li>Pressure children about performance</li>
    <li>Include advertising or promotional content</li>
    <li>Collect children's personal contact information</li>
  </ul>

  <h2>Automated Safety Checks</h2>
  <p>Every lesson goes through automated safety verification that checks for:</p>
  <ul>
    <li>Inappropriate language or content</li>
    <li>Potentially upsetting scenarios</li>
    <li>Accuracy of educational content</li>
    <li>Age-appropriateness of vocabulary and complexity</li>
  </ul>

  <h2>Parental Control</h2>
  <p>We support parental oversight:</p>
  <ul>
    <li>All purchases require an adult email address</li>
    <li>Lessons are delivered to parents, not children</li>
    <li>Parents receive all materials to review first</li>
    <li>Parents can request content adjustments or remakes</li>
    <li>Parents can request deletion of all data at any time</li>
  </ul>

  <h2>Data Protection</h2>
  <p>We protect children's information by:</p>
  <ul>
    <li>Collecting only first names (not full names)</li>
    <li>Never collecting children's email, phone, or location</li>
    <li>Never sharing children's information with advertisers</li>
    <li>Deleting lesson data within 90 days</li>
    <li>Using secure, encrypted storage</li>
  </ul>

  <h2>Reporting Concerns</h2>
  <p>If you have any concerns about content safety or appropriateness:</p>
  <ul>
    <li>Email us immediately at <a href="mailto:safety@personalizedoutput.com">safety@personalizedoutput.com</a></li>
    <li>Include the order ID and specific concern</li>
    <li>We will review within 24 hours</li>
    <li>We take all reports seriously and act quickly</li>
  </ul>

  <h2>Third-Party Services</h2>
  <p>We use trusted third-party services (AI, voice synthesis) that:</p>
  <ul>
    <li>Do not retain personal information</li>
    <li>Have their own safety guidelines</li>
    <li>Are regularly audited for compliance</li>
  </ul>

  <h2>Continuous Improvement</h2>
  <p>We continuously improve our safety measures by:</p>
  <ul>
    <li>Monitoring customer feedback</li>
    <li>Updating our safety filters</li>
    <li>Training our systems on new edge cases</li>
    <li>Staying current with child safety best practices</li>
  </ul>

  <div class="contact-box">
    <h3>Questions or Concerns?</h3>
    <p>We take child safety seriously. Contact us anytime:</p>
    <p><a href="mailto:safety@personalizedoutput.com">safety@personalizedoutput.com</a></p>
  </div>
</div>

${renderPageEnd()}
  `;
}
