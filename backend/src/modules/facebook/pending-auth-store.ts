// In-memory store for the Facebook OAuth `state` nonce (CSRF protection).
// Losing it on a backend restart is harmless: the user simply restarts the
// connect flow. Mirrors the Canva PendingAuthStore.
export class PendingFacebookAuthStore {
  private readonly pending = new Map<string, { createdAt: number }>();

  start(state: string): void {
    this.pending.set(state, { createdAt: Date.now() });
  }

  take(state: string): boolean {
    const entry = this.pending.get(state);
    this.pending.delete(state);
    return entry !== undefined;
  }
}
