import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { isValidTimeZone, localDay } from "../utils/day.js";
import { fail, ok } from "../utils/mcp.js";
import { defineTool } from "../utils/types.js";

export default defineTool({
  name: "set_timezone",
  description:
    "Set the timezone the user's days are measured in. This decides when 'today' starts and ends for every nutrition tool, so a wrong value files evening meals under the next day. New accounts default to UTC, which is a placeholder rather than a real answer — if a nutrition tool reports a timezone_warning, ask the user where they live and call this once. Safe to call again whenever they move or travel; it only affects days logged from then on.",
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  input: {
    timezone: z
      .string()
      .describe(
        "IANA timezone name, e.g. 'America/New_York', 'Europe/London', 'Australia/Melbourne'. Derive it from where the user says they are — do not ask them to name a zone. Offsets like 'UTC-5' or abbreviations like 'EST' are rejected, because they cannot track daylight saving.",
      ),
  },
  load: async (user, { timezone }) => {
    if (!isValidTimeZone(timezone)) {
      return fail(
        `'${timezone}' is not a recognized IANA timezone. Nothing changed — use a Region/City name such as 'America/New_York' or 'Europe/London'.`,
      );
    }

    const [updated] = await db
      .update(users)
      .set({ timezone })
      .where(eq(users.id, user.id))
      .returning({ id: users.id, timezone: users.timezone });

    if (!updated) {
      return fail(
        "Could not update the timezone: this user no longer exists. Nothing changed.",
      );
    }

    return ok({
      action: "updated",
      timezone: updated.timezone,
      today: localDay(updated.timezone),
      note: `Days now run midnight to midnight in ${updated.timezone}. Confirm with the user that today's date reads correctly before logging.`,
    });
  },
});
