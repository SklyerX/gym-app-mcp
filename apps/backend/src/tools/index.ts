import type { AnyToolModule } from "../utils/types.js";

import appendSetEntry from "./append-set-entry.js";
import createRoutine from "./create-routine.js";
import createRoutineSession from "./create-routine-session.js";
import deleteFoodEntry from "./delete-food-entry.js";
import deleteRoutine from "./delete-routine.js";
import deleteRoutineSession from "./delete-routine-session.js";
import endWorkoutSession from "./end-workout-session.js";
import getExerciseHistory from "./get-exercise-history.js";
import getExercises from "./get-exercises.js";
import getFoodEntries from "./get-food-entries.js";
import getMacroSummary from "./get-macro-summary.js";
import getMacroTargets from "./get-macro-targets.js";
import getRoutines from "./get-routines.js";
import getRoutineSessions from "./get-routine-sessions.js";
import getWorkoutSessions from "./get-workout-sessions.js";
import logFoodEntry from "./log-food-entry.js";
import logWaterEntry from "./log-water-entry.js";
import ping from "./ping.js";
import setMacroTargets from "./set-macro-targets.js";
import setTimezone from "./set-timezone.js";
import startWorkoutSession from "./start-workout-session.js";

export const tools: AnyToolModule[] = [
  ping,

  // Routines — the program and its planned days.
  createRoutine,
  getRoutines,
  deleteRoutine,
  createRoutineSession,
  getRoutineSessions,
  deleteRoutineSession,

  // Workouts — what was actually trained.
  startWorkoutSession,
  endWorkoutSession,
  appendSetEntry,

  // Reads over logged history.
  getWorkoutSessions,
  getExercises,
  getExerciseHistory,

  // Nutrition. Every day boundary here resolves through users.timezone.
  setTimezone,
  setMacroTargets,
  getMacroTargets,
  logFoodEntry,
  getFoodEntries,
  deleteFoodEntry,
  logWaterEntry,
  getMacroSummary,
];
