import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildApp } from "./app.js";
import { loadConfig } from "./config/env.js";

const envPath = resolve(process.cwd(), "../.env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const config = loadConfig();
const app = await buildApp(config);

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
