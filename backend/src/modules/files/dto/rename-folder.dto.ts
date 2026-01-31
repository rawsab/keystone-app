import { IsString, MinLength, MaxLength } from 'class-validator';

export class RenameFolderDto {
  @IsString()
  @MinLength(1, { message: 'Folder name is required' })
  @MaxLength(255)
  name: string;
}
