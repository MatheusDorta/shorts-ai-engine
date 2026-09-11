import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getYouTubeServerConfig } from "./env.server.ts";

describe("YouTube server env", () => {
  it("does not treat VITE_ YouTube variables as configuration", () => {
    const previous = {
      YOUTUBE_CLIENT_ID: process.env["YOUTUBE_CLIENT_ID"],
      YOUTUBE_CLIENT_SECRET: process.env["YOUTUBE_CLIENT_SECRET"],
      YOUTUBE_REDIRECT_URI: process.env["YOUTUBE_REDIRECT_URI"],
      PLATFORM_CREDENTIALS_ENCRYPTION_KEY: process.env["PLATFORM_CREDENTIALS_ENCRYPTION_KEY"],
      VITE_YOUTUBE_CLIENT_ID: process.env["VITE_YOUTUBE_CLIENT_ID"],
      VITE_YOUTUBE_CLIENT_SECRET: process.env["VITE_YOUTUBE_CLIENT_SECRET"],
    };
    delete process.env["YOUTUBE_CLIENT_ID"];
    delete process.env["YOUTUBE_CLIENT_SECRET"];
    delete process.env["YOUTUBE_REDIRECT_URI"];
    delete process.env["PLATFORM_CREDENTIALS_ENCRYPTION_KEY"];
    process.env["VITE_YOUTUBE_CLIENT_ID"] = "vite-client-id";
    process.env["VITE_YOUTUBE_CLIENT_SECRET"] = "vite-client-secret";
    try {
      const result = getYouTubeServerConfig();
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.ok(result.missing.includes("YOUTUBE_CLIENT_ID"));
        assert.ok(result.missing.includes("YOUTUBE_CLIENT_SECRET"));
      }
    } finally {
      restore("YOUTUBE_CLIENT_ID", previous.YOUTUBE_CLIENT_ID);
      restore("YOUTUBE_CLIENT_SECRET", previous.YOUTUBE_CLIENT_SECRET);
      restore("YOUTUBE_REDIRECT_URI", previous.YOUTUBE_REDIRECT_URI);
      restore("PLATFORM_CREDENTIALS_ENCRYPTION_KEY", previous.PLATFORM_CREDENTIALS_ENCRYPTION_KEY);
      restore("VITE_YOUTUBE_CLIENT_ID", previous.VITE_YOUTUBE_CLIENT_ID);
      restore("VITE_YOUTUBE_CLIENT_SECRET", previous.VITE_YOUTUBE_CLIENT_SECRET);
    }
  });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
