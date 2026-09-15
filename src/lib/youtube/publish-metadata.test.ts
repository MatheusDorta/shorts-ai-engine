import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildYoutubeVideoMetadata, youtubeWatchUrl } from "./publish-metadata.ts";
import { normalizeScheduledAt } from "./schedule-time.ts";

describe("YouTube publish metadata", () => {
  it("publishes immediately as public for Publish Now", () => {
    const metadata = buildYoutubeVideoMetadata({
      title: "Clip",
      description: "Hello",
      hashtags: ["shorts", "ai"],
      privacyStatus: "public",
    });
    assert.equal(metadata.status.privacyStatus, "public");
    assert.equal(metadata.status.selfDeclaredMadeForKids, false);
    assert.equal(metadata.status.publishAt, undefined);
    assert.equal(metadata.snippet.title, "Clip");
    assert.deepEqual(metadata.snippet.tags, ["shorts", "ai"]);
  });

  it("uploads privately with publishAt for Schedule", () => {
    const publishAt = "2026-09-14T16:43:00.000Z";
    const metadata = buildYoutubeVideoMetadata({
      title: "Clip",
      hashtags: [],
      privacyStatus: "private",
      publishAt,
    });
    assert.equal(metadata.status.privacyStatus, "private");
    assert.equal(metadata.status.publishAt, publishAt);
  });

  it("ignores publishAt when publishing publicly", () => {
    const metadata = buildYoutubeVideoMetadata({
      title: "Clip",
      privacyStatus: "public",
      publishAt: "2026-09-14T16:43:00.000Z",
    });
    assert.equal(metadata.status.privacyStatus, "public");
    assert.equal(metadata.status.publishAt, undefined);
  });

  it("clips title, description, and tags to YouTube limits", () => {
    const metadata = buildYoutubeVideoMetadata({
      title: "T".repeat(140),
      description: "D".repeat(6000),
      hashtags: ["#one", "", "two", "x".repeat(40)],
      privacyStatus: "private",
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

describe("YouTube schedule time", () => {
  const now = Date.parse("2026-09-14T12:00:00.000Z");

  it("accepts a future UTC instant and normalizes it", () => {
    assert.equal(
      normalizeScheduledAt("2026-09-14T16:43:00.000Z", now),
      "2026-09-14T16:43:00.000Z",
    );
  });

  it("accepts an offset instant and converts it to UTC", () => {
    assert.equal(
      normalizeScheduledAt("2026-09-14T13:43:00-03:00", now),
      "2026-09-14T16:43:00.000Z",
    );
  });

  it("rejects an invalid value", () => {
    assert.throws(() => normalizeScheduledAt("14/09/2026 13:43", now), /valid date and time/);
  });

  it("rejects a time in the past or too close to now", () => {
    assert.throws(
      () => normalizeScheduledAt("2026-09-14T11:59:00.000Z", now),
      /at least one minute in the future/,
    );
  });
});
