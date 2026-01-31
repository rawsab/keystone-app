import { IsString, MinLength } from 'class-validator';

export class RenameFileDto {
  @IsString()
  @MinLength(1, { message: 'File name is required' })
  file_name: string;
}
