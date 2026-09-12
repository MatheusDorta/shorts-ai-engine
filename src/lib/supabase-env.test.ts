import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatMissingSupabaseConfig,
  getSupabasePublicConfig,
  resolveSupabasePublicConfig,
} from "./supabase-env.ts";

describe("resolveSupabasePublicConfig", () => {
  it("prefers Vite variables over server fallbacks", () => {
    const result = resolveSupabasePublicConfig({
      viteUrl: "https://zkhgsjaurdpsxscpuupl.supabase.co",
      viteKey: "sb_publishable_example",
      serverUrl: "https://other.supabase.co",
      serverKey: "other-key",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.url, "https://zkhgsjaurdpsxscpuupl.supabase.co");
      assert.equal(result.publishableKey, "sb_publishable_example");
    }
  });

  it("uses server fallbacks when Vite values are absent", () => {
    const result = resolveSupabasePublicConfig({
      serverUrl: "https://zkhgsjaurdpsxscpuupl.supabase.co",
      serverKey: "sb_publishable_example",
    });
    assert.equal(result.ok, true);
  });

  it("rejects placeholders and missing values", () => {
    const result = resolveSupabasePublicConfig({
      viteUrl: "https://your-project.supabase.co",
      viteKey: "your_publishable_key",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.missing.includes("VITE_SUPABASE_URL"));
      assert.ok(result.missing.includes("VITE_SUPABASE_PUBLISHABLE_KEY"));
    }
  });

  it("rejects secret keys in the browser config", () => {
    const result = resolveSupabasePublicConfig({
      viteUrl: "https://zkhgsjaurdpsxscpuupl.supabase.co",
      viteKey: "sb_secret_example",
    });
    assert.equal(result.ok, false);
  });
});

describe("formatMissingSupabaseConfig", () => {
  it("does not tell operators to provision a new database", () => {
    const message = formatMissingSupabaseConfig(["VITE_SUPABASE_URL"]);
    assert.match(message, /existing Supabase project/);
    assert.doesNotMatch(message, /Lovable Cloud/);
  });
});

describe("getSupabasePublicConfig", () => {
  it("provides the managed public configuration when build variables are absent", () => {
    const result = getSupabasePublicConfig();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.url, /^https:\/\//);
      assert.match(result.publishableKey, /^sb_publishable_/);
    }
  });
});
