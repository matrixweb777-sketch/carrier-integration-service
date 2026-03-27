import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const EnvSchema = z.object({
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_BASE_URL: z.string().url(),
  UPS_AUTH_URL: z.string().url(),
  REQUEST_TIMEOUT: z.coerce.number().int().positive().default(5000)
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return EnvSchema.parse(env);
}
