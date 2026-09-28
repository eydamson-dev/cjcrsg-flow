import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppConfig } from "./config/env.js";
import { CanvaService } from "./modules/canva/canva-service.js";
import { PendingAuthStore, TokenStore } from "./modules/canva/token-store.js";
import { canvaRoutes } from "./routes/canva-routes.js";
import { LocalFilesystemStorage } from "./storage/local-filesystem-storage.js";

export async function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.CORS_ORIGIN });

  const canva = new CanvaService(config, new TokenStore(), new PendingAuthStore());
  const storage = new LocalFilesystemStorage(config.STORAGE_PATH);

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(canvaRoutes, {
    canva,
    frontendUrl: config.CORS_ORIGIN,
    storage,
  });

  return app;
}
