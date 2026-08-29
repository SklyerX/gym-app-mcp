import { z } from "zod";
import { db } from "../db/index.js";
import { routines } from "../db/schema.js";
import { ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "create_routine",
  description:
    "Create a training program — the top-level container in the hierarchy: routine -> routine sessions (workout days like 'Upper A') -> workout sessions (a day actually trained) -> set entries. Call once per program, then add its days with create_routine_session. Returns the new routine's id.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    name: z
      .string()
      .describe(
        "Name of the program as the user would say it, e.g. 'Push Pull Legs' or 'Upper/Lower 4x'.",
      ),
    notes: z
      .record(z.string(), z.string().or(z.number()).or(z.boolean()))
      .optional()
      .describe(
        "Optional flat key/value metadata about the program, e.g. { goal: 'hypertrophy', daysPerWeek: 4 }. Values must be string, number, or boolean — no nested objects. Omit it rather than inventing metadata the user never gave.",
      ),
  },
  load: async (user, { name, notes }) => {
    const [routine] = await db
      .insert(routines)
      .values({
        name,
        notes,
        userId: user.id,
      })
      .returning();

    return ok({
      id: routine.id,
      name: routine.name,
      created_at: routine.createdAt,
    });
  },
});
