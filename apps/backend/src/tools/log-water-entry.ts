import { z } from "zod";
import { db } from "../db/index.js";
import { waterEntries } from "../db/schema.js";
import { timezoneOf } from "../services/nutrition.js";
import { resolveDay } from "../utils/day.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "log_water_entry",
  description:
    "Log water the user drank, in millilitres. Filed under their local calendar day like food is, so a late-night glass counts towards that night. Call once per drink; get_macro_summary reports the day's running total.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    milliliters: z
      .number()
      .min(1)
      .describe(
        "Amount in millilitres. Convert common phrasings before calling: a glass is about 250ml, a large bottle about 750ml, a US cup about 240ml, a US fluid ounce about 30ml, a litre 1000ml.",
      ),
    date: z
      .string()
      .optional()
      .describe(
        "Which day this counts towards. Omit for right now, which is almost always correct. Accepts 'today', 'yesterday', or an exact 'YYYY-MM-DD'.",
      ),
  },
  load: async (user, { milliliters, date }) => {
    const day = resolveDay(date, user.timezone);

    if (!day) {
      return fail(
        `Could not read '${date}' as a date. Nothing was logged — omit \`date\` for today, or pass 'today', 'yesterday', or an exact date like '2026-08-22'.`,
      );
    }

    const [entry] = await db
      .insert(waterEntries)
      .values({
        userId: user.id,
        milliliters: milliliters.toString(),
        loggedOn: day,
      })
      .returning();

    return ok({
      id: entry.id,
      milliliters: Number(entry.milliliters),
      date: entry.loggedOn,
      logged_at: entry.loggedAt,
      ...timezoneOf(user),
    });
  },
});
