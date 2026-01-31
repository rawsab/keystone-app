import { Injectable } from '@nestjs/common';
import { OpenMeteoWeatherProvider } from './providers/open-meteo.provider';
import { WeatherSnapshot, WeatherSnapshotParams } from './interfaces/weather-provider.interface';

export type WeatherSnapshotResult = {
  snapshot: WeatherSnapshot;
  source: 'open-meteo';
};

export type WeatherSnapshotFailure = {
  reason: 'no_location' | 'open_meteo_error';
  message: string;
};

export type WeatherSnapshotOutcome =
  | { ok: true; result: WeatherSnapshotResult }
  | { ok: false; failure: WeatherSnapshotFailure };

@Injectable()
export class WeatherService {
  constructor(private readonly openMeteo: OpenMeteoWeatherProvider) {}

  async getDailySnapshotForReport(params: WeatherSnapshotParams): Promise<WeatherSnapshotOutcome> {
    console.log(
      '[WeatherService] getDailySnapshotForReport PAYLOAD received',
      JSON.stringify(params, null, 2),
    );

    const hasLocation =
      (params.latitude != null &&
        params.longitude != null &&
        !Number.isNaN(params.latitude) &&
        !Number.isNaN(params.longitude)) ||
      (params.locationLabel != null && params.locationLabel.trim().length >= 2) ||
      (params.city != null &&
        params.city.trim().length > 0 &&
        params.country != null &&
        params.country.trim().length > 0) ||
      (params.postalCode != null &&
        params.postalCode.trim().length > 0 &&
        params.country != null &&
        params.country.trim().length > 0);

    if (!hasLocation) {
      const msg = 'Project needs City and Country (or Postal code and Country) for weather.';
      console.log('[WeatherService] getDailySnapshotForReport: no usable location', {
        params: {
          date: params.date,
          locationLabel: params.locationLabel,
          city: params.city,
          country: params.country,
          postalCode: params.postalCode,
        },
      });
      return { ok: false, failure: { reason: 'no_location', message: msg } };
    }

    try {
      const snapshot = await this.openMeteo.getDailySnapshot(params);
      console.log('[WeatherService] getDailySnapshotForReport RESPONSE success', {
        temp_min_c: snapshot.temp_min_c,
        temp_max_c: snapshot.temp_max_c,
        conditions: snapshot.conditions,
      });
      return { ok: true, result: { snapshot, source: 'open-meteo' } };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[WeatherService] getDailySnapshotForReport failed', {
        date: params.date,
        locationLabel: params.locationLabel,
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
      });
      return { ok: false, failure: { reason: 'open_meteo_error', message } };
    }
  }

  formatSummaryText(snapshot: WeatherSnapshot): string {
    const parts: string[] = [];
    if (snapshot.temp_max_c != null && snapshot.temp_min_c != null) {
      parts.push(
        `High ${Math.round(snapshot.temp_max_c)}°C / Low ${Math.round(snapshot.temp_min_c)}°C`,
      );
    } else if (snapshot.temp_max_c != null) {
      parts.push(`High ${Math.round(snapshot.temp_max_c)}°C`);
    } else if (snapshot.temp_min_c != null) {
      parts.push(`Low ${Math.round(snapshot.temp_min_c)}°C`);
    }
    if (snapshot.precipitation_mm != null) {
      parts.push(`Precip ${Number(snapshot.precipitation_mm).toFixed(1)}mm`);
    }
    if (snapshot.wind_max_kph != null) {
      parts.push(`Wind ${Math.round(snapshot.wind_max_kph)}kph`);
    }
    if (snapshot.conditions) {
      parts.push(snapshot.conditions);
    }
    return parts.length ? parts.join(' • ') : 'No data';
  }
}
