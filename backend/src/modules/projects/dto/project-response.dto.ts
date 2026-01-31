export class ProjectResponseDto {
  id: string;
  project_number: string;
  name: string;
  company_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  address_display: string;
  location?: string;
  status: string;
  updated_at: string;
}
