import { readMetaJson } from "./meta-error.js";

// Pinned Graph API version. Bumping it is a deliberate change, not config.
export const FACEBOOK_GRAPH_BASE = "https://graph.facebook.com/v26.0";
export const FACEBOOK_AUTHORIZE_URL = "https://www.facebook.com/v26.0/dialog/oauth";

// Publishing to a Page requires all three permissions (current names, verified
// against Graph v26.0). A private single-user app may use them under Standard
// Access when the user holds a role on the Meta app.
export const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
];

export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(FACEBOOK_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", FACEBOOK_SCOPES.join(","));
  return url.toString();
}

interface AccessTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

// Exchanges the OAuth code for a short-lived (~1-2h) user token.
export async function exchangeCodeForUserToken(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<string> {
  const url = new URL(`${FACEBOOK_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("client_secret", params.clientSecret);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code", params.code);

  const response = await fetch(url);
  const data = await readMetaJson<AccessTokenResponse>(response);
  return data.access_token;
}

// Exchanges a short-lived user token for a long-lived (~60 day) one. Page
// tokens derived from a long-lived user token do not expire.
export async function exchangeForLongLivedUserToken(params: {
  clientId: string;
  clientSecret: string;
  shortLivedToken: string;
}): Promise<string> {
  const url = new URL(`${FACEBOOK_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("client_secret", params.clientSecret);
  url.searchParams.set("fb_exchange_token", params.shortLivedToken);

  const response = await fetch(url);
  const data = await readMetaJson<AccessTokenResponse>(response);
  return data.access_token;
}
