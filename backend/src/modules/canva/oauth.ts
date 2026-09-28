import { createHash, randomBytes } from "node:crypto";

export const CANVA_AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
export const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";

export const CANVA_SCOPES = [
  "brandtemplate:content:read",
  "brandtemplate:meta:read",
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "profile:read",
];

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export function generatePkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export interface AuthorizationUrlParams {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
}

export function buildAuthorizationUrl(params: AuthorizationUrlParams): string {
  const url = new URL(CANVA_AUTHORIZE_URL);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", params.scopes.join(" "));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("state", params.state);
  url.searchParams.set("redirect_uri", params.redirectUri);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function basicAuthorization(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function requestToken(
  clientId: string,
  clientSecret: string,
  body: Record<string, string>,
): Promise<TokenSet> {
  const response = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthorization(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Canva token request failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as TokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function exchangeAuthorizationCode(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<TokenSet> {
  return requestToken(params.clientId, params.clientSecret, {
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
  });
}

export async function refreshAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<TokenSet> {
  return requestToken(params.clientId, params.clientSecret, {
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
  });
}
