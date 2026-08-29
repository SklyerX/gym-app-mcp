import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  routineSessions,
  setEntries,
  workoutSessions,
} from "../db/schema.js";
import { slugify } from "../utils/format.js";
import { empty, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_exercise_history",
  description:
    "Look up the user's recent sets of one exercise across every workout, newest first, each with the date it was logged. This is the tool for 'what did I bench last time?' or 'how has my squat moved this month?' — use it before suggesting a weight, so progression is based on what was actually lifted.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    exercise: z
      .string()
      .describe(
        "Exercise name in plain English, e.g. 'Dumbbell Bench Press'. Matched against the same normalized slug append_set_entry writes, so spelling variants of one movement still match.",
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe(
        "Maximum number of sets to return, 1-100. Defaults to 20 — roughly the last few sessions of one movement.",
      ),
  },
  load: async (user, { exercise, limit }) => {
    const slug = slugify(exercise);

    const rows = await db
      .select({
        workout_session_id: workoutSessions.id,
        started_at: workoutSessions.startedAt,
        label: routineSessions.label,
        method: setEntries.method,
        reps: setEntries.reps,
        weight: setEntries.weight,
        unit: setEntries.unit,
        logged_at: setEntries.loggedAt,
        meta: setEntries.meta,
      })
      .from(setEntries)
      .innerJoin(
        workoutSessions,
        eq(setEntries.workoutSessionId, workoutSessions.id),
      )
      .leftJoin(
        routineSessions,
        eq(workoutSessions.routineSessionId, routineSessions.id),
      )
      .where(
        and(
          eq(workoutSessions.userId, user.id),
          eq(setEntries.exerciseSlug, slug),
        ),
      )
      .orderBy(desc(workoutSessions.startedAt), asc(setEntries.loggedAt))
      .limit(limit);

    if (!rows.length) {
      return empty(
        `No sets logged for '${slug}'. Empty result, not an error — the user may have logged it under a different name, so try get_exercises to see what the exercise is actually called.`,
      );
    }

    return ok({
      exercise: slug,
      sets: rows.map((row) => ({ ...row, weight: Number(row.weight) })),
    });
  },
});
