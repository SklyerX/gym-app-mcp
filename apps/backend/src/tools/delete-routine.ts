import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { routines } from "../db/schema.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "delete_routine",
  description:
    "Permanently delete one of the user's training programs. This cascades — every routine session under it is deleted with it, and workouts logged against those days are kept but lose their link to the plan. Destructive and irreversible: confirm with the user before calling, and resolve the id with get_routines first.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  input: {
    routine_id: z
      .string()
      .describe(
        "Id of the routine to delete, as returned by create_routine or get_routines. Must belong to the calling user.",
      ),
  },
  load: async (user, { routine_id }) => {
    const [routine] = await db
      .delete(routines)
      .where(and(eq(routines.id, routine_id), eq(routines.userId, user.id)))
      .returning();

    if (!routine) {
      return fail(
        `No routine '${routine_id}' belongs to this user. Nothing was deleted — call get_routines to find the correct id.`,
      );
    }

    return ok({
      action: "deleted",
      routine: {
        id: routine.id,
        name: routine.name,
        notes: routine.notes,
      },
    });
  },
});
