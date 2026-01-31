import { IsString, IsNumber, IsUUID, Max, IsOptional } from 'class-validator';

export class FinalizeRequestDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  folder_id?: string;

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
