/**
 * Meeting Bot Service — Zoom + Teams + Google Meet
 * =================================================
 * Redi joins video meetings as a named participant, listens, takes notes,
 * and can speak when addressed. Uses Playwright browser automation.
 *
 * Zoom: Web SDK via headless Chromium
 * Teams: Playwright guest join
 * Google Meet: Playwright guest join
 *
 * Requires: npm install playwright && npx playwright install chromium
 */

// Note: playwright is a peer dependency — install with: npm install playwright
// For Render: add to build command: npx playwright install --with-deps chromium

interface MeetingBotConfig {
  meetingUrl: string;
  platform: 'zoom' | 'teams' | 'google_meet';
  userName: string;
  userId: string;
  meetingId: string;
  onAudioChunk: (chunk: Buffer) => void;
  onTranscript: (speaker: string, text: string) => void;
  onMeetingEnd: () => void;
}

interface MeetingBotSession {
  id: string;
  platform: string;
  status: 'joining' | 'in_meeting' | 'ended' | 'error';
  startedAt: Date;
  browser?: any;
  page?: any;
  transcript: Array<{ speaker: string; text: string; timestamp: Date }>;
  actionItems: string[];
  decisions: string[];
}

const activeBots = new Map<string, MeetingBotSession>();

export async function joinMeeting(config: MeetingBotConfig): Promise<string> {
  const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const session: MeetingBotSession = {
    id: botId,
    platform: config.platform,
    status: 'joining',
    startedAt: new Date(),
    transcript: [],
    actionItems: [],
    decisions: [],
  };

  activeBots.set(botId, session);

  try {
    // Dynamic import — playwright may not be installed in all environments
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--no-sandbox',
      ],
    });
    session.browser = browser;

    const context = await browser.newContext({
      permissions: ['microphone', 'camera'],
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
    });

    const page = await context.newPage();
    session.page = page;

    switch (config.platform) {
      case 'zoom':
        await joinZoomMeeting(page, config);
        break;
      case 'teams':
        await joinTeamsMeeting(page, config);
        break;
      case 'google_meet':
        await joinGoogleMeeting(page, config);
        break;
    }

    session.status = 'in_meeting';
    console.log(`[MeetingBot ${botId}] Joined ${config.platform} as "${config.userName}"`);

    // Send disclaimer via chat
    await deliverDisclaimer(page, config.platform, config.userName);

    // Monitor for meeting end
    monitorMeetingEnd(page, session, config.onMeetingEnd);
  } catch (error) {
    session.status = 'error';
    console.error(`[MeetingBot ${botId}] Failed to join:`, error);
    throw error;
  }

  return botId;
}

async function joinZoomMeeting(page: any, config: MeetingBotConfig): Promise<void> {
  const webUrl = config.meetingUrl
    .replace('/j/', '/wc/join/')
    .replace('zoom.us/j/', 'zoom.us/wc/join/');

  await page.goto(webUrl);
  await page.waitForSelector('#inputname, [placeholder*="name"], input[name="name"]', { timeout: 15000 });
  await page.fill('#inputname, [placeholder*="name"], input[name="name"]', config.userName);
  await page.click('button:has-text("Join"), #joinBtn, button.zm-btn-legacy--primary');
  await page.waitForSelector('.meeting-app, #wc-content, [class*="meeting"]', { timeout: 30000 });
  console.log(`[MeetingBot] Zoom: Joined as "${config.userName}"`);
}

async function joinTeamsMeeting(page: any, config: MeetingBotConfig): Promise<void> {
  await page.goto(config.meetingUrl);
  await page.waitForSelector('button:has-text("Continue on this browser"), a:has-text("Continue on this browser")', { timeout: 15000 });
  await page.click('button:has-text("Continue on this browser"), a:has-text("Continue on this browser")');
  await page.waitForSelector('input[placeholder*="name"], #username', { timeout: 10000 });
  await page.fill('input[placeholder*="name"], #username', config.userName);

  const cameraBtn = await page.$('button[aria-label*="camera"], button[data-tid="toggle-video"]');
  if (cameraBtn) await cameraBtn.click();

  await page.click('button:has-text("Join now"), button[data-tid="prejoin-join-button"]');
  await page.waitForSelector('[data-tid="calling-screen"], .calling-screen', { timeout: 30000 });
  console.log(`[MeetingBot] Teams: Joined as "${config.userName}"`);
}

