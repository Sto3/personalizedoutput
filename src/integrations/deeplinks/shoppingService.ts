/**
 * Shopping & Travel Deep Links
 * =============================
 * Target, Walmart, Booking.com, Expedia, Zillow
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Shopping
export function generateTargetLink(query: string): string {
  return `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`;
}

export function generateWalmartLink(query: string): string {
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
}

// Travel
export function generateBookingLink(destination: string, checkin: string, checkout: string, guests: number): string {
  const params = new URLSearchParams({
    ss: destination,
    checkin,
    checkout,
    group_adults: guests.toString(),
    no_rooms: '1',
  });
  return `https://www.booking.com/searchresults.html?${params}`;
}

export function generateExpediaLink(destination: string, checkin: string, checkout: string, guests: number): string {
  const params = new URLSearchParams({
    destination,
    startDate: checkin,
    endDate: checkout,
    adults: guests.toString(),
    rooms: '1',
  });
  return `https://www.expedia.com/Hotel-Search?${params}`;
}

// Real Estate
export function generateZillowLink(location: string, minPrice?: number, maxPrice?: number, bedrooms?: number): string {
  let url = `https://www.zillow.com/homes/${encodeURIComponent(location)}_rb/`;
  const filters: string[] = [];
  if (minPrice) filters.push(`price-${minPrice}`);
  if (maxPrice) filters.push(`${maxPrice}`);
  if (bedrooms) filters.push(`${bedrooms}-bd`);
  if (filters.length) url += `${filters.join('-')}/`;
  return url;
}

// POST /api/deeplinks/shopping
router.post('/shopping', (req: Request, res: Response) => {
  const { query, store } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  const links: Record<string, string> = {
    target: generateTargetLink(query),
    walmart: generateWalmartLink(query),
    amazon: `https://www.amazon.com/s?k=${encodeURIComponent(query)}`,
  };

  if (store && links[store.toLowerCase()]) {
    return res.json({ url: links[store.toLowerCase()], store });
  }

  res.json({ links });
});

// POST /api/deeplinks/travel
router.post('/travel', (req: Request, res: Response) => {
  const { destination, checkin, checkout, guests } = req.body;
  if (!destination || !checkin || !checkout) {
    return res.status(400).json({ error: 'destination, checkin, checkout required' });
  }

  res.json({
    booking: generateBookingLink(destination, checkin, checkout, guests || 2),
    expedia: generateExpediaLink(destination, checkin, checkout, guests || 2),
  });
});

// POST /api/deeplinks/realestate
router.post('/realestate', (req: Request, res: Response) => {
  const { location, minPrice, maxPrice, bedrooms } = req.body;
  if (!location) return res.status(400).json({ error: 'location required' });

  res.json({
    zillow: generateZillowLink(location, minPrice, maxPrice, bedrooms),
  });
});

export default router;
