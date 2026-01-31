import { Injectable } from '@nestjs/common';
import {
  WeatherProvider,
  WeatherSnapshot,
  WeatherSnapshotParams,
} from '../interfaces/weather-provider.interface';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

interface GeocodingResultItem {
  latitude: number;
  longitude: number;
  name?: string;
  country_code?: string;
}

interface GeocodingResult {
  results?: GeocodingResultItem[];
}

interface ArchiveDaily {
  time?: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  precipitation_sum?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
  weather_code?: (number | null)[];
}

interface ArchiveResponse {
  daily?: ArchiveDaily;
  latitude?: number;
  longitude?: number;
}

interface ForecastDaily {
  time?: string[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  precipitation_sum?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
  weather_code?: (number | null)[];
}

interface ForecastResponse {
  daily?: ForecastDaily;
  latitude?: number;
  longitude?: number;
}

const WMO_CODE_TO_CONDITIONS: Record<number, string> = {
  0: 'clear',
  1: 'mainly_clear',
  2: 'partly_cloudy',
  3: 'cloudy',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'rain',
  81: 'rain',
  82: 'rain',
  85: 'snow',
  86: 'snow',
  95: 'thunderstorm',
  96: 'thunderstorm',
  99: 'thunderstorm',
};

function codeToConditions(code: number | null): string | null {
  if (code == null) return null;
  return WMO_CODE_TO_CONDITIONS[code] ?? 'unknown';
}

/** Map common country names to ISO 3166-1 alpha-2 for Open-Meteo geocoding */
function countryToCode(country: string): string | null {
  const n = country?.trim().toLowerCase();
  if (!n) return null;
  const map: Record<string, string> = {
    canada: 'CA',
    usa: 'US',
    'united states': 'US',
    'united states of america': 'US',
    'united kingdom': 'GB',
    uk: 'GB',
    australia: 'AU',
    germany: 'DE',
    france: 'FR',
    mexico: 'MX',
  };
  return map[n] ?? (n.length === 2 ? n.toUpperCase() : null);
}

/** Report date is within the last 6 days (today + past 5). Historical API has ~5-day delay. */
function isRecentDate(dateStr: string): boolean {
  const report = new Date(dateStr + 'T12:00:00Z');
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - report.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= 5;
}

@Injectable()
export class OpenMeteoWeatherProvider implements WeatherProvider {
  private async geocodeOne(
    query: string,
    countryCode?: string | null,
  ): Promise<{ lat: number; lon: number } | null> {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) {
      console.log('[OpenMeteo] geocode: skip (query too short)', { query: trimmed });
      return null;
    }
    const url = new URL(GEOCODING_URL);
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', countryCode ? '10' : '1');
    if (countryCode) url.searchParams.set('countryCode', countryCode);
    const urlStr = url.toString();
    console.log('[OpenMeteo] geocode request', {
      query: trimmed,
      countryCode: countryCode ?? undefined,
      url: urlStr,
    });
    const res = await fetch(urlStr, { signal: AbortSignal.timeout(5000) });
    console.log('[OpenMeteo] geocode response', { query: trimmed, status: res.status, ok: res.ok });
    if (!res.ok) {
      const text = await res.text();
      console.log('[OpenMeteo] geocode error body', { query: trimmed, body: text.slice(0, 200) });
      return null;
    }
    const data = (await res.json()) as GeocodingResult;
    const results = data.results ?? [];
    console.log('[OpenMeteo] geocode RESPONSE body', {
      query: trimmed,
      resultsCount: results.length,
      countryCodes: results.map((r) => r.country_code),
    });
    const first = countryCode
      ? (results.find((r) => (r.country_code ?? '').toUpperCase() === countryCode.toUpperCase()) ??
        results[0])
      : results[0];
    if (!first) {
      console.log('[OpenMeteo] geocode: no results', { query: trimmed });
      return null;
    }
    console.log('[OpenMeteo] geocode success', {
      query: trimmed,
      lat: first.latitude,
      lon: first.longitude,
      country_code: first.country_code,
    });
    return { lat: first.latitude, lon: first.longitude };
  }

