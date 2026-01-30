import { IsOptional, IsString, IsNumber, IsObject } from 'class-validator';

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
  @IsNumber()
  hours_worked_total?: number;
}
