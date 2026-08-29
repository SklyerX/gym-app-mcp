import { db } from "../db/index.js";
import type { User } from "../utils/types.js";

const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export const deriveCalories = (macros: {
  protein: number;
  carbs: number;
  fat: number;
}) =>
  Math.round(
    macros.protein * KCAL_PER_GRAM.protein +
      macros.carbs * KCAL_PER_GRAM.carbs +
      macros.fat * KCAL_PER_GRAM.fat,
  );

export const timezoneOf = (user: User) => ({
  timezone: user.timezone,
  ...(user.timezone === "UTC"
    ? {
        timezone_warning:
          "This user's timezone is still the UTC default and may not be their real one. If it is wrong, days roll over at the wrong moment and evening entries land on the next day. Ask the user where they are and call set_timezone before trusting any 'today' result.",
      }
    : {}),
});

export const sumMacros = (
  entries: Array<{
    protein: string;
    carbs: string;
    fat: string;
    calories: string;
  }>,
) =>
  entries.reduce(
    (total, entry) => ({
      protein: total.protein + Number(entry.protein),
      carbs: total.carbs + Number(entry.carbs),
      fat: total.fat + Number(entry.fat),
      calories: total.calories + Number(entry.calories),
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  );

export const round1 = (value: number) => Math.round(value * 10) / 10;

export const findMacroTargets = (userId: string) =>
  db.query.macroTargets.findFirst({
    where: { userId },
  });
