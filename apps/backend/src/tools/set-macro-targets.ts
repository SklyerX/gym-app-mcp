import { z } from "zod";
import { db } from "../db/index.js";
import { macroTargets } from "../db/schema.js";
import { deriveCalories } from "../services/nutrition.js";
import { ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "set_macro_targets",
  description:
    "Set the user's daily macro goals — the numbers get_macro_summary measures each day against. One standing target per user, not one per day: calling this again replaces the previous goals and does not touch anything already logged. Use it when the user states a goal ('I want 180g of protein a day') or asks to change one.",
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  input: {
    protein_g: z
      .number()
      .min(0)
      .describe("Daily protein target in grams, e.g. 180."),
    carbs_g: z
      .number()
      .min(0)
      .describe("Daily carbohydrate target in grams, e.g. 250."),
    fat_g: z.number().min(0).describe("Daily fat target in grams, e.g. 70."),
    calories: z
      .number()
      .min(0)
      .optional()
      .describe(
        "Daily calorie target. Omit to derive it from the macros at 4/4/9 kcal per gram — prefer omitting it unless the user names a calorie number themselves, so the two cannot contradict each other.",
      ),
  },
  load: async (user, { protein_g, carbs_g, fat_g, calories }) => {
    const derived = deriveCalories({
      protein: protein_g,
      carbs: carbs_g,
      fat: fat_g,
    });
    const kcal = calories ?? derived;

    const values = {
      userId: user.id,
      proteinGrams: protein_g.toString(),
      carbsGrams: carbs_g.toString(),
      fatGrams: fat_g.toString(),
      calories: kcal.toString(),
      updatedAt: new Date(),
    };

    const [saved] = await db
      .insert(macroTargets)
      .values(values)
      .onConflictDoUpdate({ target: macroTargets.userId, set: values })
      .returning();

    return ok({
      action: "saved",
      targets: {
        protein_g: Number(saved.proteinGrams),
        carbs_g: Number(saved.carbsGrams),
        fat_g: Number(saved.fatGrams),
        calories: Number(saved.calories),
      },
      calories_source: calories === undefined ? "derived" : "user_specified",
      ...(calories !== undefined && Math.abs(calories - derived) > 50
        ? {
            calorie_mismatch: `The stated ${calories} kcal does not match these macros, which work out to about ${derived} kcal. Both were saved as given — mention the gap to the user.`,
          }
        : {}),
    });
  },
});
