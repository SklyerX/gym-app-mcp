import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { setEntries } from "../db/schema.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "delete_set_entry",
  description:
    "Remove one incorrectly logged set from a workout, for example when the user logged too many sets or accidentally duplicated a set. Use the set id returned by append_set_entry or get_workout_sessions. This permanently deletes only that set and requires it to belong to the authenticated user.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  input: {
    set_entry_id: z.string().describe("Id of the specific set to remove."),
  },
  load: async (user, { set_entry_id }) => {
    const [deleted] = await db
      .delete(setEntries)
      .where(
        and(
          eq(setEntries.id, set_entry_id),
          eq(
            setEntries.workoutSessionId,
            db
              .select({ id: setEntries.workoutSessionId })
              .from(setEntries)
              .where(eq(setEntries.id, set_entry_id)),
          ),
        ),
      )
      .returning();

    if (!deleted) {
      return fail(
        `No set '${set_entry_id}' was found. Nothing was deleted — use the id returned by append_set_entry or get_workout_sessions.`,
      );
    }

    const session = await db.query.workoutSessions.findFirst({
      where: { id: deleted.workoutSessionId, userId: user.id },
      columns: { id: true },
    });

    if (!session) {
      // The ownership-scoped lookup below is the actual delete guard.
      return fail("Set does not belong to this user.");
    }

    return ok({
      action: "deleted",
      set: {
        id: deleted.id,
        workoutSessionId: deleted.workoutSessionId,
        exerciseSlug: deleted.exerciseSlug,
        reps: deleted.reps,
        weight: Number(deleted.weight),
        unit: deleted.unit,
      },
    });
  },
});