async function joinGoogleMeeting(page: any, config: MeetingBotConfig): Promise<void> {
  const GOOGLE_BOT_EMAIL = process.env.REDI_GOOGLE_BOT_EMAIL;
  const GOOGLE_BOT_PASSWORD = process.env.REDI_GOOGLE_BOT_PASSWORD;

  if (GOOGLE_BOT_EMAIL && GOOGLE_BOT_PASSWORD) {
    await page.goto('https://accounts.google.com/signin');
    await page.fill('input[type="email"]', GOOGLE_BOT_EMAIL);
    await page.click('button:has-text("Next")');
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.fill('input[type="password"]', GOOGLE_BOT_PASSWORD);
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(3000);
  }

  await page.goto(config.meetingUrl);

  const nameInput = await page.$('input[placeholder*="name"], input[aria-label*="name"]');
  if (nameInput) {
    await nameInput.fill(config.userName);
  }

  const micBtn = await page.$('[data-is-muted="false"][aria-label*="microphone"], button[aria-label*="Turn off microphone"]');
  if (micBtn) await micBtn.click();
  const camBtn = await page.$('[aria-label*="Turn off camera"], button[aria-label*="camera"]');
  if (camBtn) await camBtn.click();

  await page.waitForSelector('button:has-text("Ask to join"), button:has-text("Join now")', { timeout: 15000 });
  await page.click('button:has-text("Ask to join"), button:has-text("Join now")');
  await page.waitForSelector('[data-self-name], [data-meeting-title]', { timeout: 60000 });
  console.log(`[MeetingBot] Google Meet: Joined as "${config.userName}"`);
}

async function deliverDisclaimer(page: any, platform: string, botName: string): Promise<void> {
  const rediName = botName.split('/')[1]?.trim() || 'Redi';
  const userName = botName.split('/')[0]?.trim() || 'your';
  const disclaimerText = `Hi everyone! I'm ${rediName}, ${userName}'s AI assistant. I'll be taking notes and can help answer questions. Let me know if you'd like me to leave.`;

  try {
    if (platform === 'zoom') {
      const chatBtn = await page.$('button[aria-label*="Chat"], button:has-text("Chat")');
      if (chatBtn) {
        await chatBtn.click();
        await page.fill('textarea, [contenteditable="true"]', disclaimerText);
        await page.keyboard.press('Enter');
      }
    } else if (platform === 'teams') {
      const chatBtn = await page.$('button[aria-label*="chat"], button[data-tid*="chat"]');
      if (chatBtn) {
        await chatBtn.click();
        await page.fill('[contenteditable="true"], textarea', disclaimerText);
        await page.keyboard.press('Enter');
      }
    } else if (platform === 'google_meet') {
      const chatBtn = await page.$('button[aria-label*="chat"], button[data-tooltip*="chat"]');
      if (chatBtn) {
        await chatBtn.click();
        await page.fill('textarea, [contenteditable="true"]', disclaimerText);
        await page.keyboard.press('Enter');
      }
    }
  } catch (err) {
    console.log(`[MeetingBot] Could not send chat disclaimer, will announce verbally`);
  }
}

function monitorMeetingEnd(page: any, session: MeetingBotSession, onEnd: () => void): void {
  const interval = setInterval(async () => {
    try {
      const isEnded = await page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('meeting has ended') ||
               body.includes('you have been removed') ||
               body.includes('call ended') ||
               body.includes('you left the meeting') ||
               body.includes('return to home screen');
      });

      if (isEnded) {
        clearInterval(interval);
        session.status = 'ended';
        await session.browser?.close();
        onEnd();
      }
    } catch {
      clearInterval(interval);
      session.status = 'ended';
      onEnd();
    }
  }, 5000);
}

export function getBotStatus(botId: string): MeetingBotSession | undefined {
  return activeBots.get(botId);
}

export async function leaveMeeting(botId: string): Promise<void> {
  const session = activeBots.get(botId);
  if (!session) return;

  session.status = 'ended';
  await session.browser?.close();
  activeBots.delete(botId);
  console.log(`[MeetingBot ${botId}] Left meeting`);
}

export function getBotTranscript(botId: string): MeetingBotSession['transcript'] | undefined {
  return activeBots.get(botId)?.transcript;
}
