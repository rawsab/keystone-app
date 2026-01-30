export class DailyReportCreatorDto {
  id: string;
  full_name: string;
}

export class DailyReportAttachmentDto {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

export class DailyReportResponseDto {
  id: string;
  project_id: string;
  report_date: string;
  status: string;
  work_completed_text: string;
  issues_delays_text: string | null;
  notes_text: string | null;
  weather_observed: any | null;
  hours_worked_total: number | null;
  created_by: DailyReportCreatorDto;
  submitted_at: string | null;
  updated_at: string;
  attachments: DailyReportAttachmentDto[];
}
