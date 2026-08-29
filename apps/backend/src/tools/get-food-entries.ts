import { z } from "zod";
import { db } from "../db/index.js";
import { mealEnum } from "../db/schema.js";
import { timezoneOf } from "../services/nutrition.js";
import { resolveDay } from "../utils/day.js";
import { empty, fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_food_entries",
  description:
    "List the individual food items the user logged on one day, oldest first, each with its id. Use it when they want to see or change what is on the list — the ids are what delete_food_entry needs. For 'how am I doing today' call get_macro_summary instead: it totals the same entries and compares them to the user's targets.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    date: z
      .string()
      .optional()
      .describe(
        "Which day to list. Omit for today, resolved in the user's own timezone. Accepts 'today', 'yesterday', or an exact 'YYYY-MM-DD'. Never compute the date yourself from a guess at the current time.",
      ),
    meal: z
      .enum(mealEnum.enumValues)
      .optional()
      .describe(
        "Only list items from this meal: 'breakfast', 'lunch', 'dinner' or 'snack'. Omit for the whole day. Items logged without a meal are excluded when this is set.",
      ),
  },
  load: async (user, { date, meal }) => {
    const day = resolveDay(date, user.timezone);

    if (!day) {
      return fail(
        `Could not read '${date}' as a date. Omit \`date\` for today, or pass 'today', 'yesterday', or an exact date like '2026-08-22'.`,
      );
    }

    const entries = await db.query.foodEntries.findMany({
      where: {
        userId: user.id,
        loggedOn: day,
        ...(meal ? { meal } : {}),
      },
      orderBy: { loggedAt: "asc" },
      columns: { userId: false },
    });

    if (!entries.length) {
      return empty(
        `Nothing logged${meal ? ` for ${meal}` : ""} on ${day}. Empty result, not an error — the user has not recorded food for that day${meal ? " and meal" : ""}.`,
      );
    }

    return ok({
      date: day,
      ...timezoneOf(user),
      entries: entries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        meal: entry.meal,
        grams: entry.grams === null ? null : Number(entry.grams),
        protein: Number(entry.protein),
        carbs: Number(entry.carbs),
        fat: Number(entry.fat),
        calories: Number(entry.calories),
        logged_at: entry.loggedAt,
        meta: entry.meta,
      })),
    });
  },
});
