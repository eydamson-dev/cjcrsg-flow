import type { TokenSet } from "./oauth.js";

export class TokenStore {
  private token?: TokenSet;

  save(token: TokenSet): void {
    this.token = token;
  }

  get(): TokenSet | undefined {
    return this.token;
  }

  clear(): void {
    this.token = undefined;
  }
}

export class PendingAuthStore {
  private pending = new Map<string, { verifier: string }>();

  start(state: string, verifier: string): void {
    this.pending.set(state, { verifier });
  }

  take(state: string): { verifier: string } | undefined {
    const entry = this.pending.get(state);
    this.pending.delete(state);
    return entry;
  }
}
