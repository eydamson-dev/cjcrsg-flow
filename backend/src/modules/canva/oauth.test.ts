import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAuthorizationUrl, generatePkcePair } from "./oauth.js";

describe("generatePkcePair", () => {
  it("produces a 43-char verifier and a matching SHA-256 challenge", () => {
    const { verifier, challenge } = generatePkcePair();

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(expected);
  });
});

describe("buildAuthorizationUrl", () => {
  it("builds a Canva authorize URL with PKCE, scopes, state, and redirect", () => {
    const url = buildAuthorizationUrl({
      clientId: "client123",
      redirectUri: "http://127.0.0.1:3001/oauth/callback",
      scopes: ["design:meta:read", "profile:read"],
      state: "stateabc",
      codeChallenge: "challengexyz",
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://www.canva.com");
    expect(parsed.pathname).toBe("/api/oauth/authorize");
    expect(parsed.searchParams.get("code_challenge")).toBe("challengexyz");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("scope")).toBe("design:meta:read profile:read");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("client123");
    expect(parsed.searchParams.get("state")).toBe("stateabc");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:3001/oauth/callback");
  });
});
