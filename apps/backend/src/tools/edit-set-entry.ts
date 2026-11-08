import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { methodEnum, setEntries, unitEnum } from "../db/schema.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "edit_set_entry",
  description:
    "Correct an already-logged workout set. Use the set id returned by append_set_entry or get_workout_sessions. Only supply fields that need changing; omitted fields stay unchanged. Can correct reps, weight, unit, and set method. The set must belong to the authenticated user.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    set_entry_id: z.string().describe("Id of the specific set to correct."),
    reps: z.number().int().min(1).optional().describe("Corrected reps completed."),
    weight: z.number().min(0).optional().describe("Corrected load."),
    unit: z.enum(unitEnum.enumValues).optional().describe("Unit for the corrected load: kg or lbs."),
    method: z.enum(methodEnum.enumValues).optional().describe("Corrected set method."),
  },
  load: async (user, { set_entry_id, reps, weight, unit, method }) => {
    if (
      reps === undefined &&
      weight === undefined &&
      unit === undefined &&
      method === undefined
    ) {
      return fail("No changes supplied. Provide at least one field to update.");
    }

    const existing = await db.query.setEntries.findFirst({
      where: { id: set_entry_id },
      with: { workoutSession: { columns: { userId: true } } },
    });

    if (!existing || existing.workoutSession.userId !== user.id) {
      return fail(
        `No set '${set_entry_id}' belongs to this user. Nothing was changed — use the id returned by append_set_entry or get_workout_sessions.`,
      );
    }

    const [updated] = await db
      .update(setEntries)
      .set({
        ...(reps !== undefined ? { reps } : {}),
        ...(weight !== undefined ? { weight: weight.toString() } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(method !== undefined ? { method } : {}),
      })
      .where(eq(setEntries.id, set_entry_id))
      .returning();

    return ok({
      action: "updated",
      set: {
        id: updated.id,
        workoutSessionId: updated.workoutSessionId,
        exerciseSlug: updated.exerciseSlug,
        method: updated.method,
        reps: updated.reps,
        weight: Number(updated.weight),
        unit: updated.unit,
        meta: updated.meta,
        loggedAt: updated.loggedAt,
      },
    });
  },
});
