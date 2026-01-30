import { IsUUID } from 'class-validator';

export class AttachFileDto {
  @IsUUID()
  file_object_id: string;
}
