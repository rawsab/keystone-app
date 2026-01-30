export class FileUploadedByDto {
  id: string;
  full_name: string;
}

export class FileResponseDto {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: FileUploadedByDto;
  created_at: string;
}
