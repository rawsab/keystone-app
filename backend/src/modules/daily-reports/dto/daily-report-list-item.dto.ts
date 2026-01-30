export class DailyReportCreatedByDto {
  id: string;
  full_name: string;
}

export class DailyReportListItemDto {
  id: string;
  report_date: string;
  status: string;
  created_by: DailyReportCreatedByDto;
  updated_at: string;
}
