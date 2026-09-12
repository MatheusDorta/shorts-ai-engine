export function assertOwnedMediaPath(userId: string, path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.startsWith("/") || trimmed.includes("\\")) {
    throw new Error("Video file path is invalid.");
  }
  if (!trimmed.startsWith(`${userId}/`)) {
    throw new Error("Video file does not belong to this account.");
  }
  return trimmed;
}

export function guessVideoContentType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}
