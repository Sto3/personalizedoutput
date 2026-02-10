/**
 * Transport Deep Links — Uber, DoorDash, Instacart
 * ==================================================
 */

import { Router, Request, Response } from 'express';

const router = Router();

export function generateUberLink(pickupLat: number, pickupLng: number, destLat: number, destLng: number, destName?: string): { deepLink: string; webFallback: string } {
  const params = new URLSearchParams({
    'action': 'setPickup',
    'pickup[latitude]': pickupLat.toString(),
    'pickup[longitude]': pickupLng.toString(),
    'dropoff[latitude]': destLat.toString(),
    'dropoff[longitude]': destLng.toString(),
  });

  if (destName) params.set('dropoff[nickname]', destName);

  return {
    deepLink: `uber://?${params}`,
    webFallback: `https://m.uber.com/ul/?${params}`,
  };
}

export function generateDoorDashLink(restaurantName: string, address?: string): { deepLink: string; webFallback: string } {
  const query = encodeURIComponent(restaurantName + (address ? ` ${address}` : ''));
  return {
    deepLink: `doordash://store/search/${query}`,
    webFallback: `https://www.doordash.com/search/store/${query}`,
  };
}

export function generateInstacartLink(items: string[]): { deepLink: string; webFallback: string; groceryList: string[] } {
  const query = encodeURIComponent(items.join(', '));
  return {
    deepLink: `instacart://store/search/${query}`,
    webFallback: `https://www.instacart.com/store/search/${encodeURIComponent(items[0] || '')}`,
    groceryList: items,
  };
}

// POST /api/deeplinks/uber
router.post('/uber', (req: Request, res: Response) => {
  const { pickupLat, pickupLng, destLat, destLng, destName } = req.body;
  if (!pickupLat || !pickupLng || !destLat || !destLng) {
    return res.status(400).json({ error: 'pickupLat, pickupLng, destLat, destLng required' });
  }
  res.json(generateUberLink(pickupLat, pickupLng, destLat, destLng, destName));
});

// POST /api/deeplinks/doordash
router.post('/doordash', (req: Request, res: Response) => {
  const { restaurantName, address } = req.body;
  if (!restaurantName) return res.status(400).json({ error: 'restaurantName required' });
  res.json(generateDoorDashLink(restaurantName, address));
});

// POST /api/deeplinks/instacart
router.post('/instacart', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' });
  }
  res.json(generateInstacartLink(items));
});

export default router;
