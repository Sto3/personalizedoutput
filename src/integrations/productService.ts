/**
 * Product Service — Barcode/product scanning via Open Food Facts
 * ==============================================================
 * Free API, no key needed. Allergen/nutrition info.
 */

import { Router, Request, Response } from 'express';

const router = Router();

export interface ProductInfo {
  found: boolean;
  barcode: string;
  name: string;
  brand: string;
  ingredients: string;
  allergens: string[];
  nutritionFacts: {
    energy: string;
    fat: string;
    carbs: string;
    protein: string;
    sugar: string;
    salt: string;
  };
  nutriScore: string;
  imageUrl: string;
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);

  if (!response.ok) {
    return { found: false, barcode, name: '', brand: '', ingredients: '', allergens: [], nutritionFacts: { energy: '', fat: '', carbs: '', protein: '', sugar: '', salt: '' }, nutriScore: '', imageUrl: '' };
  }

  const data = (await response.json()) as any;
  const product = data.product;

  if (!product) {
    return { found: false, barcode, name: '', brand: '', ingredients: '', allergens: [], nutritionFacts: { energy: '', fat: '', carbs: '', protein: '', sugar: '', salt: '' }, nutriScore: '', imageUrl: '' };
  }

  const allergens = (product.allergens_tags || []).map((a: string) =>
    a.replace('en:', '').replace(/-/g, ' '),
  );

  const nutrients = product.nutriments || {};

  return {
    found: true,
    barcode,
    name: product.product_name || 'Unknown product',
    brand: product.brands || '',
    ingredients: product.ingredients_text || '',
    allergens,
    nutritionFacts: {
      energy: nutrients['energy-kcal_100g'] ? `${nutrients['energy-kcal_100g']} kcal/100g` : '',
      fat: nutrients.fat_100g ? `${nutrients.fat_100g}g/100g` : '',
      carbs: nutrients.carbohydrates_100g ? `${nutrients.carbohydrates_100g}g/100g` : '',
      protein: nutrients.proteins_100g ? `${nutrients.proteins_100g}g/100g` : '',
      sugar: nutrients.sugars_100g ? `${nutrients.sugars_100g}g/100g` : '',
      salt: nutrients.salt_100g ? `${nutrients.salt_100g}g/100g` : '',
    },
    nutriScore: product.nutriscore_grade || '',
    imageUrl: product.image_url || '',
  };
}

export function checkAllergens(productAllergens: string[], userAllergens: string[]): string[] {
  const userAllergensLower = userAllergens.map((a) => a.toLowerCase());
  return productAllergens.filter((a) =>
    userAllergensLower.some((ua) => a.toLowerCase().includes(ua) || ua.includes(a.toLowerCase())),
  );
}

// GET /api/product/barcode/:barcode — look up product
router.get('/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const product = await lookupBarcode(req.params.barcode);
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/product/allergen-check — check product against user allergens
router.post('/allergen-check', async (req: Request, res: Response) => {
  try {
    const { barcode, userAllergens } = req.body;
    if (!barcode || !userAllergens) {
      return res.status(400).json({ error: 'barcode and userAllergens required' });
    }

    const product = await lookupBarcode(barcode);
    if (!product.found) {
      return res.json({ found: false, barcode });
    }

    const matches = checkAllergens(product.allergens, userAllergens);

    res.json({
      product: product.name,
      brand: product.brand,
      allergenAlert: matches.length > 0,
      matchedAllergens: matches,
      allAllergens: product.allergens,
      warning: matches.length > 0
        ? `WARNING: This product contains ${matches.join(', ')}`
        : 'No matching allergens detected',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
