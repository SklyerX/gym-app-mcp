import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_CONNECTION_URI);