  private async resolveCoordinates(
    params: WeatherSnapshotParams,
  ): Promise<{ lat: number; lon: number } | null> {
    if (
      params.latitude != null &&
      params.longitude != null &&
      !Number.isNaN(params.latitude) &&
      !Number.isNaN(params.longitude)
    ) {
      console.log('[OpenMeteo] using provided coordinates', {
        lat: params.latitude,
        lon: params.longitude,
      });
      return { lat: params.latitude, lon: params.longitude };
    }

    const countryCode = params.country ? countryToCode(params.country) : null;
    console.log('[OpenMeteo] resolveCoordinates: countryCode for API', {
      raw: params.country,
      resolved: countryCode,
    });
    // Prefer short queries with countryCode so Open-Meteo can match (e.g. "Waterloo" + countryCode=CA)
    const toTry: { query: string; countryCode: string | null }[] = [];
    if (params.city?.trim()) {
      toTry.push({ query: params.city.trim(), countryCode });
      if (params.country?.trim())
        toTry.push({ query: `${params.city.trim()}, ${params.country.trim()}`, countryCode });
    }
    if (params.postalCode?.trim()) {
      toTry.push({ query: params.postalCode.trim(), countryCode });
      if (params.country?.trim())
        toTry.push({ query: `${params.postalCode.trim()}, ${params.country.trim()}`, countryCode });
    }
    if (params.locationLabel?.trim()) {
      toTry.push({ query: params.locationLabel.trim(), countryCode });
    }
    console.log('[OpenMeteo] resolveCoordinates: geocode queries to try', {
      queries: toTry.map((t) => t.query),
      countryCode,
    });

    for (const { query, countryCode: cc } of toTry) {
      const coords = await this.geocodeOne(query, cc);
      if (coords) return coords;
    }
    console.log('[OpenMeteo] resolveCoordinates: no coords from any query');
    return null;
  }

