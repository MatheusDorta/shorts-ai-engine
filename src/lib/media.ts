import { supabase } from "@/integrations/supabase/client";
import { SIGNED_URL_TTL_SECONDS, STORAGE_BUCKET } from "@/lib/integrations-config";

/** Uploads a private file into the signed-in user's own folder. */
export async function uploadUserFile(userId: string, file: File, kind: "video" | "thumb") {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Files are private: always read them through a short-lived signed URL. */
export async function getSignedUrl(path?: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

export async function removeUserFile(path?: string | null) {
  if (!path) return;
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
