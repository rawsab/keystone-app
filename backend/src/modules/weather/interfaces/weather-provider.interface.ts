export interface WeatherSnapshotParams {
  date: string; // YYYY-MM-DD
  locationLabel: string;
  latitude?: number;
  longitude?: number;
  /** Prefer "city, country" for geocoding when full address fails */
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface WeatherSnapshot {
  date: string;
  location_label: string;
  temp_min_c: number | null;
  temp_max_c: number | null;
  precipitation_mm: number | null;
  wind_max_kph: number | null;
  conditions: string | null;
  raw: Record<string, unknown>; // bounded for audit/debug
}

export interface WeatherProvider {
  getDailySnapshot(params: WeatherSnapshotParams): Promise<WeatherSnapshot>;
}
