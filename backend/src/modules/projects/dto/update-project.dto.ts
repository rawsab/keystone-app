import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  project_number?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  company_name?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  address_line_1?: string;

  @IsString()
  @IsOptional()
  address_line_2?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  city?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  region?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  postal_code?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
