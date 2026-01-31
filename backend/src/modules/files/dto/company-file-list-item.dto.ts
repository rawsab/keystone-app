export class CompanyFileUploadedByDto {
  id: string;
  full_name: string;
}

export class CompanyFileListItemDto {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by: CompanyFileUploadedByDto;
  project_id: string | null;
  project_name: string | null;
  object_key: string;
}
