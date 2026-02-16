/**
 * Meeting Bot Routes
 * ==================
 * REST API for meeting bot management.
 */

import { Router } from 'express';
import { joinMeeting, getBotStatus, leaveMeeting, getBotTranscript } from './meetingBotService';

const router = Router();

// POST /api/meetings/bot/join
router.post('/bot/join', async (req, res) => {
  try {
    const { meetingUrl, platform, userName, userId, meetingId } = req.body;

    if (!meetingUrl || !userName || !userId) {
      return res.status(400).json({ error: 'Missing required fields: meetingUrl, userName, userId' });
    }

    let detectedPlatform = platform;
    if (!detectedPlatform) {
      if (meetingUrl.includes('zoom.us')) detectedPlatform = 'zoom';
      else if (meetingUrl.includes('teams.microsoft.com')) detectedPlatform = 'teams';
      else if (meetingUrl.includes('meet.google.com')) detectedPlatform = 'google_meet';
      else return res.status(400).json({ error: 'Could not detect meeting platform from URL' });
    }

    const botId = await joinMeeting({
      meetingUrl,
      platform: detectedPlatform,
      userName,
      userId,
      meetingId: meetingId || `meeting_${Date.now()}`,
      onAudioChunk: () => {},
      onTranscript: (speaker, text) => {
        const session = getBotStatus(botId);
        if (session) {
          session.transcript.push({ speaker, text, timestamp: new Date() });
        }
      },
      onMeetingEnd: () => {
        console.log(`[MeetingBot] Meeting ended for bot ${botId}`);
      },
    });

    res.json({ botId, status: 'joining' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/meetings/bot/:botId/status
router.get('/bot/:botId/status', (req, res) => {
  const session = getBotStatus(req.params.botId);
  if (!session) return res.status(404).json({ error: 'Bot not found' });
  res.json({ status: session.status, platform: session.platform, startedAt: session.startedAt });
});

// GET /api/meetings/bot/:botId/transcript
router.get('/bot/:botId/transcript', (req, res) => {
  const transcript = getBotTranscript(req.params.botId);
  if (!transcript) return res.status(404).json({ error: 'Bot not found' });
  res.json({ transcript });
});

// POST /api/meetings/bot/:botId/leave
router.post('/bot/:botId/leave', async (req, res) => {
  await leaveMeeting(req.params.botId);
  res.json({ status: 'left' });
});

// POST /api/meetings/bot/detect-platform
router.post('/bot/detect-platform', (req, res) => {
  const { url } = req.body;
  if (url?.includes('zoom.us')) res.json({ platform: 'zoom' });
  else if (url?.includes('teams.microsoft.com') || url?.includes('teams.live.com')) res.json({ platform: 'teams' });
  else if (url?.includes('meet.google.com')) res.json({ platform: 'google_meet' });
  else res.json({ platform: 'unknown' });
});

export default router;
