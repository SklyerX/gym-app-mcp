import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { routineSessions } from "../db/schema.js";
import { findRoutineSession } from "../services/ownership.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "delete_routine_session",
  description:
    "Permanently delete one planned day from a routine. Workouts already logged against that day are kept but lose their link to the plan. Destructive and irreversible: confirm with the user first, and resolve the id with get_routine_sessions.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  input: {
    routine_session_id: z
      .string()
      .describe(
        "Id of the routine session (planned day) to delete, from create_routine_session or get_routine_sessions. Its parent routine must belong to the calling user.",
      ),
  },
  load: async (user, { routine_session_id }) => {
    if (!(await findRoutineSession(user.id, routine_session_id))) {
      return fail(
        `No routine session '${routine_session_id}' belongs to this user. Nothing was deleted — call get_routine_sessions to find the correct id.`,
      );
    }

    const [deleted] = await db
      .delete(routineSessions)
      .where(eq(routineSessions.id, routine_session_id))
      .returning();

    return ok({
      action: "deleted",
      routine_session: {
        id: deleted.id,
        routine_id: deleted.routineId,
        label: deleted.label,
      },
    });
  },
});
