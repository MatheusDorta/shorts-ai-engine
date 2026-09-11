import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { decryptSecret, encryptSecret } from "./crypto";
import type { YouTubeServerConfig } from "./env.server";

const PLATFORM = "youtube_shorts" as const;

export type StoredYouTubeCredential = {
  id: string;
  userId: string;
  encryptedRefreshToken: string;
  tokenExpiresAt: string | null;
  youtubeChannelId: string | null;
};

export async function upsertYoutubeCredential(input: {
  userId: string;
  refreshToken: string;
  tokenExpiresAt: string | null;
  youtubeChannelId: string;
  config: YouTubeServerConfig;
}): Promise<void> {
  const encryptedRefreshToken = encryptSecret(input.refreshToken, input.config.encryptionKey);
  const { error } = await supabaseAdmin.from("platform_credentials").upsert(
    {
      user_id: input.userId,
      platform: PLATFORM,
      encrypted_refresh_token: encryptedRefreshToken,
      token_expires_at: input.tokenExpiresAt,
      youtube_channel_id: input.youtubeChannelId,
    },
    { onConflict: "user_id,platform" },
  );
  if (error) throw error;
}

export async function getYoutubeCredential(
  userId: string,
): Promise<StoredYouTubeCredential | null> {
  const { data, error } = await supabaseAdmin
    .from("platform_credentials")
    .select("id,user_id,encrypted_refresh_token,token_expires_at,youtube_channel_id")
    .eq("user_id", userId)
    .eq("platform", PLATFORM)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    encryptedRefreshToken: data.encrypted_refresh_token,
    tokenExpiresAt: data.token_expires_at,
    youtubeChannelId: data.youtube_channel_id,
  };
}

export async function deleteYoutubeCredential(userId: string): Promise<string | null> {
  const existing = await getYoutubeCredential(userId);
  if (!existing) return null;
  const { error } = await supabaseAdmin
    .from("platform_credentials")
    .delete()
    .eq("user_id", userId)
    .eq("platform", PLATFORM);
  if (error) throw error;
  return existing.encryptedRefreshToken;
}

export function decryptRefreshToken(encrypted: string, config: YouTubeServerConfig): string {
  return decryptSecret(encrypted, config.encryptionKey);
}

export async function upsertYoutubeAccount(input: {
  userId: string;
  connected: boolean;
  channelName: string | null;
  channelId: string | null;
}): Promise<void> {
  const notes = input.connected && input.channelId ? `channel:${input.channelId}` : null;
  const { error } = await supabaseAdmin.from("platform_accounts").upsert(
    {
      user_id: input.userId,
      platform: PLATFORM,
      is_connected: input.connected,
      account_name: input.connected ? input.channelName : null,
      notes,
    },
    { onConflict: "user_id,platform" },
  );
  if (error) throw error;
}

export async function getYoutubeAccount(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("platform_accounts")
    .select("is_connected,account_name,notes")
    .eq("user_id", userId)
    .eq("platform", PLATFORM)
    .maybeSingle();
  if (error) throw error;
  return data;
}
