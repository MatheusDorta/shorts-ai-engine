import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertOwnedMediaPath, guessVideoContentType } from "./media-path.ts";

describe("owned media path", () => {
  it("accepts paths under the user folder", () => {
    assert.equal(
      assertOwnedMediaPath("user-1", "user-1/videos/clip.mp4"),
      "user-1/videos/clip.mp4",
    );
  });

  it("rejects traversal and other users' files", () => {
    assert.throws(() => assertOwnedMediaPath("user-1", "../secret.mp4"));
    assert.throws(() => assertOwnedMediaPath("user-1", "user-2/videos/clip.mp4"));
    assert.throws(() => assertOwnedMediaPath("user-1", "/user-1/videos/clip.mp4"));
  });

  it("guesses video content types from extension", () => {
    assert.equal(guessVideoContentType("a.mp4"), "video/mp4");
    assert.equal(guessVideoContentType("a.MOV"), "video/quicktime");
    assert.equal(guessVideoContentType("a.webm"), "video/webm");
  });
});
