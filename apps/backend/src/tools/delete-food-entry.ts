import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { foodEntries } from "../db/schema.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "delete_food_entry",
  description:
    "Remove one logged food item. Use it when the user says they did not eat something, logged it twice, or wants a wrong estimate taken off the day. Resolve the id with get_food_entries first. To fix a bad estimate, delete the entry and log it again with the right numbers and source 'user_corrected'.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  input: {
    food_entry_id: z
      .string()
      .describe(
        "Id of the entry to remove, from get_food_entries or the response to log_food_entry. Must belong to the calling user.",
      ),
  },
  load: async (user, { food_entry_id }) => {
    const [deleted] = await db
      .delete(foodEntries)
      .where(
        and(
          eq(foodEntries.id, food_entry_id),
          eq(foodEntries.userId, user.id),
        ),
      )
      .returning();

    if (!deleted) {
      return fail(
        `No food entry '${food_entry_id}' belongs to this user. Nothing was deleted — call get_food_entries to find the correct id.`,
      );
    }

    return ok({
      action: "deleted",
      entry: {
        id: deleted.id,
        name: deleted.name,
        meal: deleted.meal,
        calories: Number(deleted.calories),
        date: deleted.loggedOn,
      },
    });
  },
});
