import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { setEntries, workoutSessions } from "../db/schema.js";
import { findRoutineSession } from "../services/ownership.js";
import { metaMuscle, parseDate, slugify } from "../utils/format.js";
import { empty, fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_workout_sessions",
  description:
    "Search the user's logged workouts, newest first by default, optionally with every set that was logged in them. This is the tool for 'what did I do last session?' (limit 1), 'how did Upper A go last week?' (filter by routine_session_id and date), 'when did I last train chest?' (filter by muscle), and 'am I training enough?' (a date range). Each result carries the workout's date and the label of the planned day it was trained against. When you filter by exercise or muscle, only the matching sets come back, so the response is a direct answer rather than the whole workout.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    exercise: z
      .string()
      .optional()
      .describe(
        "Only return workouts containing this exercise, and only its sets. Plain English, e.g. 'Dumbbell Bench Press' — normalized the same way append_set_entry normalizes it. Call get_exercises first if unsure what the user's movements are actually called.",
      ),
    muscle: z
      .string()
      .optional()
      .describe(
        "Only return workouts containing sets whose meta.muscle matches this, and only those sets — e.g. 'chest'. Matched case-insensitively. Only finds sets that were logged with a muscle in their meta, so treat a small result as 'not tagged' rather than 'not trained'.",
      ),
    routine_session_id: z
      .string()
      .optional()
      .describe(
        "Only return workouts trained against this planned day, from get_routine_sessions. Use it when the user names a day such as 'Upper A'. Omit to search across all workouts.",
      ),
    from: z
      .string()
      .optional()
      .describe(
        "Only return workouts that started on or after this moment. ISO 8601, e.g. '2026-08-13' or '2026-08-13T18:00:00Z'. Resolve relative phrases like 'last week' to a real date before calling.",
      ),
    to: z
      .string()
      .optional()
      .describe(
        "Only return workouts that started on or before this moment. ISO 8601, same format as `from`.",
      ),
    order: z
      .enum(["newest", "oldest"])
      .optional()
      .default("newest")
      .describe(
        "Sort by workout start time. 'newest' first answers 'what did I do last session'; 'oldest' first reads as progress over time. Defaults to 'newest'.",
      ),
    include_sets: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Include every set logged in each workout — the exercise, weight, reps, method and unit. Keep it true to answer what was actually lifted; set it false with a large `limit` when you only need dates and labels, since sets make the response much larger.",
      ),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(5)
      .describe(
        "Maximum number of workouts to return, 1-50. Defaults to 5. Use 1 for 'my last session'.",
      ),
    offset: z
      .number()
      .optional()
      .default(0)
      .describe(
        "Number of workouts to skip before returning results — use it to page further back. Defaults to 0.",
      ),
  },
  load: async (
    user,
    {
      exercise,
      muscle,
      routine_session_id,
      from,
      to,
      order,
      include_sets,
      limit,
      offset,
    },
  ) => {
    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (fromDate === null || toDate === null) {
      return fail(
        "Could not parse `from` or `to` as a date. Use ISO 8601, e.g. '2026-08-13' or '2026-08-13T18:00:00Z'.",
      );
    }

    if (
      routine_session_id &&
      !(await findRoutineSession(user.id, routine_session_id))
    ) {
      return fail(
        `No routine session '${routine_session_id}' belongs to this user. Call get_routine_sessions for a valid id.`,
      );
    }

    const exerciseSlug = exercise ? slugify(exercise) : undefined;

    let matchingIds: string[] | undefined;

    if (exerciseSlug || muscle) {
      const matches = await db
        .selectDistinct({ id: setEntries.workoutSessionId })
        .from(setEntries)
        .innerJoin(
          workoutSessions,
          eq(setEntries.workoutSessionId, workoutSessions.id),
        )
        .where(
          and(
            eq(workoutSessions.userId, user.id),
            exerciseSlug
              ? eq(setEntries.exerciseSlug, exerciseSlug)
              : undefined,
            muscle
              ? sql`${setEntries.meta}->>'muscle' ilike ${muscle}`
              : undefined,
          ),
        );

      matchingIds = matches.map((match) => match.id);

      if (!matchingIds.length) {
        return empty(
          `Nothing logged for ${exerciseSlug ? `exercise '${exerciseSlug}'` : ""}${exerciseSlug && muscle ? " and " : ""}${muscle ? `muscle '${muscle}'` : ""}. Empty result, not an error — call get_exercises to see what the user actually logs and how it is tagged.`,
        );
      }
    }

    const found = await db.query.workoutSessions.findMany({
      where: {
        userId: user.id,
        ...(matchingIds ? { id: { in: matchingIds } } : {}),
        ...(routine_session_id ? { routineSessionId: routine_session_id } : {}),
        ...(fromDate || toDate
          ? {
              startedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { startedAt: order === "newest" ? "desc" : "asc" },
      limit,
      offset,
      columns: { userId: false },
      with: {
        routineSession: { columns: { id: true, label: true } },
        ...(include_sets
          ? {
              setEntries: {
                orderBy: { loggedAt: "asc" as const },
                columns: { workoutSessionId: false },
              },
            }
          : {}),
      },
    });

    if (!found.length) {
      return empty(
        "No workouts match that search. Empty result, not an error — widen the date range or drop the routine_session_id filter.",
      );
    }

    const keepSet = (entry: { exerciseSlug: string; meta: unknown }) =>
      (!exerciseSlug || entry.exerciseSlug === exerciseSlug) &&
      (!muscle || metaMuscle(entry.meta) === muscle.toLowerCase());

    return ok(
      found.map((session) => ({
        id: session.id,
        label: session.routineSession?.label ?? null,
        routine_session_id: session.routineSessionId,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        in_progress: session.endedAt === null,
        sets: session.setEntries?.filter(keepSet).map((entry) => ({
          exercise: entry.exerciseSlug,
          method: entry.method,
          reps: entry.reps,
          weight: Number(entry.weight),
          unit: entry.unit,
          logged_at: entry.loggedAt,
          meta: entry.meta,
        })),
      })),
    );
  },
});
