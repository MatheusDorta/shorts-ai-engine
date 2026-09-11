import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decryptSecret,
  encryptSecret,
  parseEncryptionKey,
  signOAuthState,
  verifyOAuthState,
} from "./crypto.ts";

const key = parseEncryptionKey("a".repeat(64));

describe("credential encryption", () => {
  it("round-trips a refresh token without exposing plaintext in the payload", () => {
    const token = "1//refresh-token-example";
    const payload = encryptSecret(token, key);
    assert.equal(payload.startsWith("v1."), true);
    assert.equal(payload.includes(token), false);
    assert.equal(decryptSecret(payload, key), token);
  });

  it("rejects tampered ciphertext", () => {
    const payload = encryptSecret("secret", key);
    const parts = payload.split(".");
    const tag = parts[2] ?? "";
    parts[2] = `${tag.slice(0, -1)}${tag.endsWith("A") ? "B" : "A"}`;
    assert.throws(() => decryptSecret(parts.join("."), key));
  });
});

describe("OAuth state", () => {
  it("signs and verifies a user-bound state", () => {
    const state = signOAuthState({ userId: "user-1", nonce: "abc", exp: Date.now() + 60_000 }, key);
    const parsed = verifyOAuthState(state, key);
    assert.equal(parsed.userId, "user-1");
    assert.equal(parsed.nonce, "abc");
  });

  it("rejects expired or forged state", () => {
    const expired = signOAuthState({ userId: "user-1", nonce: "abc", exp: Date.now() - 1 }, key);
    assert.throws(() => verifyOAuthState(expired, key));
    assert.throws(() => verifyOAuthState("not-a-state", key));
  });
});
