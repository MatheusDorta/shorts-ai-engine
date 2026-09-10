import { supabase } from "@/integrations/supabase/client";
import { SIGNED_URL_TTL_SECONDS, STORAGE_BUCKET } from "@/lib/integrations-config";
import {
  formatMissingSupabaseConfig,
  getSupabasePublicConfig,
  SupabaseConfigError,
} from "@/lib/supabase-env";

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type MediaKind = "videos" | "thumbnails";

export async function uploadMedia(
  userId: string,
  contentId: string,
  kind: MediaKind,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const allowed = kind === "videos" ? videoTypes : imageTypes;
  const maximum = kind === "videos" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!allowed.has(file.type)) {
    throw new Error(`Unsupported ${kind === "videos" ? "video" : "image"} format.`);
  }
  if (file.size > maximum) {
    throw new Error(`File is larger than the ${kind === "videos" ? "500 MB" : "10 MB"} limit.`);
  }

  const config = getSupabasePublicConfig();
  if (!config.ok) {
    throw new SupabaseConfigError(formatMissingSupabaseConfig(config.missing));
  }
  const supabaseUrl = config.url;
  const supabaseKey = config.publishableKey;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in required");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${kind}/${contentId}/${crypto.randomUUID()}-${safeName}`;
  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${STORAGE_BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", supabaseKey);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.max(1, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error(parseStorageError(xhr.responseText) || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });

  return path;
}

function parseStorageError(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    return parsed.message || parsed.error || body;
  } catch {
    return body;
  }
}

export async function signedMediaUrl(path: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteMedia(path: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}
