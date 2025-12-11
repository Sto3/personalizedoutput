/**
 * Legal Pages
 *
 * Terms of Service, Privacy Policy, and Copyright notices.
 */

export function renderTermsPage(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Terms of Service - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #0f172a;
          min-height: 100vh;
          color: #e2e8f0;
          line-height: 1.7;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 8px;
          color: #fff;
        }
        .last-updated {
          color: #64748b;
          margin-bottom: 40px;
        }
        h2 {
          font-size: 1.5rem;
          margin-top: 40px;
          margin-bottom: 16px;
          color: #fff;
        }
        p {
          margin-bottom: 16px;
          color: #cbd5e1;
        }
        ul, ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }
        li {
          margin-bottom: 8px;
          color: #cbd5e1;
        }
        a {
          color: #e94560;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 40px;
          color: #64748b;
        }
        .back-link:hover {
          color: #fff;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/" class="back-link">← Back to Personalized Output</a>

        <h1>Terms of Service</h1>
        <p class="last-updated">Last updated: December 11, 2024</p>

        <p>Welcome to Personalized Output ("we," "our," or "us"). By using our website and services at personalizedoutput.com, you agree to these Terms of Service.</p>

        <h2>1. Services Description</h2>
        <p>Personalized Output provides AI-powered personalized content creation services including but not limited to:</p>
        <ul>
          <li>Personalized Santa voice messages</li>
          <li>Custom vision boards</li>
          <li>Holiday relationship planners</li>
          <li>New year reflection planners</li>
          <li>Clarity planners</li>
          <li>Custom flash cards</li>
        </ul>

        <h2>2. Subscription Plans</h2>
        <p>We offer subscription plans with the following terms:</p>
        <ul>
          <li><strong>Starter ($25/month):</strong> 2 personalized outputs per month</li>
          <li><strong>Regular ($39/month):</strong> 4 personalized outputs per month</li>
          <li><strong>Power User ($59/month):</strong> 8 personalized outputs per month</li>
        </ul>
        <p>Unused outputs do not roll over to the next billing period. Subscriptions auto-renew unless cancelled.</p>

        <h2>3. Etsy Orders</h2>
        <p>Products purchased through our Etsy store are subject to both these Terms and Etsy's policies. Each Etsy purchase entitles you to one personalized output as specified in the listing.</p>

        <h2>4. Intellectual Property</h2>
        <p><strong>Our IP:</strong> The Personalized Output name, logo, website design, and generation technology are our intellectual property. Our AI prompts, question flows, and generation systems are trade secrets.</p>
        <p><strong>Your Content:</strong> You retain ownership of the personal information you provide. By using our service, you grant us a license to use this information to create your personalized output.</p>
        <p><strong>Generated Outputs:</strong> Once generated, you own the rights to your personalized output for personal use. Power User subscribers receive commercial use rights.</p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use our services for any illegal purpose</li>
          <li>Provide false information about recipients</li>
          <li>Attempt to reverse-engineer our systems</li>
          <li>Share, resell, or redistribute our proprietary technology</li>
          <li>Use outputs to harass, threaten, or harm others</li>
        </ul>

        <h2>6. Content Guidelines</h2>
        <p>Our Santa messages are designed to be positive and encouraging. We reserve the right to refuse service for requests that:</p>
        <ul>
          <li>Include inappropriate content for children</li>
          <li>Contain harmful, threatening, or abusive language</li>
          <li>Violate any laws or regulations</li>
        </ul>

        <h2>7. Refunds</h2>
        <p>We offer a 30-day money-back guarantee on your first subscription month. Etsy orders follow Etsy's refund policies. We reserve the right to deny refunds for completed services.</p>

        <h2>8. Referral Program</h2>
        <p>Our referral program awards one free month of service for every three referred friends who subscribe. Abuse of the referral system may result in account termination.</p>

        <h2>9. Privacy</h2>
        <p>Your privacy is important to us. Please review our <a href="/privacy">Privacy Policy</a> for details on how we collect, use, and protect your information.</p>

        <h2>10. Disclaimer of Warranties</h2>
        <p>Our services are provided "as is" without warranties of any kind, express or implied. We do not guarantee that our services will be uninterrupted or error-free.</p>

        <h2>11. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, Personalized Output shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>

        <h2>12. Changes to Terms</h2>
        <p>We may update these Terms at any time. Continued use of our services after changes constitutes acceptance of the new Terms.</p>

        <h2>13. Contact</h2>
        <p>For questions about these Terms, please contact us at <a href="mailto:hello@personalizedoutput.com">hello@personalizedoutput.com</a>.</p>

        <p style="margin-top: 40px; color: #64748b;">© ${new Date().getFullYear()} Personalized Output. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

export function renderPrivacyPage(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy Policy - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #0f172a;
          min-height: 100vh;
          color: #e2e8f0;
          line-height: 1.7;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 8px;
          color: #fff;
        }
        .last-updated {
          color: #64748b;
          margin-bottom: 40px;
        }
        h2 {
          font-size: 1.5rem;
          margin-top: 40px;
          margin-bottom: 16px;
          color: #fff;
        }
        p {
          margin-bottom: 16px;
          color: #cbd5e1;
        }
        ul, ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }
        li {
          margin-bottom: 8px;
          color: #cbd5e1;
        }
        a {
          color: #e94560;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 40px;
          color: #64748b;
        }
        .back-link:hover {
          color: #fff;
        }
        .highlight {
          background: rgba(233, 69, 96, 0.1);
          border-left: 3px solid #e94560;
          padding: 16px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/" class="back-link">← Back to Personalized Output</a>

        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: December 11, 2024</p>

        <p>At Personalized Output, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.</p>

        <div class="highlight">
          <strong>Key Points:</strong>
          <ul style="margin-top: 12px; margin-bottom: 0;">
            <li>We only collect information necessary to create your personalized outputs</li>
            <li>We never sell your personal data to third parties</li>
            <li>Your children's information is handled with extra care</li>
            <li>You can request deletion of your data at any time</li>
          </ul>
        </div>

        <h2>1. Information We Collect</h2>

        <h3 style="font-size: 1.1rem; margin-top: 24px; margin-bottom: 12px;">Account Information</h3>
        <ul>
          <li>Email address</li>
          <li>Name (optional)</li>
          <li>Password (encrypted)</li>
          <li>Payment information (processed by Stripe)</li>
        </ul>

        <h3 style="font-size: 1.1rem; margin-top: 24px; margin-bottom: 12px;">Product Information</h3>
        <p>To create personalized outputs, we collect information you provide about:</p>
        <ul>
          <li>Names and ages of recipients</li>
          <li>Personal stories and achievements</li>
          <li>Goals and aspirations</li>
          <li>Other details needed for personalization</li>
        </ul>

        <h3 style="font-size: 1.1rem; margin-top: 24px; margin-bottom: 12px;">Technical Information</h3>
        <ul>
          <li>IP address</li>
          <li>Browser type</li>
          <li>Device information</li>
          <li>Usage patterns (pages visited, features used)</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li><strong>Service Delivery:</strong> To create and deliver your personalized outputs</li>
          <li><strong>Account Management:</strong> To manage your subscription and orders</li>
          <li><strong>Communication:</strong> To send order confirmations, support responses, and (if opted in) marketing emails</li>
          <li><strong>Improvement:</strong> To improve our services and develop new products</li>
          <li><strong>Security:</strong> To protect against fraud and abuse</li>
        </ul>

        <h2>3. Children's Privacy (COPPA Compliance)</h2>
        <p>Our services involve creating content about children. We take special care with this information:</p>
        <ul>
          <li>We only collect children's information from their parents/guardians</li>
          <li>Children's information is used solely to create the requested output</li>
          <li>We do not create profiles on children or track them</li>
          <li>Parents can request deletion of their children's information at any time</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p><strong>We do NOT sell your personal data.</strong></p>
        <p>We may share data with:</p>
        <ul>
          <li><strong>Service Providers:</strong> Stripe (payments), Resend (emails), AI providers (content generation)</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
        </ul>

        <h2>5. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>HTTPS encryption for all data transmission</li>
          <li>Encrypted password storage</li>
          <li>Secure cloud infrastructure</li>
          <li>Regular security reviews</li>
        </ul>

        <h2>6. Data Retention</h2>
        <ul>
          <li><strong>Account Data:</strong> Retained while your account is active, deleted upon request</li>
          <li><strong>Generated Outputs:</strong> Stored for 90 days for redelivery purposes</li>
          <li><strong>Input Data:</strong> Retained for 30 days after generation, then deleted</li>
          <li><strong>Transaction Records:</strong> Retained for 7 years for tax/legal purposes</li>
        </ul>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your data</li>
          <li><strong>Correction:</strong> Update or correct your information</li>
          <li><strong>Deletion:</strong> Request deletion of your data</li>
          <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails</li>
          <li><strong>Portability:</strong> Receive your data in a standard format</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>We use essential cookies for:</p>
        <ul>
          <li>Session management (keeping you logged in)</li>
          <li>Security (preventing fraud)</li>
        </ul>
        <p>We do not use advertising or tracking cookies.</p>

        <h2>9. Third-Party Services</h2>
        <p>Our website may contain links to third-party services. We are not responsible for their privacy practices. Please review their policies separately.</p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or website notice.</p>

        <h2>11. Contact Us</h2>
        <p>For privacy-related questions or requests:</p>
        <ul>
          <li>Email: <a href="mailto:hello@personalizedoutput.com">hello@personalizedoutput.com</a></li>
          <li>Subject line: "Privacy Request"</li>
        </ul>

        <h2>12. California Residents (CCPA)</h2>
        <p>California residents have additional rights under CCPA:</p>
        <ul>
          <li>Right to know what personal information we collect</li>
          <li>Right to delete personal information</li>
          <li>Right to opt-out of sale (we don't sell data)</li>
          <li>Right to non-discrimination for exercising rights</li>
        </ul>

        <p style="margin-top: 40px; color: #64748b;">© ${new Date().getFullYear()} Personalized Output. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

export function renderCopyrightPage(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Copyright & IP - Personalized Output</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #0f172a;
          min-height: 100vh;
          color: #e2e8f0;
          line-height: 1.7;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 8px;
          color: #fff;
        }
        .last-updated {
          color: #64748b;
          margin-bottom: 40px;
        }
        h2 {
          font-size: 1.5rem;
          margin-top: 40px;
          margin-bottom: 16px;
          color: #fff;
        }
        p {
          margin-bottom: 16px;
          color: #cbd5e1;
        }
        ul {
          margin-bottom: 16px;
          padding-left: 24px;
        }
        li {
          margin-bottom: 8px;
          color: #cbd5e1;
        }
        a {
          color: #e94560;
          text-decoration: none;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 40px;
          color: #64748b;
        }
        .ip-box {
          background: rgba(233, 69, 96, 0.1);
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
        }
        .ip-box h3 {
          color: #e94560;
          margin-bottom: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <a href="/" class="back-link">← Back to Personalized Output</a>

        <h1>Copyright & Intellectual Property</h1>
        <p class="last-updated">Last updated: December 11, 2024</p>

        <p>This document outlines the intellectual property rights associated with Personalized Output and its services.</p>

        <h2>1. Our Intellectual Property</h2>

        <div class="ip-box">
          <h3>Trademarks</h3>
          <ul>
            <li>"Personalized Output" name and logo</li>
            <li>"Deep Personalization" methodology</li>
            <li>Product names and branding</li>
          </ul>
        </div>

        <div class="ip-box">
          <h3>Trade Secrets</h3>
          <ul>
            <li>AI prompt engineering and question flows</li>
            <li>Personalization algorithms and techniques</li>
            <li>Content generation systems</li>
            <li>Quality control processes</li>
          </ul>
        </div>

        <div class="ip-box">
          <h3>Copyrights</h3>
          <ul>
            <li>Website design and code</li>
            <li>Blog content and marketing materials</li>
            <li>Product templates and frameworks</li>
            <li>Documentation and guides</li>
          </ul>
        </div>

        <h2>2. User Rights to Generated Content</h2>
        <p><strong>Personal Use:</strong> All users receive full rights to use their generated outputs for personal, non-commercial purposes.</p>
        <p><strong>Commercial Use:</strong> Power User subscribers ($59/month) receive commercial use rights for their generated outputs, including:</p>
        <ul>
          <li>Using outputs for client work</li>
          <li>Incorporating outputs into products for sale</li>
          <li>Using outputs in business marketing</li>
        </ul>

        <h2>3. Restrictions</h2>
        <p>All users agree NOT to:</p>
        <ul>
          <li>Reverse-engineer our AI systems or prompts</li>
          <li>Copy our question flows or methodologies</li>
          <li>Create competing services using our techniques</li>
          <li>Remove or alter copyright notices</li>
          <li>Claim ownership of our proprietary systems</li>
        </ul>

        <h2>4. DMCA Policy</h2>
        <p>We respect intellectual property rights. If you believe content on our site infringes your copyright, please send a DMCA notice to:</p>
        <p><a href="mailto:hello@personalizedoutput.com">hello@personalizedoutput.com</a> with subject "DMCA Notice"</p>

        <h2>5. Attribution</h2>
        <p>When sharing outputs publicly, we appreciate (but don't require) attribution to Personalized Output.</p>

        <h2>6. Third-Party Content</h2>
        <p>Our service uses:</p>
        <ul>
          <li>Google Fonts (Inter) - Open Font License</li>
          <li>Various open-source libraries - respective licenses</li>
        </ul>

        <h2>7. Questions</h2>
        <p>For IP-related questions, contact us at <a href="mailto:hello@personalizedoutput.com">hello@personalizedoutput.com</a>.</p>

        <p style="margin-top: 40px; color: #64748b;">© ${new Date().getFullYear()} Personalized Output. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}
