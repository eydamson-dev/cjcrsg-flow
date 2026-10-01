import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().url().default("http://127.0.0.1:3000"),
  DATABASE_URL: z.string().url(),
  STORAGE_PATH: z.string().min(1).default("./data/storage"),
  CANVA_CLIENT_ID: optionalNonEmptyString,
  CANVA_CLIENT_SECRET: optionalNonEmptyString,
  CANVA_REDIRECT_URI: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  FACEBOOK_APP_ID: optionalNonEmptyString,
  FACEBOOK_APP_SECRET: optionalNonEmptyString,
  FACEBOOK_REDIRECT_URI: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(environment);
}
