import { z } from "zod";
import { db } from "../db/index.js";
import { findRoutine } from "../services/ownership.js";
import { empty, fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_routine_sessions",
  description:
    "List the planned workout days inside one routine, with their ids, labels and notes. Call this to resolve a day the user names ('my upper A day') into the routine_session_id that start_workout_session and delete_routine_session need.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    routine_id: z
      .string()
      .describe(
        "Id of the routine whose days you want, from create_routine or get_routines.",
      ),
    limit: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum number of days to return. Defaults to 20."),
    offset: z
      .number()
      .optional()
      .default(0)
      .describe(
        "Number of days to skip before returning results — use it to page through more than `limit`. Defaults to 0.",
      ),
  },
  load: async (user, { routine_id, limit, offset }) => {
    const routine = await findRoutine(user.id, routine_id);

    if (!routine) {
      return fail(
        `No routine '${routine_id}' belongs to this user. Call get_routines for a valid id.`,
      );
    }

    const found = await db.query.routineSessions.findMany({
      where: { routineId: routine_id },
      limit,
      offset,
    });

    return found.length
      ? ok(found)
      : empty(
          `Routine '${routine.name}' has no days yet. Empty result, not an error — add one with create_routine_session.`,
        );
  },
});
