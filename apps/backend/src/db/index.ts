import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../utils/env.js";
import { relations } from "./relations.js";

export const db = drizzle(env.DATABASE_URL, {
  relations,
});
