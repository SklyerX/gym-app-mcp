import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { workoutSessions } from "../db/schema.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "end_workout_session",
  description:
    "Close an open workout by stamping its end time. Call it once the user says they are finished training — sets can no longer be appended to a closed session. Returns the session with its start and end times.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    workout_session_id: z
      .string()
      .describe(
        "Id returned by start_workout_session for the workout currently in progress.",
      ),
  },
  load: async (user, { workout_session_id }) => {
    const [updated] = await db
      .update(workoutSessions)
      .set({
        endedAt: new Date(),
      })
      .where(
        and(
          eq(workoutSessions.id, workout_session_id),
          eq(workoutSessions.userId, user.id),
        ),
      )
      .returning({
        id: workoutSessions.id,
        routineSessionId: workoutSessions.routineSessionId,
        startedAt: workoutSessions.startedAt,
        endedAt: workoutSessions.endedAt,
      });

    if (!updated) {
      return fail(
        `No workout session '${workout_session_id}' belongs to this user. Nothing was closed — use the id returned by start_workout_session.`,
      );
    }

    return ok(updated);
  },
});
