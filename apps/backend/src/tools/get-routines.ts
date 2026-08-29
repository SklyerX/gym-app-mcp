import { z } from "zod";
import { db } from "../db/index.js";
import { empty, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_routines",
  description:
    "List the user's training programs with their ids, names and notes. Call this to resolve a routine the user names in conversation ('my PPL split') into the id other tools need.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of routines to return. Defaults to 10."),
    offset: z
      .number()
      .optional()
      .default(0)
      .describe(
        "Number of routines to skip before returning results — use it to page through more than `limit`. Defaults to 0.",
      ),
  },
  load: async (user, { offset, limit }) => {
    const found = await db.query.routines.findMany({
      where: {
        userId: user.id,
      },
      offset,
      limit,
      columns: {
        userId: false,
      },
    });

    return found.length
      ? ok(found)
      : empty(
          "No routines created yet. Empty result, not an error — offer to create one with create_routine.",
        );
  },
});
