import { FileResponseDto } from './file-response.dto';
import { FolderListItemDto } from './folder-list-item.dto';

export class ProjectContentsDto {
  folders: FolderListItemDto[];
  files: FileResponseDto[];
}
