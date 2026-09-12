import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  YOUTUBE_PRIVACY_STATUS,
  buildYoutubeVideoMetadata,
  youtubeWatchUrl,
} from "./publish-metadata.ts";

describe("YouTube publish metadata", () => {
  it("always sets privacyStatus to private", () => {
    const metadata = buildYoutubeVideoMetadata({
      title: "Clip",
      description: "Hello",
      hashtags: ["shorts", "ai"],
    });
    assert.equal(metadata.status.privacyStatus, YOUTUBE_PRIVACY_STATUS);
    assert.equal(metadata.status.privacyStatus, "private");
    assert.equal(metadata.status.selfDeclaredMadeForKids, false);
    assert.equal(metadata.snippet.title, "Clip");
    assert.deepEqual(metadata.snippet.tags, ["shorts", "ai"]);
  });

  it("clips title, description, and tags to YouTube limits", () => {
    const metadata = buildYoutubeVideoMetadata({
      title: "T".repeat(140),
      description: "D".repeat(6000),
      hashtags: ["#one", "", "two", "x".repeat(40)],
    });
    assert.equal(metadata.snippet.title.length, 100);
    assert.equal(metadata.snippet.description.length, 5000);
    assert.equal(metadata.snippet.tags[0], "one");
    assert.equal(metadata.snippet.tags[1], "two");
    assert.ok((metadata.snippet.tags[2] ?? "").length <= 30);
  });

  it("builds a watch URL from the YouTube video id", () => {
    assert.equal(youtubeWatchUrl("abc123"), "https://www.youtube.com/watch?v=abc123");
  });
});
