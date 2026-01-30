import { IsString, Matches } from 'class-validator';

export class CreateDailyReportDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'report_date must be in YYYY-MM-DD format',
  })
  report_date: string;
}
