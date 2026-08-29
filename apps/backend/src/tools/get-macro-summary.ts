import { z } from "zod";
import { db } from "../db/index.js";
import {
  findMacroTargets,
  round1,
  sumMacros,
  timezoneOf,
} from "../services/nutrition.js";
import { resolveDay } from "../utils/day.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_macro_summary",
  description:
    "Totals one day's food against the user's macro targets: what they have eaten, what is left, and how it breaks down by meal, plus water. This is the tool for 'how am I doing today', 'how much protein do I have left', and 'what should I eat for dinner' — call it before recommending food, so the advice is based on the day's actual remaining macros. Defaults to today in the user's own timezone.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {
    date: z
      .string()
      .optional()
      .describe(
        "Which day to total. Omit for today, resolved in the user's own timezone — this is the normal case. Accepts 'today', 'yesterday', or an exact 'YYYY-MM-DD'. Never compute the date yourself from a guess at the current time; the server knows when the user's day starts and you do not.",
      ),
  },
  load: async (user, { date }) => {
    const day = resolveDay(date, user.timezone);

    if (!day) {
      return fail(
        `Could not read '${date}' as a date. Omit \`date\` for today, or pass 'today', 'yesterday', or an exact date like '2026-08-22'.`,
      );
    }

    const [entries, water, targets] = await Promise.all([
      db.query.foodEntries.findMany({
        where: { userId: user.id, loggedOn: day },
        orderBy: { loggedAt: "asc" },
        columns: { userId: false },
      }),
      db.query.waterEntries.findMany({
        where: { userId: user.id, loggedOn: day },
        columns: { milliliters: true },
      }),
      findMacroTargets(user.id),
    ]);

    const totals = sumMacros(entries);

    const byMeal = entries.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.meal ?? "unspecified";

      acc[key] = round1((acc[key] ?? 0) + Number(entry.calories));

      return acc;
    }, {});

    const remaining = targets
      ? {
          protein: round1(Number(targets.proteinGrams) - totals.protein),
          carbs: round1(Number(targets.carbsGrams) - totals.carbs),
          fat: round1(Number(targets.fatGrams) - totals.fat),
          calories: round1(Number(targets.calories) - totals.calories),
        }
      : null;

    return ok({
      date: day,
      ...timezoneOf(user),
      entry_count: entries.length,
      totals: {
        protein: round1(totals.protein),
        carbs: round1(totals.carbs),
        fat: round1(totals.fat),
        calories: round1(totals.calories),
      },
      targets: targets
        ? {
            protein: Number(targets.proteinGrams),
            carbs: Number(targets.carbsGrams),
            fat: Number(targets.fatGrams),
            calories: Number(targets.calories),
          }
        : null,
      remaining,
      calories_by_meal: byMeal,
      water_ml: water.reduce((sum, row) => sum + Number(row.milliliters), 0),
      ...(targets
        ? {}
        : {
            note: "No macro targets are set, so `remaining` is null. Offer to set them with set_macro_targets.",
          }),
      ...(entries.length === 0
        ? {
            note_food:
              "No food logged for this day yet. Not an error — the totals are genuinely zero.",
          }
        : {}),
    });
  },
});
