import { findMacroTargets } from "../services/nutrition.js";
import { empty, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "get_macro_targets",
  description:
    "Read the user's standing daily macro goals. Use it when they ask what their targets are, or before advising on food choices. To see progress against these goals for a day, call get_macro_summary instead — it returns the targets alongside what has actually been eaten.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  input: {},
  load: async (user) => {
    const targets = await findMacroTargets(user.id);

    if (!targets) {
      return empty(
        "No macro targets set yet. Empty result, not an error — ask the user for their daily protein, carb and fat goals and call set_macro_targets.",
      );
    }

    return ok({
      protein_g: Number(targets.proteinGrams),
      carbs_g: Number(targets.carbsGrams),
      fat_g: Number(targets.fatGrams),
      calories: Number(targets.calories),
      updated_at: targets.updatedAt,
    });
  },
});
