export class FolderListItemDto {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  total_size_bytes: number;
}
