/**
 * Number Manager — Twilio phone number management
 * =================================================
 * Assigns, provisions, and manages Twilio numbers for users.
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function getTwilioAuth(): string {
  return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
}

// GET /api/phone/:userId — get user's assigned number
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('redi_phone_numbers')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.json({ assigned: false, phoneNumber: null });
    }

    res.json({ assigned: true, phoneNumber: data.phone_number, areaCode: data.area_code, assignedAt: data.assigned_at });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/phone/:userId/provision — provision or assign a number
router.post('/:userId/provision', async (req: Request, res: Response) => {
  try {
    const { areaCode } = req.body;
    const db = getSupabase();
    const userId = req.params.userId;

    // Check if user already has a number
    const { data: existing } = await db
      .from('redi_phone_numbers')
      .select('phone_number')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.json({ phoneNumber: existing.phone_number, alreadyAssigned: true });
    }

    // Try to assign from pool
    const poolQuery = db
      .from('redi_phone_numbers')
      .select('*')
      .eq('status', 'available')
      .limit(1);

    if (areaCode) {
      poolQuery.eq('area_code', areaCode);
    }

    const { data: available } = await poolQuery.single();

    if (available) {
      await db
        .from('redi_phone_numbers')
        .update({
          user_id: userId,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
        })
        .eq('phone_number', available.phone_number);

      return res.json({ phoneNumber: available.phone_number, provisioned: false, assignedFromPool: true });
    }

    // Pool empty — provision new number from Twilio
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(503).json({ error: 'Twilio not configured for provisioning' });
    }

    const searchParams: any = { SmsEnabled: 'true', VoiceEnabled: 'true' };
    if (areaCode) searchParams.AreaCode = areaCode;

    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?${new URLSearchParams(searchParams)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': getTwilioAuth() },
    });
    const searchData = (await searchRes.json()) as any;

    if (!searchData.available_phone_numbers?.length) {
      return res.status(404).json({ error: 'No numbers available for this area code' });
    }

    const numberToBuy = searchData.available_phone_numbers[0].phone_number;

    // Purchase the number
    const purchaseRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': getTwilioAuth(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ PhoneNumber: numberToBuy }).toString(),
      },
    );

    const purchaseData = (await purchaseRes.json()) as any;

    if (!purchaseRes.ok) {
      return res.status(500).json({ error: purchaseData.message || 'Failed to provision number' });
    }

    // Store in database
    await db.from('redi_phone_numbers').insert({
      phone_number: purchaseData.phone_number,
      user_id: userId,
      area_code: areaCode || purchaseData.phone_number.slice(2, 5),
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    });

    res.json({ phoneNumber: purchaseData.phone_number, provisioned: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
