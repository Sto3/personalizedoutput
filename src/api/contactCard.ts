/**
 * Redi Contact Card — Save Redi as a phone contact
 * ==================================================
 * Generates a vCard (.vcf) file so users can save Redi
 * as a contact during onboarding. This makes Redi feel
 * like a real presence in their phone.
 */

import { Router, Request, Response } from 'express';

const router = Router();

const REDI_PHONE = process.env.REDI_PHONE_NUMBER || '+1-555-REDI';
const REDI_AVATAR_URL = process.env.REDI_AVATAR_URL || 'https://personalizedoutput.com/assets/redi-avatar.png';

/**
 * Generate a vCard string for Redi
 */
export function generateRediVCard(): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Redi',
    'N:;Redi;;;',
    'ORG:Personalized Output',
    'TITLE:Your AI Assistant',
    `TEL;TYPE=CELL:${REDI_PHONE}`,
    'EMAIL:redi@personalizedoutput.com',
    'URL:https://personalizedoutput.com/redi',
    `NOTE:Redi — your personal AI assistant. Always here when you need me.`,
    'CATEGORIES:AI,Assistant',
    'END:VCARD',
  ].join('\r\n');
}

/**
 * Handle contact card download request
 * Returns a .vcf file that iOS/Android can import as a contact
 */
export function handleContactCardRequest(req: Request, res: Response): void {
  const vcf = generateRediVCard();

  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Redi.vcf"');
  res.send(vcf);
}

// GET /api/contact-card — download Redi vCard
router.get('/', handleContactCardRequest);

export default router;
