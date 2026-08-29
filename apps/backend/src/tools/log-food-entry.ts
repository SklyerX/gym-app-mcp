import { z } from "zod";
import { db } from "../db/index.js";
import { foodEntries, mealEnum } from "../db/schema.js";
import { deriveCalories, timezoneOf } from "../services/nutrition.js";
import { resolveDay } from "../utils/day.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "log_food_entry",
  description:
    "Log one food or drink the user ate, with its macros. Call it once per item — 'chicken, rice and broccoli' is three calls, not one. The entry is filed under the user's local calendar day automatically, so an 11pm snack counts towards that night, not the next morning; only pass `date` when logging something from a different day. Estimate macros when the user does not state them, and say `source: 'estimated'` so the number is not mistaken for a measured one.",
  annotations: { readOnlyHint: false, openWorldHint: false },
  input: {
    name: z
      .string()
      .describe(
        "What was eaten, as the user would say it, e.g. '200g grilled chicken breast' or 'protein shake'.",
      ),
    protein: z.number().min(0).describe("Protein in grams for this item."),
    carbs: z.number().min(0).describe("Carbohydrate in grams for this item."),
    fat: z.number().min(0).describe("Fat in grams for this item."),
    calories: z
      .number()
      .min(0)
      .optional()
      .describe(
        "Calories for this item. Omit to derive from the macros at 4/4/9 kcal per gram — prefer omitting unless you have a real figure from a label or database, so calories and macros cannot disagree.",
      ),
    grams: z
      .number()
      .min(0)
      .optional()
      .describe(
        "Portion weight in grams, when known. Recorded for context only; the macros above are the amounts actually counted, so they must already be for this portion rather than per 100g.",
      ),
    meal: z
      .enum(mealEnum.enumValues)
      .optional()
      .describe(
        "Which meal this belongs to: 'breakfast', 'lunch', 'dinner' or 'snack'. Omit if the user did not say and it cannot be inferred; get_macro_summary groups by it.",
      ),
    source: z
      .enum(["estimated", "web_verified", "user_corrected"])
      .describe(
        "Where these numbers came from. 'estimated' when you worked them out yourself — the honest default for a described meal. 'web_verified' only when they came from a label or nutrition database. 'user_corrected' when the user gave or fixed the numbers themselves.",
      ),
    date: z
      .string()
      .optional()
      .describe(
        "Which day this counts towards. Omit for right now, which is almost always correct. Accepts 'today', 'yesterday', or an exact 'YYYY-MM-DD'. Use it only when the user is logging after the fact, e.g. 'I forgot to add last night's dinner'. Never compute the date yourself from a guess at the current time — omit it, or use the word forms, and the server resolves it in the user's timezone.",
      ),
    notes: z
      .string()
      .optional()
      .describe(
        "Optional short free text about the item, e.g. 'cooked in olive oil', 'restaurant portion, rough guess'. Omit rather than inventing detail.",
      ),
  },
  load: async (
    user,
    { name, protein, carbs, fat, calories, grams, meal, source, date, notes },
  ) => {
    const day = resolveDay(date, user.timezone);

    if (!day) {
      return fail(
        `Could not read '${date}' as a date. Nothing was logged — omit \`date\` for today, or pass 'today', 'yesterday', or an exact date like '2026-08-22'.`,
      );
    }

    const kcal = calories ?? deriveCalories({ protein, carbs, fat });

    const [entry] = await db
      .insert(foodEntries)
      .values({
        userId: user.id,
        name,
        meal,
        grams: grams?.toString(),
        protein: protein.toString(),
        carbs: carbs.toString(),
        fat: fat.toString(),
        calories: kcal.toString(),
        loggedOn: day,
        meta: { source, ...(notes ? { notes } : {}) },
      })
      .returning();

    return ok({
      id: entry.id,
      name: entry.name,
      meal: entry.meal,
      protein: Number(entry.protein),
      carbs: Number(entry.carbs),
      fat: Number(entry.fat),
      calories: Number(entry.calories),
      calories_source: calories === undefined ? "derived" : "given",
      date: entry.loggedOn,
      logged_at: entry.loggedAt,
      ...timezoneOf(user),
    });
  },
});
