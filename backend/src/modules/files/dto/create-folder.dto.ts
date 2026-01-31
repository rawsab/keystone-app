import { IsString, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MinLength(1, { message: 'Folder name is required' })
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsUUID()
  parent_folder_id?: string;
}
