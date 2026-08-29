import { defineRelations } from "drizzle-orm";
import * as schema from "./schema.js";

export const relations = defineRelations(schema, (r) => ({
  users: {
    accounts: r.many.accounts(),
    sessions: r.many.sessions(),
    routines: r.many.routines(),
    workoutSessions: r.many.workoutSessions(),
    macroTargets: r.many.macroTargets(),
    foodEntries: r.many.foodEntries(),
    waterEntries: r.many.waterEntries(),
    oauthTokens: r.many.oauthTokens(),
  },

  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
      optional: false,
    }),
  },

  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
      optional: false,
    }),
  },

  routines: {
    user: r.one.users({
      from: r.routines.userId,
      to: r.users.id,
      optional: false,
    }),
    routineSessions: r.many.routineSessions(),
  },

  routineSessions: {
    routine: r.one.routines({
      from: r.routineSessions.routineId,
      to: r.routines.id,
      optional: false,
    }),
    workoutSessions: r.many.workoutSessions(),
  },

  workoutSessions: {
    user: r.one.users({
      from: r.workoutSessions.userId,
      to: r.users.id,
      optional: false,
    }),
    routineSession: r.one.routineSessions({
      from: r.workoutSessions.routineSessionId,
      to: r.routineSessions.id,
    }),
    setEntries: r.many.setEntries(),
  },

  setEntries: {
    workoutSession: r.one.workoutSessions({
      from: r.setEntries.workoutSessionId,
      to: r.workoutSessions.id,
      optional: false,
    }),
  },

  macroTargets: {
    user: r.one.users({
      from: r.macroTargets.userId,
      to: r.users.id,
      optional: false,
    }),
  },

  foodEntries: {
    user: r.one.users({
      from: r.foodEntries.userId,
      to: r.users.id,
      optional: false,
    }),
  },

  waterEntries: {
    user: r.one.users({
      from: r.waterEntries.userId,
      to: r.users.id,
      optional: false,
    }),
  },

  oauthClients: {
    tokens: r.many.oauthTokens(),
  },

  oauthTokens: {
    user: r.one.users({
      from: r.oauthTokens.userId,
      to: r.users.id,
      optional: false,
    }),
    client: r.one.oauthClients({
      from: r.oauthTokens.clientId,
      to: r.oauthClients.id,
      optional: false,
    }),
  },
}));
