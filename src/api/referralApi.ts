/**
 * Referral API Endpoints
 *
 * Handles referral code validation, usage, and rewards
 */

import { Router, Request, Response } from 'express';
import {
  validateReferralCode,
  useReferralCode,
  getPendingRewards,
  redeemReward,
  getReferralStats,
  getReferralCodeInfo,
  createReferralCode
} from '../lib/referrals/referralSystem';

const router = Router();

/**
 * POST /api/referral/validate
 * Validate a referral code without using it
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }

    const result = validateReferralCode(code);
    return res.json(result);
  } catch (error) {
    console.error('[Referral API] Validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating referral code'
    });
  }
});

/**
 * POST /api/referral/use
 * Use a referral code and apply discount
 */
router.post('/use', (req: Request, res: Response) => {
  try {
    const { code, orderId, orderAmount, email } = req.body;

    if (!code || !orderId || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Code, orderId, and orderAmount are required'
      });
    }

    const result = useReferralCode(code, orderId, orderAmount, email);
    return res.json(result);
  } catch (error) {
    console.error('[Referral API] Use error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error using referral code'
    });
  }
});

/**
 * GET /api/referral/rewards/:email
 * Check pending rewards for an email
 */
router.get('/rewards/:email', (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = getPendingRewards(email);
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Referral API] Rewards check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking rewards'
    });
  }
});

/**
 * POST /api/referral/redeem-reward
 * Redeem a referral reward
 */
router.post('/redeem-reward', (req: Request, res: Response) => {
  try {
    const { email, orderId } = req.body;

    if (!email || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Email and orderId are required'
      });
    }

    const result = redeemReward(email, orderId);
    return res.json(result);
  } catch (error) {
    console.error('[Referral API] Redeem error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error redeeming reward'
    });
  }
});

/**
 * GET /api/referral/stats
 * Get referral program statistics (admin only)
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = getReferralStats();
    return res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('[Referral API] Stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting stats'
    });
  }
});

/**
 * GET /api/referral/code/:code
 * Get info about a specific referral code
 */
router.get('/code/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const codeInfo = getReferralCodeInfo(code);

    if (!codeInfo) {
      return res.status(404).json({
        success: false,
        message: 'Referral code not found'
      });
    }

    return res.json({
      success: true,
      code: codeInfo
    });
  } catch (error) {
    console.error('[Referral API] Code info error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting code info'
    });
  }
});

/**
 * POST /api/referral/create
 * Create a new referral code for an order
 */
router.post('/create', (req: Request, res: Response) => {
  try {
    const { orderId, email, productId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required'
      });
    }

    const code = createReferralCode(orderId, email, productId);
    return res.json({
      success: true,
      code: code.code,
      discountPercent: code.discountPercent
    });
  } catch (error) {
    console.error('[Referral API] Create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating referral code'
    });
  }
});

export default router;
