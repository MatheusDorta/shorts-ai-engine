import { supabase } from "@/integrations/supabase/client";
import { STORAGE_BUCKET } from "@/lib/integrations-config";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadMedia(
  userId: string,
  contentId: string,
  kind: "videos" | "thumbnails",
  file: File,
) {
  const allowed = kind === "videos" ? videoTypes : imageTypes;
  const maximum = kind === "videos" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!allowed.has(file.type))
    throw new Error(`Unsupported ${kind === "videos" ? "video" : "image"} format.`);
  if (file.size > maximum)
    throw new Error(`File is larger than the ${kind === "videos" ? "500 MB" : "10 MB"} limit.`);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${kind}/${contentId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedMediaUrl(path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteMedia(path: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
