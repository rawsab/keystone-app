import { IsString, IsNumber, IsUUID, Max } from 'class-validator';

export class FinalizeRequestDto {
  @IsUUID()
  project_id: string;

  @IsString()
  object_key: string;

  @IsString()
  original_filename: string;

  @IsString()
  mime_type: string;

  @IsNumber()
  @Max(52428800)
  size_bytes: number;
}
