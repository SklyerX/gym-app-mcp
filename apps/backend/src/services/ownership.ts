import { db } from "../db/index.js";

export const findRoutine = (userId: string, routineId: string) =>
  db.query.routines.findFirst({
    where: { id: routineId, userId },
    columns: { id: true, name: true },
  });

export const findRoutineSession = async (
  userId: string,
  routineSessionId: string,
) => {
  const found = await db.query.routineSessions.findFirst({
    where: { id: routineSessionId },
    with: { routine: { columns: { userId: true } } },
  });

  return found?.routine.userId === userId ? found : undefined;
};

export const findWorkoutSession = (userId: string, workoutSessionId: string) =>
  db.query.workoutSessions.findFirst({
    where: { id: workoutSessionId, userId },
  });
