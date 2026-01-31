import { IsOptional, IsString, IsNumber, IsObject, IsBoolean } from 'class-validator';

export class UpdateDailyReportDto {
  @IsOptional()
  @IsString()
  work_completed_text?: string;

  @IsOptional()
  @IsString()
  issues_delays_text?: string;

  @IsOptional()
  @IsString()
  notes_text?: string;

  @IsOptional()
  @IsObject()
  weather_observed?: any;

  @IsOptional()
  @IsString()
  weather_observed_text?: string;

  @IsOptional()
  @IsObject()
  weather_observed_flags?: Record<string, boolean>;

  @IsOptional()
  @IsNumber()
  hours_worked_total?: number;

  /** When true, clears the auto-captured weather snapshot (source, taken_at, summary). */
  @IsOptional()
  @IsBoolean()
  clear_weather_snapshot?: boolean;
}
