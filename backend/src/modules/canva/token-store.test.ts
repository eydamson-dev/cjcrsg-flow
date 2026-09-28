import { describe, expect, it } from "vitest";
import { PendingAuthStore, TokenStore } from "./token-store.js";

describe("PendingAuthStore", () => {
  it("returns the verifier once and clears it on take", () => {
    const store = new PendingAuthStore();
    store.start("state1", "verifier1");

    expect(store.take("state1")).toEqual({ verifier: "verifier1" });
    expect(store.take("state1")).toBeUndefined();
  });
});

describe("TokenStore", () => {
  it("saves and retrieves a token set", () => {
    const store = new TokenStore();
    const token = { accessToken: "abc", refreshToken: "xyz", expiresAt: 1234 };

    expect(store.get()).toBeUndefined();
    store.save(token);
    expect(store.get()).toEqual(token);
    store.clear();
    expect(store.get()).toBeUndefined();
  });
});
