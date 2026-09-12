import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blocksManualPublishedStatus,
  canCancelPublishingJob,
  canPublishYoutubeNow,
  canRetryPublishingJob,
  canScheduleContent,
  hasSelectedPlatform,
  isActivePublishingJob,
  isManualContentStatus,
  isPlatformOnContent,
} from "./workflow-rules.ts";

describe("workflow rules", () => {
  it("allows only manual statuses to be edited by operators", () => {
    assert.equal(isManualContentStatus("draft"), true);
    assert.equal(isManualContentStatus("approved"), true);
    assert.equal(isManualContentStatus("published"), false);
    assert.equal(isManualContentStatus("failed"), false);
  });

  it("requires at least one platform", () => {
    assert.equal(hasSelectedPlatform(false, false), false);
    assert.equal(hasSelectedPlatform(true, false), true);
  });

  it("blocks scheduling for rejected, not_allowed, and platform-less content", () => {
    assert.equal(
      canScheduleContent({ status: "rejected", platforms: ["youtube_shorts"] }).allowed,
      false,
    );
    assert.equal(
      canScheduleContent({
        status: "approved",
        permissionStatus: "not_allowed",
        platforms: ["youtube_shorts"],
      }).allowed,
      false,
    );
    assert.equal(canScheduleContent({ status: "approved", platforms: [] }).allowed, false);
    assert.equal(canScheduleContent({ status: "approved", platforms: ["tiktok"] }).allowed, true);
  });

  it("validates selected platforms", () => {
    assert.equal(isPlatformOnContent(["tiktok"], "youtube_shorts"), false);
    assert.equal(isPlatformOnContent([{ platform: "tiktok" }], "tiktok"), true);
  });

  it("limits publishing actions by status", () => {
    assert.equal(canCancelPublishingJob("scheduled"), true);
    assert.equal(canCancelPublishingJob("waiting"), true);
    assert.equal(canCancelPublishingJob("cancelled"), false);
    assert.equal(canCancelPublishingJob("failed"), false);
    assert.equal(canRetryPublishingJob("failed"), true);
    assert.equal(canRetryPublishingJob("cancelled"), false);
    assert.equal(canRetryPublishingJob("scheduled"), false);
  });

  it("blocks manual published status", () => {
    assert.equal(blocksManualPublishedStatus("published"), true);
    assert.equal(blocksManualPublishedStatus("approved"), false);
  });

  it("gates YouTube Publish Now on connection, approval, platform, video, and active jobs", () => {
    const base = {
      youtubeConnected: true,
      contentStatus: "approved" as const,
      platforms: ["youtube_shorts"] as Array<"youtube_shorts">,
      hasVideo: true,
      activeJobExists: false,
    };
    assert.equal(canPublishYoutubeNow(base).allowed, true);
    assert.equal(canPublishYoutubeNow({ ...base, youtubeConnected: false }).allowed, false);
    assert.equal(canPublishYoutubeNow({ ...base, contentStatus: "draft" }).allowed, false);
    assert.equal(canPublishYoutubeNow({ ...base, platforms: ["tiktok"] }).allowed, false);
    assert.equal(canPublishYoutubeNow({ ...base, hasVideo: false }).allowed, false);
    assert.equal(canPublishYoutubeNow({ ...base, activeJobExists: true }).allowed, false);
    assert.equal(
      canPublishYoutubeNow({ ...base, jobStatus: "scheduled", activeJobExists: true }).allowed,
      true,
    );
    assert.equal(
      canPublishYoutubeNow({ ...base, jobStatus: "publishing", activeJobExists: true }).allowed,
      false,
    );
    assert.equal(isActivePublishingJob("publishing"), true);
    assert.equal(isActivePublishingJob("failed"), false);
  });
});
