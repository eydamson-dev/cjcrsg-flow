import type { AppConfig } from "../../config/env.js";
import { CanvaClient, type BrandTemplate, type BrandTemplateDataset, type DatasetValue, type ExportJobResponse, type AutofillJobResult, type CreateAutofillJobResponse, type ListBrandTemplatesResponse } from "./canva-client.js";
import {
  CANVA_SCOPES,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  generatePkcePair,
  refreshAccessToken,
} from "./oauth.js";
import { PendingAuthStore, TokenStore } from "./token-store.js";

// Safety cap on brand-template pagination (100 templates per page).
export const MAX_TEMPLATE_PAGES = 20;

export class NotConfiguredError extends Error {
  constructor() {
    super("Canva integration is not configured.");
    this.name = "NotConfiguredError";
  }
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated with Canva.");
    this.name = "NotAuthenticatedError";
  }
}

export class CanvaService {
  private readonly client = new CanvaClient();

  constructor(
    private readonly config: AppConfig,
    private readonly tokens: TokenStore,
    private readonly pendingAuth: PendingAuthStore,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.CANVA_CLIENT_ID &&
        this.config.CANVA_CLIENT_SECRET &&
        this.config.CANVA_REDIRECT_URI,
    );
  }

  isAuthenticated(): boolean {
    return this.tokens.get() !== undefined;
  }

  beginAuthorization(state: string): string {
    this.requireConfigured();
    const { verifier, challenge } = generatePkcePair();
    this.pendingAuth.start(state, verifier);

    return buildAuthorizationUrl({
      clientId: this.config.CANVA_CLIENT_ID!,
      redirectUri: this.config.CANVA_REDIRECT_URI!,
      scopes: CANVA_SCOPES,
      state,
      codeChallenge: challenge,
    });
  }

  async handleCallback(code: string, state: string): Promise<void> {
    this.requireConfigured();
    const pending = this.pendingAuth.take(state);

    if (!pending) {
      throw new Error("Authorization state was not recognized. Please restart the flow.");
    }

    const token = await exchangeAuthorizationCode({
      clientId: this.config.CANVA_CLIENT_ID!,
      clientSecret: this.config.CANVA_CLIENT_SECRET!,
      redirectUri: this.config.CANVA_REDIRECT_URI!,
      code,
      codeVerifier: pending.verifier,
    });

    this.tokens.save(token);
  }

  private async getAccessToken(): Promise<string> {
    this.requireConfigured();
    const token = this.tokens.get();

    if (!token) {
      throw new NotAuthenticatedError();
    }

    if (token.expiresAt > Date.now() + 60_000) {
      return token.accessToken;
    }

    if (!token.refreshToken) {
      throw new NotAuthenticatedError();
    }

    const refreshed = await refreshAccessToken({
      clientId: this.config.CANVA_CLIENT_ID!,
      clientSecret: this.config.CANVA_CLIENT_SECRET!,
      refreshToken: token.refreshToken,
    });

    this.tokens.save({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? token.refreshToken,
      expiresAt: refreshed.expiresAt,
    });
    return refreshed.accessToken;
  }

  async listBrandTemplates(): Promise<BrandTemplate[]> {
    const accessToken = await this.getAccessToken();
    const response = await this.client.listBrandTemplates(accessToken);
    return response.items;
  }

  // Follows Canva's continuation tokens to retrieve every brand template.
  // A page cap guards against an unbounded loop from a malformed response.
  async listAllBrandTemplates(): Promise<BrandTemplate[]> {
    const accessToken = await this.getAccessToken();
    const templates: BrandTemplate[] = [];
    let continuation: string | undefined;
    let pages = 0;

    do {
      const response: ListBrandTemplatesResponse = await this.client.listBrandTemplates(
        accessToken,
        continuation,
      );
      templates.push(...response.items);
      continuation = response.continuation;
      pages += 1;
    } while (continuation && pages < MAX_TEMPLATE_PAGES);

    return templates;
  }

  async getBrandTemplate(id: string): Promise<BrandTemplate> {
    const accessToken = await this.getAccessToken();
    return this.client.getBrandTemplate(accessToken, id);
  }

  async getBrandTemplateDataset(id: string): Promise<BrandTemplateDataset> {
    const accessToken = await this.getAccessToken();
    return this.client.getBrandTemplateDataset(accessToken, id);
  }

  async createAutofillJob(
    params: { brandTemplateId: string; data: Record<string, DatasetValue>; title?: string },
  ): Promise<CreateAutofillJobResponse> {
    const accessToken = await this.getAccessToken();
    return this.client.createAutofillJob(accessToken, params);
  }

  async getAutofillJob(jobId: string): Promise<AutofillJobResult> {
    const accessToken = await this.getAccessToken();
    return this.client.getAutofillJob(accessToken, jobId);
  }

  async createExportJob(
    designId: string,
    format: "png" | "jpg" | "pdf" | "mp4",
  ): Promise<ExportJobResponse> {
    const accessToken = await this.getAccessToken();
    return this.client.createExportJob(accessToken, designId, format);
  }

  async getExportJob(jobId: string): Promise<ExportJobResponse> {
    const accessToken = await this.getAccessToken();
    return this.client.getExportJob(accessToken, jobId);
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new NotConfiguredError();
    }
  }
}
