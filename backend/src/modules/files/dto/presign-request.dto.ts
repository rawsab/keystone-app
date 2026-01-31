import {
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  IsOptional,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilePresignItem {
  @IsString()
  original_filename: string;

  @IsString()
  mime_type: string;

  @IsNumber()
  @Max(52428800)
  size_bytes: number;
}

export class PresignRequestDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsString()
  original_filename?: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsNumber()
  @Max(52428800)
  size_bytes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilePresignItem)
  files?: FilePresignItem[];
}
