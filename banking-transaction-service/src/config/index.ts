import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ACCOUNT_SERVICE_URL: z.string().url(),
  RABBITMQ_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(8003),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DAILY_TRANSFER_LIMIT: z.coerce.number().positive().default(200_000),
  HIGH_VALUE_THRESHOLD: z.coerce.number().positive().default(50_000),
  SERVICE_VERSION: z.string().default("1.0.0"),
});

export type AppConfig = z.infer<typeof envSchema>;

export const HTTP_CLIENT_TIMEOUT_MS = 5000 as const;

export const RETRY_BACKOFF_MS = [1000, 2000, 4000] as const;

export const RETRY_ATTEMPT_COUNT = 3 as const;

export const IDEMPOTENCY_TTL_MS = 86_400_000;

export const DEFAULT_PAGE_LIMIT = 20 as const;

export const MAX_PAGE_LIMIT = 100 as const;

export const REFERENCE_RANDOM_LENGTH = 6 as const;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.flatten().fieldErrors}`);
  }
  return parsed.data;
}
