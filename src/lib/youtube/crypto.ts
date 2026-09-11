import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const VERSION = "v1";

export function parseEncryptionKey(value: string): Buffer {
  const trimmed = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const fromBase64 = Buffer.from(trimmed, "base64");
  if (fromBase64.length === 32) return fromBase64;
  throw new Error("PLATFORM_CREDENTIALS_ENCRYPTION_KEY must be 32 bytes as 64 hex chars or base64");
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string, key: Buffer): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported credential payload");
  }
  const iv = Buffer.from(parts[1] ?? "", "base64url");
  const tag = Buffer.from(parts[2] ?? "", "base64url");
  const encrypted = Buffer.from(parts[3] ?? "", "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export type OAuthStatePayload = {
  userId: string;
  nonce: string;
  exp: number;
};

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function hmac(data: string, key: Buffer): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export function signOAuthState(payload: OAuthStatePayload, key: Buffer): string {
  const body = base64UrlJson(payload);
  return `${body}.${hmac(body, key)}`;
}

export function verifyOAuthState(state: string, key: Buffer, now = Date.now()): OAuthStatePayload {
  const dot = state.lastIndexOf(".");
  if (dot <= 0) throw new Error("Invalid OAuth state");
  const body = state.slice(0, dot);
  const signature = state.slice(dot + 1);
  const expected = hmac(body, key);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid OAuth state");
  }
  const parsed = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8"),
  ) as Partial<OAuthStatePayload>;
  if (!parsed.userId || !parsed.nonce || typeof parsed.exp !== "number") {
    throw new Error("Invalid OAuth state");
  }
  if (parsed.exp < now) throw new Error("OAuth state expired");
  return { userId: parsed.userId, nonce: parsed.nonce, exp: parsed.exp };
}
