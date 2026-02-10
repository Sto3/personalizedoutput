/**
 * Weather Service — Open-Meteo API (free, no key needed)
 * =======================================================
 */

import { Router, Request, Response } from 'express';

const router = Router();

export interface WeatherData {
  current: {
    temperature: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
  };
  hourly: Array<{ time: string; temperature: number; precipitation: number }>;
  daily: Array<{ date: string; tempMax: number; tempMin: number; precipitationSum: number; weatherCode: number }>;
}

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
  55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 80: 'Slight rain showers',
  81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=3`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data = (await response.json()) as any;

  return {
    current: {
      temperature: data.current?.temperature_2m || 0,
      windSpeed: data.current?.wind_speed_10m || 0,
      weatherCode: data.current?.weather_code || 0,
      description: WEATHER_CODES[data.current?.weather_code] || 'Unknown',
    },
    hourly: (data.hourly?.time || []).slice(0, 24).map((time: string, i: number) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      precipitation: data.hourly.precipitation[i],
    })),
    daily: (data.daily?.time || []).map((date: string, i: number) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitationSum: data.daily.precipitation_sum[i],
      weatherCode: data.daily.weather_code[i],
    })),
  };
}

export function formatWeatherForLLM(weather: WeatherData): string {
  const c = weather.current;
  const today = weather.daily[0];
  return `Current: ${c.temperature}°C, ${c.description}, Wind: ${c.windSpeed}km/h. Today: High ${today?.tempMax}°C, Low ${today?.tempMin}°C, Precip: ${today?.precipitationSum}mm.`;
}

// GET /api/weather — get weather for coordinates
router.get('/', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'lat and lon parameters required' });
    }

    const weather = await getWeather(lat, lon);
    res.json(weather);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
