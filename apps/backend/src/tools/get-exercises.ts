import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { setEntries, workoutSessions } from "../db/schema.js";
import { metaMuscle } from "../utils/format.js";
import { empty, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_exercises",
  description:
    "List every exercise this user has actually logged, with how many sets, when it was last trained, and the meta most recently attached to it. Two uses: resolve a loose name the user says ('bench', 'incline press') to the exact slug the other tools match on, and — before logging — see how a movement was tagged last time so meta stays consistent instead of drifting between synonyms. Cheap; prefer it over guessing a slug.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    muscle: z
      .string()
      .optional()
      .describe(
        "Only list exercises whose most recent meta.muscle matches this, e.g. 'chest'. Matched case-insensitively. Omit to list everything.",
      ),
  },
  load: async (user, { muscle }) => {
    const { rows } = await db.execute<{
      exercise: string;
      set_count: string;
      last_trained: string;
      last_unit: string | null;
      last_meta: unknown;
    }>(sql`
      select distinct on (entry.exercise_slug)
        entry.exercise_slug as exercise,
        count(*) over (partition by entry.exercise_slug) as set_count,
        session.started_at as last_trained,
        entry.unit as last_unit,
        entry.meta as last_meta
      from ${setEntries} entry
      join ${workoutSessions} session
        on session.id = entry.workout_session_id
      where session.user_id = ${user.id}
      order by entry.exercise_slug, session.started_at desc, entry.logged_at desc
    `);

    const catalogue = rows
      .filter(
        (row) => !muscle || metaMuscle(row.last_meta) === muscle.toLowerCase(),
      )
      .map((row) => ({
        exercise: row.exercise,
        set_count: Number(row.set_count),
        last_trained: new Date(row.last_trained),
        last_unit: row.last_unit,
        last_meta: row.last_meta,
      }))
      .sort(
        (a, b) =>
          new Date(b.last_trained).getTime() -
          new Date(a.last_trained).getTime(),
      );

    return catalogue.length
      ? ok(catalogue)
      : empty(
          muscle
            ? `No logged exercise is tagged with muscle '${muscle}'. Empty result, not an error — meta tagging is optional, so call get_exercises without a muscle filter to see the full list.`
            : "No exercises logged yet. Empty result, not an error — the user has not recorded any sets.",
        );
  },
});
