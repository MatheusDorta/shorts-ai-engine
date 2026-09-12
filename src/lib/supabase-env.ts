export class SupabaseConfigError extends Error {
  readonly code = "SUPABASE_CONFIG_MISSING";

  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

export type ResolvedSupabasePublicConfig =
  { ok: true; url: string; publishableKey: string } | { ok: false; missing: string[] };

const PLACEHOLDER_URLS = new Set(["https://your-project.supabase.co", "your-project.supabase.co"]);
const PLACEHOLDER_KEYS = new Set(["your_publishable_key", "your-anon-key", "your_anon_key"]);

// Public browser configuration for this project's existing Lovable Cloud backend.
// These values identify the project but do not grant privileged access; database
// access remains protected by authentication and row-level security.
const MANAGED_PUBLIC_URL = "https://qpaqbamlpfneblgnjakl.supabase.co";
const MANAGED_PUBLISHABLE_KEY = "sb_publishable_nf9tgYmegDuJzKFhCz0rAA_eeNXziXw";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPlaceholderUrl(value: string) {
  return PLACEHOLDER_URLS.has(value);
}

function isPlaceholderKey(value: string) {
  return PLACEHOLDER_KEYS.has(value);
}

function looksLikeSecretKey(value: string) {
  return value.startsWith("sb_secret_") || value.includes("service_role");
}

export function resolveSupabasePublicConfig(input: {
  viteUrl?: string | undefined;
  viteKey?: string | undefined;
  serverUrl?: string | undefined;
  serverKey?: string | undefined;
}): ResolvedSupabasePublicConfig {
  const url = clean(input.viteUrl) ?? clean(input.serverUrl);
  const publishableKey = clean(input.viteKey) ?? clean(input.serverKey);
  const missing: string[] = [];

  if (!url || isPlaceholderUrl(url)) {
    missing.push("VITE_SUPABASE_URL");
  }
  if (!publishableKey || isPlaceholderKey(publishableKey)) {
    missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  } else if (looksLikeSecretKey(publishableKey)) {
    missing.push(
      "VITE_SUPABASE_PUBLISHABLE_KEY must be the publishable/anon key, not a secret key",
    );
  }

  if (missing.length || !url || !publishableKey) {
    return {
      ok: false,
      missing: missing.length ? missing : ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"],
    };
  }

  return { ok: true, url, publishableKey };
}

export function formatMissingSupabaseConfig(missing: string[]) {
  return [
    `Missing required Supabase configuration: ${missing.join(", ")}.`,
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the deployment environment to the existing Supabase project.",
    "Do not provision a new database.",
  ].join(" ");
}

export function isSupabaseConfigError(error: unknown) {
  if (error instanceof SupabaseConfigError) return true;
  return error instanceof Error && error.name === "SupabaseConfigError";
}

function readProcessEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[name];
  return typeof value === "string" ? value : undefined;
}

export function getSupabasePublicConfig(): ResolvedSupabasePublicConfig {
  return resolveSupabasePublicConfig({
    viteUrl:
      (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? MANAGED_PUBLIC_URL,
    viteKey:
      (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ??
      MANAGED_PUBLISHABLE_KEY,
    serverUrl: readProcessEnv("SUPABASE_URL"),
    serverKey: readProcessEnv("SUPABASE_PUBLISHABLE_KEY"),
  });
}

export function isSupabaseConfigured() {
  return getSupabasePublicConfig().ok;
}
