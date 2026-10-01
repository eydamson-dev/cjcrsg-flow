import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppConfig } from "./config/env.js";
import { createPrismaClient } from "./db/prisma.js";
import { CanvaService } from "./modules/canva/canva-service.js";
import { PendingAuthStore, TokenStore } from "./modules/canva/token-store.js";
import { ContentService } from "./modules/content/content-service.js";
import { PrismaContentRepository } from "./modules/content/prisma-content-repository.js";
import { FacebookService } from "./modules/facebook/facebook-service.js";
import { MetaGraphClient } from "./modules/facebook/meta-client.js";
import { PendingFacebookAuthStore } from "./modules/facebook/pending-auth-store.js";
import { PrismaFacebookPageRepository } from "./modules/facebook/prisma-facebook-page-repository.js";
import { PrismaPublicationRepository } from "./modules/publication/prisma-publication-repository.js";
import { PublicationService } from "./modules/publication/publication-service.js";
import { PrismaTemplateRepository } from "./modules/templates/prisma-template-repository.js";
import { TemplateService } from "./modules/templates/template-service.js";
import { canvaRoutes } from "./routes/canva-routes.js";
import { contentRoutes } from "./routes/content-routes.js";
import { facebookRoutes } from "./routes/facebook-routes.js";
import { publicationRoutes } from "./routes/publication-routes.js";
import { templateRoutes } from "./routes/template-routes.js";
import { LocalFilesystemStorage } from "./storage/local-filesystem-storage.js";

export async function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  const canva = new CanvaService(config, new TokenStore(), new PendingAuthStore());
  const storage = new LocalFilesystemStorage(config.STORAGE_PATH);
  const prisma = createPrismaClient();
  const templates = new TemplateService(canva, new PrismaTemplateRepository(prisma), storage);
  const contents = new ContentService(
    new PrismaContentRepository(prisma),
    templates,
    canva,
    storage,
  );
  const metaGraph = new MetaGraphClient();
  const facebook = new FacebookService(
    config,
    new PrismaFacebookPageRepository(prisma),
    new PendingFacebookAuthStore(),
    metaGraph,
  );
  const publications = new PublicationService(
    new PrismaPublicationRepository(prisma),
    contents,
    facebook,
    canva,
    metaGraph,
    storage,
  );

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(canvaRoutes, {
    canva,
    frontendUrl: config.CORS_ORIGIN,
    storage,
  });

  await app.register(templateRoutes, {
    templates,
    storage,
  });

  await app.register(contentRoutes, {
    content: contents,
    storage,
  });

  await app.register(facebookRoutes, {
    facebook,
    frontendUrl: config.CORS_ORIGIN,
  });

  await app.register(publicationRoutes, {
    publications,
    storage,
  });

  return app;
}
