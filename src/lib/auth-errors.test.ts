import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authErrorMessage } from "./auth-errors.ts";

describe("authErrorMessage", () => {
  it("maps invalid credentials", () => {
    assert.equal(
      authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }),
      "Invalid email or password.",
    );
  });

  it("maps duplicate accounts", () => {
    assert.equal(
      authErrorMessage({ message: "User already registered" }),
      "An account with this email already exists. Sign in instead.",
    );
  });

  it("maps network failures", () => {
    assert.equal(
      authErrorMessage(new Error("Failed to fetch")),
      "Network error. Check your connection and try again.",
    );
  });
});
