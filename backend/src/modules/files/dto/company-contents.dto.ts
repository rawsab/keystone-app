import { CompanyFileListItemDto } from './company-file-list-item.dto';
import { FolderListItemDto } from './folder-list-item.dto';

export class CompanyContentsDto {
  folders: FolderListItemDto[];
  files: CompanyFileListItemDto[];
}
