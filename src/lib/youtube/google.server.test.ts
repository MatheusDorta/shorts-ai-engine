import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEncryptionKey } from "./crypto.ts";
import { buildAuthorizationUrl, uploadYoutubeVideo, YOUTUBE_SCOPES } from "./google.server.ts";

describe("YouTube authorization URL", () => {
  it("requests upload and readonly scopes and omits the client secret", () => {
    const url = new URL(
      buildAuthorizationUrl(
        {
          clientId: "client-id.apps.googleusercontent.com",
          clientSecret: "super-secret-value",
          redirectUri: "http://localhost:8080/api/youtube/callback",
          encryptionKey: parseEncryptionKey("b".repeat(64)),
        },
        "user-123",
      ),
    );
    assert.equal(url.searchParams.get("client_id"), "client-id.apps.googleusercontent.com");
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "http://localhost:8080/api/youtube/callback",
    );
    assert.equal(url.searchParams.get("access_type"), "offline");
    assert.equal(url.searchParams.get("prompt"), "consent");
    const scope = url.searchParams.get("scope") ?? "";
    assert.ok(scope.includes(YOUTUBE_SCOPES[0]));
    assert.ok(scope.includes(YOUTUBE_SCOPES[1]));
    assert.equal(url.toString().includes("super-secret-value"), false);
    assert.ok((url.searchParams.get("state") ?? "").length > 20);
  });

  it("refuses uploads that are not private", async () => {
    const metadata = {
      snippet: { title: "t", description: "", tags: [], categoryId: "22" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false as const },
    };
    await assert.rejects(
      () =>
        uploadYoutubeVideo({
          accessToken: "token",
          metadata: metadata as unknown as Parameters<typeof uploadYoutubeVideo>[0]["metadata"],
          bytes: new Uint8Array([1]),
          contentType: "video/mp4",
        }),
      /must start as private/,
    );
  });
});
