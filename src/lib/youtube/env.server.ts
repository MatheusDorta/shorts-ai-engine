import { parseEncryptionKey } from "./crypto";

export type YouTubeServerConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionKey: Buffer;
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getYouTubeServerConfig():
  { ok: true; config: YouTubeServerConfig } | { ok: false; missing: string[] } {
  const clientId = clean(process.env["YOUTUBE_CLIENT_ID"]);
  const clientSecret = clean(process.env["YOUTUBE_CLIENT_SECRET"]);
  const redirectUri = clean(process.env["YOUTUBE_REDIRECT_URI"]);
  const encryptionKeyRaw = clean(process.env["PLATFORM_CREDENTIALS_ENCRYPTION_KEY"]);
  const missing: string[] = [];

  if (!clientId) missing.push("YOUTUBE_CLIENT_ID");
  if (!clientSecret) missing.push("YOUTUBE_CLIENT_SECRET");
  if (!redirectUri) missing.push("YOUTUBE_REDIRECT_URI");
  if (!encryptionKeyRaw) missing.push("PLATFORM_CREDENTIALS_ENCRYPTION_KEY");

  if (missing.length) return { ok: false, missing };

  try {
    return {
      ok: true,
      config: {
        clientId: clientId!,
        clientSecret: clientSecret!,
        redirectUri: redirectUri!,
        encryptionKey: parseEncryptionKey(encryptionKeyRaw!),
      },
    };
  } catch {
    return { ok: false, missing: ["PLATFORM_CREDENTIALS_ENCRYPTION_KEY"] };
  }
}

export function youtubeAppConfigured(): boolean {
  return getYouTubeServerConfig().ok;
}
