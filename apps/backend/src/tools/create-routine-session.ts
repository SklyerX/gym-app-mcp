import { z } from "zod";
import { db } from "../db/index.js";
import { routineSessions } from "../db/schema.js";
import { findRoutine } from "../services/ownership.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "create_routine_session",
  description:
    "Define a workout day inside a routine — the plan, not a performed workout. E.g. 'Upper A' and 'Lower B' within an Upper/Lower program. Create each day once; when the user actually trains it, call start_workout_session instead. Returns the routine session's id.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    routine_id: z
      .string()
      .describe(
        "Id of the routine this day belongs to, from create_routine or get_routines.",
      ),
    label: z
      .string()
      .describe(
        "Short name for the day as the user refers to it, e.g. 'Upper A', 'Leg Day', 'Push'.",
      ),
    notes: z
      .string()
      .optional()
      .describe(
        "Optional plain-text plan for the day, e.g. 'Bench 4x6, incline DB press 3x10, cable fly 3x12'.",
      ),
  },
  load: async (user, { routine_id, label, notes }) => {
    if (!(await findRoutine(user.id, routine_id))) {
      return fail(
        `No routine '${routine_id}' belongs to this user. Call get_routines for a valid id.`,
      );
    }

    const [createdRS] = await db
      .insert(routineSessions)
      .values({
        routineId: routine_id,
        label,
        notes,
      })
      .returning();

    return ok({
      id: createdRS.id,
      routine_id: createdRS.routineId,
      label: createdRS.label,
      notes: createdRS.notes,
      created_at: createdRS.createdAt,
    });
  },
});
