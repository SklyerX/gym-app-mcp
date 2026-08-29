import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.union([
    z.literal("development"),
    z.literal("testing"),
    z.literal("production"),
  ]),
  DATABASE_URL: z.url(),
  REDIS_CONNECTION_URI: z.url(),
  PORT: z.coerce.number(),
  HOSTED_API_URL: z.url(),
  FRONTEND_URL: z.url(),

  COOKIE_DOMAIN: z.string().optional(),

  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  DISCORD_REDIRECT_URI: z.url(),
});

export const env = envSchema.parse(process.env);
