import { z } from "zod";
import { db } from "../db/index.js";
import { workoutSessions } from "../db/schema.js";
import { findRoutineSession } from "../services/ownership.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "start_workout_session",
  description:
    "Open a live workout for the user to log sets against. Call this before the first append_set_entry and reuse the returned id for every set in that workout — do not start a new session per exercise. Optionally links the workout to a planned day so it is tracked against the routine. Returns the workout session's id.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    routine_session_id: z
      .string()
      .optional()
      .describe(
        "Id of the routine session (planned day) being trained, from create_routine_session. Omit for a one-off workout that follows no plan.",
      ),
  },
  load: async (user, { routine_session_id }) => {
    if (
      routine_session_id &&
      !(await findRoutineSession(user.id, routine_session_id))
    ) {
      return fail(
        `No routine session '${routine_session_id}' belongs to this user. Call get_routine_sessions for a valid id, or omit it to start an unplanned workout.`,
      );
    }

    const [newSession] = await db
      .insert(workoutSessions)
      .values({
        userId: user.id,
        routineSessionId: routine_session_id,
      })
      .returning();

    return ok({
      id: newSession.id,
      routineSessionId: newSession.routineSessionId,
      startedAt: newSession.startedAt,
    });
  },
});
