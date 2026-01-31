export function formatFileSize(bytes: number): string {
  const n = Number(bytes);
  if (n === 0 || !Number.isFinite(n) || n < 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1);
  return `${Number((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
