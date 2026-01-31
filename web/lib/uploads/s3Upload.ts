/**
 * Uploads a file to S3 using a presigned PUT URL.
 * Only place that uses fetch for S3 PUT (allowed exception).
 */
export async function uploadViaPresign(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}
