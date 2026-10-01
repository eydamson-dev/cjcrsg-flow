import type { AppConfig } from "../../config/env.js";
import type { FacebookPageRecord, FacebookPageRepository } from "./facebook-page-repository.js";
import type { MetaPage } from "./meta-client.js";
import {
  buildAuthorizationUrl,
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
} from "./oauth.js";
import type { PendingFacebookAuthStore } from "./pending-auth-store.js";

export class FacebookNotConfiguredError extends Error {
  constructor() {
    super("Facebook integration is not configured.");
    this.name = "FacebookNotConfiguredError";
  }
}

export class FacebookOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacebookOAuthError";
  }
}

// The subset of the Graph client the connection flow needs.
export interface FacebookGraphSource {
  listPages(userToken: string): Promise<MetaPage[]>;
}

export interface FacebookPageSummary {
  pageId: string;
  name: string;
  category: string | null;
}

export class FacebookService {
  constructor(
    private readonly config: AppConfig,
    private readonly repository: FacebookPageRepository,
    private readonly pendingAuth: PendingFacebookAuthStore,
    private readonly graph: FacebookGraphSource,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.FACEBOOK_APP_ID &&
        this.config.FACEBOOK_APP_SECRET &&
        this.config.FACEBOOK_REDIRECT_URI,
    );
  }

  async isConnected(): Promise<boolean> {
    return (await this.repository.list()).length > 0;
  }

  beginAuthorization(state: string): string {
    this.requireConfigured();
    this.pendingAuth.start(state);

    return buildAuthorizationUrl({
      clientId: this.config.FACEBOOK_APP_ID!,
      redirectUri: this.config.FACEBOOK_REDIRECT_URI!,
      state,
    });
  }

  // Connect flow: validate state -> code for a short-lived user token ->
  // long-lived user token -> enumerate Pages -> persist Page tokens. The user
  // token is used only here and never stored.
  async handleCallback(code: string, state: string): Promise<number> {
    this.requireConfigured();

    if (!this.pendingAuth.take(state)) {
      throw new FacebookOAuthError("Authorization state was not recognized. Please restart the flow.");
    }

    const shortLived = await exchangeCodeForUserToken({
      clientId: this.config.FACEBOOK_APP_ID!,
      clientSecret: this.config.FACEBOOK_APP_SECRET!,
      redirectUri: this.config.FACEBOOK_REDIRECT_URI!,
      code,
    });

    const longLived = await exchangeForLongLivedUserToken({
      clientId: this.config.FACEBOOK_APP_ID!,
      clientSecret: this.config.FACEBOOK_APP_SECRET!,
      shortLivedToken: shortLived,
    });

    const pages = await this.graph.listPages(longLived);

    if (pages.length === 0) {
      throw new FacebookOAuthError("No Facebook Pages were returned for this account.");
    }

    for (const page of pages) {
      await this.repository.upsert({
        pageId: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category ?? null,
        tasks: page.tasks ?? null,
      });
    }

    return pages.length;
  }

  // Connection summaries for the UI — never includes access tokens.
  async listPages(): Promise<FacebookPageSummary[]> {
    const pages = await this.repository.list();
    return pages.map((page) => ({
      pageId: page.pageId,
      name: page.name,
      category: page.category,
    }));
  }

  getPage(pageId: string): Promise<FacebookPageRecord | null> {
    return this.repository.findByPageId(pageId);
  }

  disconnect(pageId: string): Promise<boolean> {
    return this.repository.deleteByPageId(pageId);
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new FacebookNotConfiguredError();
    }
  }
}
