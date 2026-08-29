import { z } from "zod";
import { db } from "../db/index.js";
import { methodEnum, setEntries, unitEnum } from "../db/schema.js";
import { findWorkoutSession } from "../services/ownership.js";
import { slugify } from "../utils/format.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "append_set_entry",
  description:
    "Log one completed set to a workout that is already open. Call it once per set — 'bench 3x8' is three calls, not one. Requires a workout session id from start_workout_session.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    workout_session_id: z
      .string()
      .describe(
        "Id returned by start_workout_session for the workout currently in progress.",
      ),
    exercise: z
      .string()
      .describe(
        "Exercise name in plain English, e.g. 'Dumbbell Bench Press'. Stored normalized as a slug ('dumbbell-bench-press'), so name the same movement identically across sets or its history will split.",
      ),
    method: z
      .enum(methodEnum.enumValues)
      .describe(
        "How the set was performed: 'straight' for an ordinary set (use this unless the user says otherwise), 'drop-set', 'rest-pause', 'myo-rep', 'amrap' (taken to as many reps as possible), or 'other'.",
      ),
    reps: z.number().min(1).describe("Reps completed in this set. Minimum 1."),
    weight: z
      .number()
      .min(0)
      .describe(
        "Load used for this set, expressed in `unit`. Use 0 for an unloaded bodyweight set; for a weighted bodyweight movement log only the added weight.",
      ),
    unit: z
      .enum(unitEnum.enumValues)
      .describe(
        "Unit that `weight` is given in: 'kg' or 'lbs'. Use whichever the user speaks in; never convert silently.",
      ),
    meta: z
      .record(z.string(), z.string().or(z.number()).or(z.boolean()))
      .optional()
      .describe(
        "Optional flat key/value extras for this set, e.g. { muscle: 'chest', rpe: 8, tempo: '3-1-1', toFailure: true }. Values must be string, number, or boolean — no nested objects. Omit it rather than inventing details the user never gave. Two keys are conventions the read tools understand: `muscle` (lowercase, singular — get_workout_sessions and get_exercises filter on it) and `rpe` (a number, not a string). Reuse the exact tagging get_exercises reports for this movement instead of coining a synonym.",
      ),
  },
  load: async (
    user,
    { workout_session_id, exercise, method, reps, weight, unit, meta },
  ) => {
    const session = await findWorkoutSession(user.id, workout_session_id);

    if (!session) {
      return fail(
        `No workout session '${workout_session_id}' belongs to this user. Nothing was logged — start one with start_workout_session.`,
      );
    }

    if (session.endedAt) {
      return fail(
        `Workout session '${workout_session_id}' was closed at ${session.endedAt.toISOString()}. Nothing was logged — start a new session to log more sets.`,
      );
    }

    const [newEntry] = await db
      .insert(setEntries)
      .values({
        workoutSessionId: workout_session_id,
        exerciseSlug: slugify(exercise),
        method,
        reps,
        weight: weight.toString(),
        unit,
        meta,
      })
      .returning();

    return ok({
      id: newEntry.id,
      workoutSessionId: newEntry.workoutSessionId,
      exerciseSlug: newEntry.exerciseSlug,
      loggedAt: newEntry.loggedAt,
    });
  },
});
