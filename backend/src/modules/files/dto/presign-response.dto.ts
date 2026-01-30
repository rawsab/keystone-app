export class PresignResponseDto {
  upload_url: string;
  object_key: string;
}

export class PresignBatchItemDto {
  upload_url: string;
  object_key: string;
  original_filename: string;
}

export class PresignBatchResponseDto {
  items: PresignBatchItemDto[];
}
