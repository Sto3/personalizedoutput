/**
 * Yelp Service — Restaurant search & booking
 * ============================================
 * Yelp Fusion API for search. Booking via partner API (when available).
 */

import { Router, Request, Response } from 'express';

const router = Router();

const YELP_API_KEY = process.env.YELP_API_KEY || '';

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  price: string;
  address: string;
  phone: string;
  imageUrl: string;
  categories: string[];
  hours: any;
  distance: number;
  url: string;
}

// GET /api/booking/search
router.get('/search', async (req: Request, res: Response) => {
  try {
    if (!YELP_API_KEY) return res.status(503).json({ error: 'Yelp API not configured' });

    const { term, location, latitude, longitude, price, categories, open_now, limit } = req.query;

    const params = new URLSearchParams();
    if (term) params.set('term', term as string);
    if (location) params.set('location', location as string);
    if (latitude) params.set('latitude', latitude as string);
    if (longitude) params.set('longitude', longitude as string);
    if (price) params.set('price', price as string);
    if (categories) params.set('categories', categories as string);
    if (open_now) params.set('open_now', 'true');
    params.set('limit', (limit as string) || '10');

    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?${params}`,
      { headers: { 'Authorization': `Bearer ${YELP_API_KEY}` } },
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Yelp API error: ${err}` });
    }

    const data = (await response.json()) as any;

    const restaurants: Restaurant[] = (data.businesses || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      rating: b.rating,
      reviewCount: b.review_count,
      price: b.price || '',
      address: b.location?.display_address?.join(', ') || '',
      phone: b.display_phone || '',
      imageUrl: b.image_url || '',
      categories: (b.categories || []).map((c: any) => c.title),
      distance: Math.round(b.distance),
      url: b.url,
    }));

    res.json({ restaurants, total: data.total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/booking/:businessId/detail — get business details
router.get('/:businessId/detail', async (req: Request, res: Response) => {
  try {
    if (!YELP_API_KEY) return res.status(503).json({ error: 'Yelp API not configured' });

    const response = await fetch(
      `https://api.yelp.com/v3/businesses/${req.params.businessId}`,
      { headers: { 'Authorization': `Bearer ${YELP_API_KEY}` } },
    );

    if (!response.ok) return res.status(response.status).json({ error: 'Business not found' });

    const data = (await response.json()) as any;
    res.json({
      id: data.id,
      name: data.name,
      rating: data.rating,
      price: data.price,
      phone: data.display_phone,
      address: data.location?.display_address?.join(', '),
      hours: data.hours,
      photos: data.photos,
      categories: (data.categories || []).map((c: any) => c.title),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/booking/deeplink — generate fallback booking links
router.post('/deeplink', async (req: Request, res: Response) => {
  const { restaurantName, location } = req.body;
  if (!restaurantName) return res.status(400).json({ error: 'restaurantName required' });

  const query = encodeURIComponent(`${restaurantName} ${location || ''}`);

  res.json({
    openTable: `https://www.opentable.com/s?term=${query}`,
    resy: `https://resy.com/cities/ny?query=${encodeURIComponent(restaurantName)}`,
    google: `https://www.google.com/maps/search/${query}`,
  });
});

export default router;