  private async fetchFromArchive(
    coords: { lat: number; lon: number },
    dateStr: string,
  ): Promise<Omit<WeatherSnapshot, 'date' | 'location_label'>> {
    const url = new URL(ARCHIVE_URL);
    url.searchParams.set('latitude', String(coords.lat));
    url.searchParams.set('longitude', String(coords.lon));
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);
    url.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code',
    );
    url.searchParams.set('timezone', 'UTC');

    console.log('[OpenMeteo] Archive API REQUEST', {
      date: dateStr,
      lat: coords.lat,
      lon: coords.lon,
      url: url.toString(),
    });
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const bodyText = await res.text();
    console.log('[OpenMeteo] Archive API RESPONSE', {
      status: res.status,
      ok: res.ok,
      bodyLength: bodyText.length,
      bodyPreview: bodyText.slice(0, 400),
    });
    if (!res.ok) {
      console.log('[OpenMeteo] Archive API error body', {
        status: res.status,
        body: bodyText.slice(0, 300),
      });
      throw new Error(`Archive API ${res.status}: ${bodyText || res.statusText}`);
    }
    const data = JSON.parse(bodyText) as ArchiveResponse;
    const daily = data.daily;
    if (!daily?.time?.length) {
      console.log('[OpenMeteo] Archive API: no daily.time in response', {
        dailyKeys: daily ? Object.keys(daily) : null,
      });
      throw new Error(
        'Archive API returned no daily data (date may be too recent; historical data has ~5-day delay)',
      );
    }

    const tempMax = daily.temperature_2m_max?.[0] ?? null;
    const tempMin = daily.temperature_2m_min?.[0] ?? null;
    const precip = daily.precipitation_sum?.[0] ?? null;
    const windMax = daily.wind_speed_10m_max?.[0] ?? null;
    const code = daily.weather_code?.[0] ?? null;
    console.log('[OpenMeteo] Archive API success', {
      date: dateStr,
      tempMin,
      tempMax,
      precip,
      windMax,
      code,
    });

    return {
      temp_min_c: tempMin,
      temp_max_c: tempMax,
      precipitation_mm: precip,
      wind_max_kph: windMax,
      conditions: codeToConditions(code),
      raw: {
        source: 'archive',
        latitude: data.latitude,
        longitude: data.longitude,
        date: dateStr,
        temperature_2m_max: tempMax,
        temperature_2m_min: tempMin,
        precipitation_sum: precip,
        wind_speed_10m_max: windMax,
        weather_code: code,
      },
    };
  }

  private async fetchFromForecast(
    coords: { lat: number; lon: number },
    dateStr: string,
  ): Promise<Omit<WeatherSnapshot, 'date' | 'location_label'>> {
    const url = new URL(FORECAST_URL);
    url.searchParams.set('latitude', String(coords.lat));
    url.searchParams.set('longitude', String(coords.lon));
    url.searchParams.set('start_date', dateStr);
    url.searchParams.set('end_date', dateStr);
    url.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code',
    );
    url.searchParams.set('timezone', 'UTC');

    console.log('[OpenMeteo] Forecast API REQUEST', {
      date: dateStr,
      lat: coords.lat,
      lon: coords.lon,
      url: url.toString(),
    });
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const bodyText = await res.text();
    console.log('[OpenMeteo] Forecast API RESPONSE', {
      status: res.status,
      ok: res.ok,
      bodyLength: bodyText.length,
      bodyPreview: bodyText.slice(0, 400),
    });
    if (!res.ok) {
      console.log('[OpenMeteo] Forecast API error body', {
        status: res.status,
        body: bodyText.slice(0, 300),
      });
      throw new Error(`Forecast API ${res.status}: ${bodyText || res.statusText}`);
    }
    const data = JSON.parse(bodyText) as ForecastResponse;
    const daily = data.daily;
    if (!daily?.time?.length) {
      console.log('[OpenMeteo] Forecast API: no daily.time in response', {
        dailyKeys: daily ? Object.keys(daily) : null,
      });
      throw new Error('Forecast API returned no daily data for this date');
    }

    const tempMax = daily.temperature_2m_max?.[0] ?? null;
    const tempMin = daily.temperature_2m_min?.[0] ?? null;
    const precip = daily.precipitation_sum?.[0] ?? null;
    const windMax = daily.wind_speed_10m_max?.[0] ?? null;
    const code = daily.weather_code?.[0] ?? null;
    console.log('[OpenMeteo] Forecast API success', {
      date: dateStr,
      tempMin,
      tempMax,
      precip,
      windMax,
      code,
    });

    return {
      temp_min_c: tempMin,
      temp_max_c: tempMax,
      precipitation_mm: precip,
      wind_max_kph: windMax,
      conditions: codeToConditions(code),
      raw: {
        source: 'forecast',
        latitude: data.latitude,
        longitude: data.longitude,
        date: dateStr,
        temperature_2m_max: tempMax,
        temperature_2m_min: tempMin,
        precipitation_sum: precip,
        wind_speed_10m_max: windMax,
        weather_code: code,
      },
    };
  }

  async getDailySnapshot(params: WeatherSnapshotParams): Promise<WeatherSnapshot> {
    console.log('[OpenMeteo] getDailySnapshot', {
      date: params.date,
      locationLabel: params.locationLabel,
      city: params.city,
      postalCode: params.postalCode,
      country: params.country,
    });

    const coords = await this.resolveCoordinates(params);
    if (!coords) {
      console.log('[OpenMeteo] getDailySnapshot failed: no coordinates');
      throw new Error(
        'Could not resolve coordinates. Ensure the project has a valid address (city and country, or postal code and country).',
      );
    }

    const recent = isRecentDate(params.date);
    console.log('[OpenMeteo] date check', {
      date: params.date,
      isRecent: recent,
      usingApi: recent ? 'Forecast (then Archive fallback)' : 'Archive',
    });

    let daily: Omit<WeatherSnapshot, 'date' | 'location_label'>;
    try {
      daily = recent
        ? await this.fetchFromForecast(coords, params.date)
        : await this.fetchFromArchive(coords, params.date);
    } catch (recentError) {
      console.log('[OpenMeteo] primary API failed', {
        recent,
        error: recentError instanceof Error ? recentError.message : String(recentError),
      });
      if (recent) {
        try {
          console.log('[OpenMeteo] trying Archive as fallback for recent date');
          daily = await this.fetchFromArchive(coords, params.date);
        } catch (fallbackErr) {
          console.log('[OpenMeteo] Archive fallback failed', {
            error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          });
          throw recentError;
        }
      } else {
        throw recentError;
      }
    }

    console.log('[OpenMeteo] getDailySnapshot success', {
      date: params.date,
      location_label: params.locationLabel,
    });
    return {
      date: params.date,
      location_label: params.locationLabel,
      ...daily,
    };
  }
}
