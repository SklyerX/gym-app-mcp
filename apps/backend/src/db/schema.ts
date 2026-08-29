import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const providerEnum = pgEnum("provider_enum", ["google", "discord"]);

export const users = pgTable(
  "users",
  {
    id: varchar({ length: 25 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    email: text().notNull().unique(),
    username: varchar({ length: 50 }).notNull(),
    slug: varchar({ length: 100 }).notNull().unique(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow(),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    timezone: varchar({ length: 64 }).notNull().default("UTC"),
  },
  (t) => [uniqueIndex("idx_user_slug_unq").on(t.slug)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: varchar({ length: 25 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: providerEnum("provider").notNull(),
    providerAccountId: text("provider_account_id").unique(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
  },
  (t) => [unique("uq_accounts_user_provider").on(t.userId, t.provider)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar({ length: 25 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    luHash: text("lu_hash").notNull().unique(),
    token: text().notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("idx_session_lu_hash").on(t.luHash)],
);

// CORE

export const routines = pgTable("routines", {
  id: varchar({ length: 25 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull(),
  name: text().notNull(),
  notes: jsonb("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routineSessions = pgTable("routine_sessions", {
  id: varchar({ length: 25 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  routineId: text("routine_id")
    .references(() => routines.id, { onDelete: "cascade" })
    .notNull(),
  label: text().notNull(),
  notes: text(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: varchar({ length: 25 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull(),
  routineSessionId: text("routine_session_id").references(
    () => routineSessions.id,
    { onDelete: "set null" },
  ),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const methodEnum = pgEnum("method_enum", [
  "straight",
  "drop-set",
  "rest-pause",
  "myo-rep",
  "amrap",
  "other",
]);
export const unitEnum = pgEnum("unit_enum", ["kg", "lbs"]);

export const setEntries = pgTable("set_entries", {
  id: varchar({ length: 25 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  workoutSessionId: text("workout_session_id")
    .references(() => workoutSessions.id, { onDelete: "cascade" })
    .notNull(),
  exerciseSlug: text("exercise_slug").notNull(),
  method: methodEnum("method").notNull(),
  reps: integer().notNull(),
  weight: numeric().notNull(),
  unit: unitEnum("unit"),
  loggedAt: timestamp("logged_at").defaultNow(),
  meta: jsonb(),
});

// CORE - NUTRITION

export const macroTargets = pgTable("macro_target", {
  id: varchar({ length: 25 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .references(() => users.id, {
      onDelete: "cascade",
    })
    .notNull()
    .unique(),
  proteinGrams: numeric("protein_g").notNull(),
  carbsGrams: numeric("carbs_g").notNull(),
  fatGrams: numeric("fat_g").notNull(),
  calories: numeric().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mealEnum = pgEnum("meal_enum", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const foodEntries = pgTable(
  "food_entries",
  {
    id: varchar({ length: 25 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    meal: mealEnum("meal"),
    name: text(),
    grams: numeric(),
    protein: numeric().notNull(),
    carbs: numeric().notNull(),
    fat: numeric().notNull(),
    calories: numeric().notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    loggedOn: date("logged_on").notNull(),
    meta: jsonb().$type<{
      source: "estimated" | "web_verified" | "user_corrected";
      [k: string]: string;
    }>(),
  },
  (t) => [index("idx_food_entries_user_day").on(t.userId, t.loggedOn)],
);

export const waterEntries = pgTable(
  "water_entries",
  {
    id: varchar({ length: 25 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    milliliters: numeric().notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    loggedOn: date("logged_on").notNull(),
  },
  (t) => [index("idx_water_entries_user_day").on(t.userId, t.loggedOn)],
);

// OTHER

export const oauthClients = pgTable("oauth_clients", {
  id: varchar({ length: 25 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text().notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
  grantTypes: text("grant_types").array(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  id: varchar({ length: 25 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClients.id, { onDelete: "cascade" }),

  luKey: text("lu_key").notNull().unique(),
  refreshLuKey: text("refresh_lu_key").notNull().unique(),

  accessToken: text("access_token").notNull().unique(),
  refreshToken: text("refresh_token").notNull().unique(),

  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});
